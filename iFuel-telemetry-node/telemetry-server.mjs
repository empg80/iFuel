// telemetry-server.mjs
import { relativeGapSeconds } from "./relativeGap.mjs";
import { computeStandingsGaps } from "./standingsGaps.mjs";
import { WebSocketServer } from "ws";
import fs from "fs";
import path from "path";

import http from "node:http";
import zlib from "node:zlib";
import { pathToFileURL } from "node:url";
import { createCarSpeedTracker } from "./carSpeed.mjs";
import {
  getOrCreatePitState,
  updatePitAndStintState,
  resetPitAndStintState,
} from "./pitState.mjs";

const TIMEOUT = Math.floor((1 / 60) * 1000);
const BROADCAST_INTERVAL = 250; // ms
const WS_PORT = 7071;
const WS_PATH = "/ifuel";
const WS_HOST = "127.0.0.1"; 
const MAX_MESSAGE_BYTES = 16 * 1024; // 16 KB

// El SDK nativo (irsdk-node) solo se carga cuando hace falta: así el módulo se puede importar
// y probar en cualquier sistema inyectando un SDK simulado (options.createSdk / isSimRunning).
let irsdkModulePromise = null;
function loadIRacingSDK() {
  irsdkModulePromise ??= import("irsdk-node").then((m) => m.IRacingSDK ?? m.default?.IRacingSDK);
  return irsdkModulePromise;
}
// Mismo sondeo que IRacingSDK.IsSimRunning() (servicio HTTP local de iRacing), pero silencioso y con
// timeout: la versión de la librería imprime un error de red completo cada vez que el sim está cerrado.
const SIM_STATUS_URL = "http://127.0.0.1:32034/get_sim_status?object=simStatus";
function probeSimRunning({ url = SIM_STATUS_URL, timeoutMs = 1500 } = {}) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data.includes("running:1")));
      res.on("error", () => resolve(false));
    });
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}
const defaultIsSimRunning = () => probeSimRunning();
const defaultCreateSdk = async () => {
  const IRacingSDK = await loadIRacingSDK();
  return new IRacingSDK({ autoEnableTelemetry: true });
};

// Variables de telemetría que lee el servidor. irsdk-node >= 4.4 recomienda pedirlas por nombre
// (getTelemetryVariable, con caché de índice) en vez de construir las ~430 con getTelemetry()
// en cada tick. Debe coincidir con las lecturas `telemetry.<Nombre>` del bucle: lo comprueba test/variables.test.mjs,
// que además verifica que cada nombre existe en el SDK (CarIdxSpeed no existía y fallaba en silencio).
const TELEMETRY_VARS = [
  "AirTemp", "CamCarIdx", "CarIdxBestLapTime", "CarIdxClass", "CarIdxClassPosition", "CarIdxEstTime",
  "CarIdxLap", "CarIdxLapCompleted", "CarIdxLapDistPct", "CarIdxLastLapTime",
  "CarIdxOnPitRoad", "CarIdxPosition", "CarIdxTrackSurface", "FuelLevel", "IsInGarage",
  "IsReplayPlaying", "Lap", "LapCompleted", "LapDistPct", "LapLastLapTime", "OnPitRoad",
  "PlayerCarIdx", "SessionFlags", "SessionLapsRemainEx", "SessionNum", "SessionTime",
  "SessionTimeRemain", "Speed", "TrackTemp", "TrackTempCrew",
];

// Variables extra que se vuelcan en el "SDK snapshot" de diagnóstico (no las usa el bucle).
// Sirven para comprobar unidades y significado de los datos en una sesión real.
const SNAPSHOT_VARS = [
  "FuelLevel", "FuelLevelPct", "FuelUsePerHour", "PitSvFuel", "PitSvFlags",
  "SessionLapsRemainEx", "SessionLapsTotal", "SessionTimeRemain", "SessionTimeTotal",
  "SessionState", "SessionFlags", "SessionNum", "Lap", "LapCompleted", "LapDistPct",
  "LapLastLapTime", "LapBestLapTime", "LapCurrentLapTime", "Speed", "OnPitRoad", "IsOnTrack",
  "IsInGarage", "IsReplayPlaying", "PlayerCarIdx", "PlayerTrackSurface",
  "CarIdxEstTime", "CarIdxF2Time", "CarIdxLapDistPct", "CarIdxLapCompleted", "CarIdxPosition",
  "CarIdxClassPosition", "CarIdxClass", "CarIdxOnPitRoad", "CarIdxTrackSurface",
  "TrackTemp", "TrackTempCrew", "AirTemp",
];

const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj && k in obj).map((k) => [k, obj[k]]));

const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

// Grabador de payloads: una línea JSON por mensaje (~4 Hz), comprimido con gzip al vuelo.
const MAX_RECORDING_BYTES = 400 * 1024 * 1024; // tope de datos SIN comprimir
function openRecorder(file) {
  const gz = zlib.createGzip({ level: 6 });
  const out = fs.createWriteStream(file);
  gz.pipe(out);
  let bytes = 0;
  return {
    file,
    write(line) {
      if (bytes > MAX_RECORDING_BYTES) return;
      bytes += line.length;
      gz.write(line);
    },
    close: () => new Promise((resolve) => { out.on("finish", resolve); gz.end(); }),
  };
}

function readTelemetry(sdk) {
  if (typeof sdk.getTelemetryVariable !== "function") return sdk.getTelemetry();
  const telemetry = {};
  for (const name of TELEMETRY_VARS) {
    const variable = sdk.getTelemetryVariable(name);
    if (variable) telemetry[name] = variable;
  }
  return telemetry;
}
const SIM_CLOSED_CHECK_MS = 5000; // sin datos durante este tiempo -> comprobar si iRacing sigue abierto
// Ruta del mapa de clases: startTelemetryServer({ dataDir }) la mueve a una carpeta
// escribible (userData en Electron). Por defecto, el directorio de trabajo.
let classMapFile = path.join(process.cwd(), "classColorMap.json");

// mapa global por sesión: classId -> índice 0..5
let classColorIndexById = {};
let nextClassIndex = 0;

// parámetros provisionales de estrategia (luego los alimentarás desde el FuelWidget)
let pitStrategyParams = {
  pitWindowStartLap: null,
  pitWindowEndLap: null,
  pitDeltaSeconds: 32, // tiempo total de pit estimado
};

// Cargar si existe (se invoca desde startTelemetryServer, cuando ya se conoce dataDir)
function loadClassMapFromDisk() {
try {
  if (fs.existsSync(classMapFile)) {
    const raw = fs.readFileSync(classMapFile, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.map && parsed.nextIndex != null) {
      classColorIndexById = parsed.map;
      nextClassIndex = parsed.nextIndex;
      console.log("Class map cargado:", classColorIndexById);
    }
  }
} catch (e) {
  console.error("Error cargando classColorMap:", e);
}
}

function loadClassMapFromDisk_init(dataDir) {
  if (dataDir) classMapFile = path.join(dataDir, "classColorMap.json");
  // El estado vive a nivel de módulo: se parte de cero en cada arranque (p. ej. al reiniciar
  // el servidor) y se carga desde el archivo, en lugar de arrastrar lo de una ejecución previa.
  classColorIndexById = {};
  nextClassIndex = 0;
  loadClassMapFromDisk();
}

function saveClassMapToDisk() {
  try {
    fs.writeFileSync(
      classMapFile,
      JSON.stringify(
        { map: classColorIndexById, nextIndex: nextClassIndex },
        null,
        2,
      ),
      "utf8",
    );
  } catch (e) {
    console.error("Error guardando classColorMap:", e);
  }
}

function registerClassIdsFromCars(cars) {
  let added = false;

  for (const c of cars) {
    const classId = c.classId;
    if (classId == null || classId === -1) continue;
    if (classColorIndexById[classId] == null) {
      classColorIndexById[classId] = nextClassIndex++;
      added = true;
      console.log(
        "Nueva clase registrada",
        classId,
        "->",
        classColorIndexById[classId],
      );
    }
  }

  if (added) {
    console.log("Class ids actuales:", classColorIndexById);
    saveClassMapToDisk();
  }
}


// --------- Pit Clear Air helper ---------
function computePitClearAirSuggestion({
  myLap,
  myPct,
  cars,
  myIdx,
  baseLapTime,
  pitWindowStartLap,
  pitWindowEndLap,
  pitDeltaSeconds,

  //  info de fuel / carrera
  lapsRemainForRace,
  maxStintLapsFromFull,
}) {
  if (
    !Number.isFinite(pitWindowStartLap) ||
    !Number.isFinite(pitWindowEndLap) ||
    pitWindowEndLap < pitWindowStartLap ||
    !Number.isFinite(baseLapTime) ||
    baseLapTime <= 0 ||
    !Number.isFinite(pitDeltaSeconds) ||
    pitDeltaSeconds <= 0
  ) {
    return { suggestedLap: null, options: [] };
  }

  const options = [];

  for (let lapTarget = pitWindowStartLap; lapTarget <= pitWindowEndLap; lapTarget++) {
    const lapsToGo = lapTarget - myLap;
    if (lapsToGo < 0) continue; // ventana ya pasada para esa vuelta

    // ---------- FILTRO DE FUEL ----------
    if (
      lapsRemainForRace != null &&
      lapsRemainForRace > 0 &&
      maxStintLapsFromFull != null &&
      maxStintLapsFromFull > 0
    ) {
      // Vueltas que quedarían desde la parada hasta meta
      const lapsAfterStop = lapsRemainForRace - lapsToGo;

      // Si aun llenando no llegas a meta, descartamos esta vuelta
      if (lapsAfterStop > maxStintLapsFromFull) {
        continue;
      }
    }
    // ------------------------------------

    const timeUntilPitIn = lapsToGo * baseLapTime;
    const pitExitTime = timeUntilPitIn + pitDeltaSeconds;

    // Posición propia estimada al salir
    const lapsGained = pitExitTime / baseLapTime;
    const projectedPct = ((myPct ?? 0) + lapsGained) % 1;

    let trafficScore = 0;
    const timeWindow = 3; // ±3 s de “aire limpio”

    for (const c of cars) {
      if (c.idx === myIdx) continue;
      if (!Number.isFinite(c.pct)) continue;

      const targetLapTime =
        c.lastLap > 0 ? c.lastLap :
        c.bestLap > 0 ? c.bestLap :
        baseLapTime;

      if (!Number.isFinite(targetLapTime) || targetLapTime <= 0) continue;

      const lapsGainedOther = pitExitTime / targetLapTime;
      const projectedPctOther = (c.pct + lapsGainedOther) % 1;

      let dPct = projectedPctOther - projectedPct;
      if (dPct > 0.5) dPct -= 1;
      if (dPct < -0.5) dPct += 1;

      const gapSeconds = dPct * baseLapTime;
      if (Math.abs(gapSeconds) <= timeWindow) {
        trafficScore++;
      }
    }

    options.push({ lap: lapTarget, trafficScore });
  }

  options.sort((a, b) => a.trafficScore - b.trafficScore || a.lap - b.lap);
  const suggestedLap = options.length > 0 ? options[0].lap : null;

  return {
    suggestedLap,
    options: options.slice(0, 3),
  };
}


function startTelemetryLoop(
  sdk,
  wss,
  { onSimClosed, isSimRunning = defaultIsSimRunning, simClosedCheckMs = SIM_CLOSED_CHECK_MS, diag = {} } = {},
) {
  resetPitAndStintState();
  const trackCarSpeeds = createCarSpeedTracker();

  let lastSessionKey = null;
  let sessionCache = { version: -1, data: null };
  let noDataSince = null;
  let checkingSim = false;
  let lastErrorLogAt = 0;

  const timer = setInterval(() => {
   try {
    const hasData = sdk.waitForData(TIMEOUT);
    if (!hasData) {
      // Sin datos: si dura, comprobar si iRacing se ha cerrado para reconectar
      const now = Date.now();
      if (noDataSince === null) noDataSince = now;
      if (now - noDataSince > simClosedCheckMs && !checkingSim) {
        checkingSim = true;
        Promise.resolve(isSimRunning())
          .then((running) => {
            if (!running && onSimClosed) onSimClosed();
          })
          .catch(() => {})
          .finally(() => {
            checkingSim = false;
            noDataSince = Date.now();
          });
      }
      return;
    }
    noDataSince = null;

    const telemetry = readTelemetry(sdk);

    // El YAML de sesion solo cambia cuando sube su version: no lo re-parseamos en cada tick
    const sessionVersion = sdk.getSessionVersionNum();
    if (!sessionCache.data || sessionVersion !== sessionCache.version) {
      const fresh = sdk.getSessionData();
      if (fresh) sessionCache = { version: sessionVersion, data: fresh };
    }
    const session = sessionCache.data;
    diag.sdk = sdk;
    diag.session = session;

    // -------- WeekendInfo / Weather para TrackInfoWidget --------
const weekend = session?.WeekendInfo ?? {};
const weekendOptions = weekend.WeekendOptions ?? {};

const trackName =
  typeof weekend.TrackDisplayName === "string"
    ? weekend.TrackDisplayName
    : "";

const trackLength =
  typeof weekend.TrackLength === "string"
    ? weekend.TrackLength
    : "";

const windSpeed = (() => {
  const raw = weekendOptions.WindSpeed;
  if (!raw) return null;
  const n = parseFloat(String(raw));
  return Number.isFinite(n) ? n : null; // ya viene en km/h según el dump
})();

const windDirection = (() => {
  const raw = weekendOptions.WindDirection;
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
})();

const rainChance = (() => {
  const raw = weekend.TrackPrecipitation;
  if (!raw) return null;
  const n = parseFloat(String(raw).replace("%", "").trim());
  return Number.isFinite(n) ? n : null;
})();


    const sessionTime = telemetry.SessionTime?.value?.[0] ?? 0; // tiempo que avanza siempre hacia delante [web:27]
const carIdxLapCompleted = telemetry.CarIdxLapCompleted?.value ?? [];

    const fuelLevel = telemetry.FuelLevel?.value?.[0] ?? 0;
    const lap = telemetry.Lap?.value?.[0] ?? 0;
    const lapCompleted = telemetry.LapCompleted?.value?.[0] ?? 0;
    const lastLapTime = telemetry.LapLastLapTime?.value?.[0] ?? null;
    const sessionTimeRemain = telemetry.SessionTimeRemain?.value?.[0] ?? 0;
    const sessionLapsRemainEx =
      telemetry.SessionLapsRemainEx?.value?.[0] ?? 0;

    const airTemp = telemetry.AirTemp?.value?.[0] ?? null;
    const trackTemp =
      (telemetry.TrackTempCrew ?? telemetry.TrackTemp)?.value?.[0] ?? null;

    const driverInfo = session?.DriverInfo ?? {};

    // Capacidad utilizable del deposito: FuelMaxLtr NO es una variable de telemetria del SDK.
    // Sale de DriverInfo: capacidad del coche x porcentaje maximo de llenado permitido.
    const fuelMax = (() => {
      const tankLtr = driverInfo.DriverCarFuelMaxLtr;
      if (!Number.isFinite(tankLtr) || tankLtr <= 0) return 0;
      const pct = driverInfo.DriverCarMaxFuelPct;
      return Number.isFinite(pct) && pct > 0 && pct <= 1 ? tankLtr * pct : tankLtr;
    })();

    // Identificador de sesion: al cambiar se reinicia el estado de pit/stint (y el del cliente)
    const sessionKey = `${weekend.SubSessionID ?? 0}:${telemetry.SessionNum?.value?.[0] ?? 0}`;
    if (sessionKey !== lastSessionKey) {
      if (lastSessionKey !== null) {
        resetPitAndStintState();
        // Otro coche/sesión: variables específicas del coche pueden cambiar de índice
        if (typeof sdk.resetTelemetryVariableCache === "function") sdk.resetTelemetryVariableCache();
      }
      lastSessionKey = sessionKey;
    }

// Indice del coche del jugador: DriverInfo si el YAML esta disponible; si no, la variable PlayerCarIdx
let driverIdx =
  driverInfo.DriverCarIdx ??
  driverInfo.PlayerCarIdx ??
  telemetry.PlayerCarIdx?.value?.[0] ??
  -1;

// Telemetry por coche (defínelos antes del fallback)
const carIdxLapDistPct = telemetry.CarIdxLapDistPct?.value ?? [];

const carIdxLap = telemetry.CarIdxLap?.value ?? [];
const carIdxEstTime = telemetry.CarIdxEstTime?.value ?? [];
const carIdxLastLapTime = telemetry.CarIdxLastLapTime?.value ?? [];
const carIdxBestLapTime = telemetry.CarIdxBestLapTime?.value ?? [];

// multi‑class
const carIdxClass = telemetry.CarIdxClass?.value ?? [];
const carIdxClassPosition = telemetry.CarIdxClassPosition?.value ?? [];

// banderas / posición en pista
const sessionFlags = telemetry.SessionFlags?.value?.[0] ?? 0;
const carIdxTrackSurface = telemetry.CarIdxTrackSurface?.value ?? [];
const carIdxOnPitRoad = telemetry.CarIdxOnPitRoad?.value ?? [];

// 1) ya tienes trackLength arriba → reutilízalo aquí
// Track length (NECESARIO para baseLapTime y yellowWarning)
const trackLengthStr = trackLength || "";
let trackLengthMeters = null;
if (typeof trackLengthStr === "string") {
  const match = trackLengthStr.match(/([\d.]+)\s*(km|mi)/i);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (!Number.isNaN(value)) {
      trackLengthMeters =
        unit === "km"
          ? value * 1000
          : unit === "mi"
          ? value * 1609.34
          : null;
    }
  }
}

// Velocidad (m/s) de cada coche derivada del avance de LapDistPct; null = desconocida
const carSpeeds = trackCarSpeeds({
  sessionTime,
  carIdxLapDistPct,
  carIdxTrackSurface,
  trackLengthMeters,
});

let relative = { myPosition: null, ahead: null, behind: null };
let relativeOnTrack = { ahead: null, behind: null };
let yellowWarning = null;
let pitClearAir = { suggestedLap: null, options: [] };
let standings = [];


// mapa CarIdx -> número de coche (puede ser vacío si DriverInfo viene roto)
const drivers = driverInfo.Drivers ?? [];
const carIdxNumberMap = {};
for (const d of drivers) {
  if (typeof d.CarIdx === "number") {
    carIdxNumberMap[d.CarIdx] = d.CarNumberRaw ?? d.CarNumber ?? null;
  }
}

// índice del coche en cámara
const camCarIdx = telemetry.CamCarIdx?.value?.[0] ?? driverIdx;
const cameraCarNumber = carIdxNumberMap[camCarIdx] ?? null;
const carIdxPosition = telemetry.CarIdxPosition?.value ?? [];


// Snapshot para debug con telemetry-debug
const debugCamera = {
  camCarIdx,
  cameraCarNumber,
  camPos: carIdxPosition[camCarIdx] ?? null,
  camDistPct: carIdxLapDistPct[camCarIdx] ?? null,
};

// Datos del coche en cámara para el Driver Focus
const cameraDriver = (() => {
  if (camCarIdx == null || camCarIdx < 0) return null;

  const driver = drivers.find((d) => d.CarIdx === camCarIdx) ?? null;

  const carNum = carIdxNumberMap[camCarIdx] ?? "";
  const classId = carIdxClass[camCarIdx] ?? 0;
  const position = carIdxPosition[camCarIdx] ?? 0;
  const bestLapRaw = carIdxBestLapTime[camCarIdx] ?? 0;
  const bestLapSeconds = bestLapRaw > 0 ? bestLapRaw : null;

  return {
    carIdx: camCarIdx,
    carNumber: String(carNum || `#${camCarIdx}`),
    classId,
    position,
    driverName: driver?.UserName ?? String(carNum || `#${camCarIdx}`),
    carModel: driver?.CarPath ?? "",
    bestLapSeconds,
  };
})();

if (driverIdx >= 0 && carIdxLapDistPct.length > 0) {
  const myLap = carIdxLap[driverIdx] ?? 0;
  const myPct = carIdxLapDistPct[driverIdx] ?? 0;


      const myLastLap = carIdxLastLapTime[driverIdx] ?? 0;
      const myBestLap = carIdxBestLapTime[driverIdx] ?? 0;

      const myClassId = carIdxClass[driverIdx] ?? null;
      const myClassPos = carIdxClassPosition[driverIdx] ?? 0;

      const myGlobalDist = myLap + myPct;

      const cars = carIdxLapDistPct.map((pct, idx) => {
        const lapIdx = carIdxLap[idx] ?? 0;
        const posClass = carIdxClassPosition[idx] ?? 0;
        const last = carIdxLastLapTime[idx] ?? 0;
        const best = carIdxBestLapTime[idx] ?? 0;
        const carNum = carIdxNumberMap[idx] ?? null;
        const globalDist = lapIdx + pct;
        const classId = carIdxClass[idx] ?? null;
        const speed = carSpeeds[idx] ?? null; // null = desconocida (no es "parado")
        const surface = carIdxTrackSurface[idx] ?? 0;
        const onPit = carIdxOnPitRoad[idx] ?? 0;
        const est = carIdxEstTime[idx];

        return {
          idx,
          est,
          carNum,
          lapIdx,
          pct,
          posClass,
          lastLap: last,
          bestLap: best,
          globalDist,
          classId,
          speed,
          surface,
          onPit,
        };
      });

      registerClassIdsFromCars(cars);

      // Si aún no tienes posición de clase (>0), calculamos myPosition aproximado
      let computedMyPos = myClassPos;
      if (myClassId != null && (!myClassPos || myClassPos <= 0)) {
        const sameClassCars = cars.filter(
          (c) =>
            c.classId === myClassId &&
            Number.isFinite(c.pct) &&
            c.pct >= 0 &&
            c.pct <= 1
        );
        const validClassCars = [...sameClassCars].sort(
          (a, b) => a.globalDist - b.globalDist
        );
        const myIndex = validClassCars.findIndex((c) => c.idx === driverIdx);
        if (myIndex >= 0) {
          computedMyPos = myIndex + 1; // P1, P2, ...
        }
      }

      // ---------- Standing Battle (posición en clase) ----------

      let aheadCar = null;
      let behindCar = null;

      // 1) Usar positions de clase si están disponibles
      if (myClassId != null && myClassPos > 0) {
        const sameClassCars = cars.filter(
          (c) =>
            carIdxClass[c.idx] === myClassId &&
            c.posClass > 0,
        );

        const aheadIdx = sameClassCars.findIndex(
          (c) => carIdxClassPosition[c.idx] === myClassPos - 1,
        );
        const behindIdx = sameClassCars.findIndex(
          (c) => carIdxClassPosition[c.idx] === myClassPos + 1,
        );

        if (aheadIdx >= 0) aheadCar = sameClassCars[aheadIdx];
        if (behindIdx >= 0) behindCar = sameClassCars[behindIdx];

        // fallback por distancia dentro de la clase
        if (!aheadCar || !behindCar) {
          const validClassCars = sameClassCars.filter(
            (c) =>
              Number.isFinite(c.pct) &&
              c.pct >= 0 &&
              c.pct <= 1,
          );

          validClassCars.sort((a, b) => a.globalDist - b.globalDist);

          if (!aheadCar) {
            for (const c of validClassCars) {
              if (c.globalDist > myGlobalDist) {
                aheadCar = c;
                break;
              }
            }
          }
          if (!behindCar) {
            for (let i = validClassCars.length - 1; i >= 0; i--) {
              const c = validClassCars[i];
              if (c.globalDist < myGlobalDist) {
                behindCar = c;
                break;
              }
            }
          }
        }
      }

      // 2) Fallback geométrico si aún no tenemos posición de clase fiable
      if (myClassId != null && (!myClassPos || myClassPos <= 0)) {
        const sameClassCars = cars.filter(
          (c) =>
            c.classId === myClassId &&
            Number.isFinite(c.pct) &&
            c.pct >= 0 &&
            c.pct <= 1,
        );

        const validClassCars = [...sameClassCars].sort(
          (a, b) => a.globalDist - b.globalDist,
        );

        if (!aheadCar) {
          for (const c of validClassCars) {
            if (c.globalDist > myGlobalDist) {
              aheadCar = c;
              break;
            }
          }
        }
        if (!behindCar) {
          for (let i = validClassCars.length - 1; i >= 0; i--) {
            const c = validClassCars[i];
            if (c.globalDist < myGlobalDist) {
              behindCar = c;
              break;
            }
          }
        }
      }

      // ---------- baseLapTime con fallback (no esperar vuelta completa) ----------

      let baseLapTime =
        myLastLap > 0 ? myLastLap :
        myBestLap > 0 ? myBestLap : 0;

      if (baseLapTime <= 0) {
        if (trackLengthMeters && trackLengthMeters > 0) {
          // Aprox: 150 km/h de media (41.6 m/s)
          baseLapTime = trackLengthMeters / 41.6;
        } else {
          // fallback global si no tenemos longitud de pista
          baseLapTime = 120; // 2 minutos
        }
      }

      // Gap con CarIdxEstTime (misma clase) o, si no hay dato, % de vuelta * tiempo de vuelta.
      const myEstTime = carIdxEstTime[driverIdx];
      const myEstLap = drivers.find((d) => d.CarIdx === driverIdx)?.CarClassEstLapTime;
      const gapSecondsFor = (target, dPct) =>
        target
          ? relativeGapSeconds({
              dPct,
              myEst: myEstTime,
              otherEst: target.est,
              lapRef: myEstLap > 0 ? myEstLap : baseLapTime,
              fallbackLap: baseLapTime,
              sameClass: target.classId === myClassId,
            })
          : null;

      const norm = (x) => {
        let r = x % 1;
        if (r < 0) r += 1;
        return r;
      };

      const myPosOnLap = norm(myPct);

      const computeGapSeconds = (target) => {
        if (!target || baseLapTime <= 0 || !Number.isFinite(target.pct)) {
          return null;
        }
        const tPos = norm(target.pct);
        let diff = tPos - myPosOnLap;
        if (diff > 0.5) diff -= 1;
        if (diff < -0.5) diff += 1;
        return gapSecondsFor(target, diff);
      };

      const aheadGapSeconds = computeGapSeconds(aheadCar);
      const behindGapSeconds = computeGapSeconds(behindCar);

      const computeDeltaLastToMe = (target) => {
        if (!target || myLastLap <= 0 || target.lastLap <= 0) return null;
        return myLastLap - target.lastLap;
      };

      const aheadDeltaLastToMe = computeDeltaLastToMe(aheadCar);
      const behindDeltaLastToMe = computeDeltaLastToMe(behindCar);

      relative = {
        myPosition: computedMyPos > 0 ? computedMyPos : myClassPos > 0 ? myClassPos : null,
        ahead:
          aheadCar
            ? {
                carNum: aheadCar.carNum,
                position: aheadCar.posClass || null,
                classId: aheadCar.classId,
                classPosition: aheadCar.posClass || null,
                gapSeconds: aheadGapSeconds,
                lastLap:
                  aheadCar.lastLap > 0 ? aheadCar.lastLap : null,
                bestLap:
                  aheadCar.bestLap > 0 ? aheadCar.bestLap : null,
                deltaLastToMe: aheadDeltaLastToMe,
              }
            : null,
        behind:
          behindCar
            ? {
                carNum: behindCar.carNum,
                position: behindCar.posClass || null,
                classId: behindCar.classId,
                classPosition: behindCar.posClass || null,
                gapSeconds: behindGapSeconds,
                lastLap:
                  behindCar.lastLap > 0 ? behindCar.lastLap : null,
                bestLap:
                  behindCar.bestLap > 0 ? behindCar.bestLap : null,
                deltaLastToMe: behindDeltaLastToMe,
              }
            : null,
      };

      // ---------- On-Track Relative (solo geometría) ----------

      const onTrackCars = cars.filter(
        (c) =>
          c.idx !== driverIdx &&
          Number.isFinite(c.pct) &&
          c.pct >= 0 && c.pct <= 1,
      );

      const diffPct = (from, to) => {
        let d = to - from;
        if (d > 0.5) d -= 1;
        if (d <= -0.5) d += 1;
        return d;
      };

      let onTrackAhead = null;
      let onTrackBehind = null;
      let bestAheadDiff = Infinity;
      let bestBehindDiff = -Infinity;

      for (const c of onTrackCars) {
        const d = diffPct(myPct, c.pct);

        if (d > 0 && d < bestAheadDiff) {
          bestAheadDiff = d;
          onTrackAhead = c;
        }

        if (d < 0 && d > bestBehindDiff) {
          bestBehindDiff = d;
          onTrackBehind = c;
        }
      }

      const computeGapSecondsOnTrack = (d, target) => gapSecondsFor(target, d);

      const aheadOnTrackGap =
        bestAheadDiff !== Infinity
          ? computeGapSecondsOnTrack(bestAheadDiff, onTrackAhead)
          : null;
      const behindOnTrackGap =
        bestBehindDiff !== -Infinity
          ? computeGapSecondsOnTrack(bestBehindDiff, onTrackBehind)
          : null;

      const computeLapsDiff = (target) => {
        if (!target) return null;
        return (target.lapIdx ?? 0) - myLap;
      };

      const aheadLapsDiff = computeLapsDiff(onTrackAhead);
      const behindLapsDiff = computeLapsDiff(onTrackBehind);

      relativeOnTrack = {
        ahead:
          onTrackAhead
            ? {
                carNum: onTrackAhead.carNum,
                classId: onTrackAhead.classId,
                classPosition: onTrackAhead.posClass || null,
                gapSeconds: aheadOnTrackGap,
                lapsDiff: aheadLapsDiff,
              }
            : null,
        behind:
          onTrackBehind
            ? {
                carNum: onTrackBehind.carNum,
                classId: onTrackBehind.classId,
                classPosition: onTrackBehind.posClass || null,
                gapSeconds: behindOnTrackGap,
                lapsDiff: behindLapsDiff,
              }
            : null,
      };
// --------- Actualizar estado de pit y stint por coche ---------
updatePitAndStintState({
  sessionTime,
  carIdxOnPitRoad,
  carIdxLapCompleted,
});

// ---------- Standings global (clasificación completa) ----------
const carIdxPosition = telemetry.CarIdxPosition?.value ?? [];

standings = [];

const carsForStandings = [];
for (let idx = 0; idx < carIdxPosition.length; idx++) {
  const pos = carIdxPosition[idx];
  if (!pos || pos <= 0) continue;

  const lapIdx = carIdxLap[idx] ?? 0;
  const pct = carIdxLapDistPct[idx] ?? 0;
  const totalProgress = lapIdx + pct;

  carsForStandings.push({ idx, pos, totalProgress });
}

// ordenar de más adelantado a más atrasado por progreso total
carsForStandings.sort((a, b) => b.totalProgress - a.totalProgress);

// Huecos respecto al líder (P1 oficial) con el tiempo de vuelta del LÍDER, no el del jugador
const leaderEntry = carsForStandings.find((c) => c.pos === 1) ?? carsForStandings[0];
const leaderLapTime = leaderEntry
  ? (carIdxLastLapTime[leaderEntry.idx] > 0 ? carIdxLastLapTime[leaderEntry.idx]
    : carIdxBestLapTime[leaderEntry.idx] > 0 ? carIdxBestLapTime[leaderEntry.idx] : baseLapTime)
  : baseLapTime;
const standingsGaps = computeStandingsGaps(
  carsForStandings.map((c) => ({ idx: c.idx, pos: c.pos, lap: carIdxLap[c.idx] ?? 0, pct: carIdxLapDistPct[c.idx] ?? 0 })),
  leaderLapTime,
);

for (const entry of carsForStandings) {
  const { idx, pos } = entry;

  const carNum = carIdxNumberMap[idx] ?? "";
  const classId = carIdxClass[idx] ?? 0;
  const bestLap = carIdxBestLapTime[idx] ?? 0;

  const driver = drivers.find((d) => d.CarIdx === idx);
  const driverName = driver?.UserName ?? String(carNum || `#${idx}`);
  const carModel = driver?.CarPath ?? ""; 

  const gapInfo = standingsGaps.get(idx) ?? { lapsDown: 0, gapSeconds: null };
  const lapsDown = gapInfo.lapsDown;
  const gapToLeaderSeconds = gapInfo.gapSeconds;

  // Stint y última parada desde el estado persistente
  const pitState = getOrCreatePitState(idx);
const lapCompleted = carIdxLapCompleted[idx] ?? 0;

let stintLapCount = 0;
if (pitState.stintStartLapCompleted != null) {
  stintLapCount = Math.max(
    0,
    lapCompleted - pitState.stintStartLapCompleted,
  );
}

const lastPitDurationSeconds = pitState.lastPitDurationSeconds ?? null;
const pitStops = pitState.pitStops ?? 0; 
//  indicador en pit usando CarIdxOnPitRoad directamente
const inPit = !!carIdxOnPitRoad[idx];

standings.push({
  position: pos,
  carNumber: String(carNum ?? ""),
  classId,
  driverName,
  bestLapSeconds: bestLap > 0 ? bestLap : null,
  stintLapCount,
  lastPitDurationSeconds,
  gapToLeaderSeconds,
  lapsDown,
  pitStops,
  inPit,
  carModel,
});


}

// ordenar por posición oficial
standings.sort((a, b) => a.position - b.position);


          // ---------- Pit Clear Air (estrategia de parada limpia) ----------

    // 1) Calcular info de fuel/carrera para el filtro
    const lapsRemainForRace =
      typeof sessionLapsRemainEx === "number" && sessionLapsRemainEx > 0
        ? sessionLapsRemainEx
        : null;

    let maxStintLapsFromFull = null;

    if (fuelMax && fuelMax > 0 && fuelLevel > 0 && baseLapTime > 0) {
      const lapsDone = lapCompleted || lap || 0;

      if (lapsDone >= 2) {
        const fuelUsedSoFar = (fuelMax || fuelLevel) - fuelLevel;
        const fuelPerLapApprox =
          fuelUsedSoFar > 0 ? fuelUsedSoFar / lapsDone : null;

        if (fuelPerLapApprox && fuelPerLapApprox > 0) {
          maxStintLapsFromFull = fuelMax / fuelPerLapApprox;
        }
      }

      if (!maxStintLapsFromFull || maxStintLapsFromFull <= 0) {
        maxStintLapsFromFull = 30; // fallback genérico
      }
    }

    if (
      pitStrategyParams.pitWindowStartLap != null &&
      pitStrategyParams.pitWindowEndLap != null &&
      pitStrategyParams.pitWindowEndLap >= pitStrategyParams.pitWindowStartLap
    ) {
      pitClearAir = computePitClearAirSuggestion({
        myLap,
        myPct,
        cars,
        myIdx: driverIdx,
        baseLapTime,
        pitWindowStartLap: pitStrategyParams.pitWindowStartLap,
        pitWindowEndLap: pitStrategyParams.pitWindowEndLap,
        pitDeltaSeconds: pitStrategyParams.pitDeltaSeconds,
        lapsRemainForRace,
        maxStintLapsFromFull,
      });

    }



      // ---------- Yellow Warning (bandera amarilla + coche incidente / debris) ----------

      const IRACING_FLAG_YELLOW = 0x00000008;
      const IRACING_FLAG_DEBRIS = 0x00000040;
      const IRACING_FLAG_YELLOW_WAVING = 0x00000100;
      const IRACING_FLAG_CAUTION = 0x00004000;
      const IRACING_FLAG_CAUTION_WAVING = 0x00008000;

      const anyYellow =
        (sessionFlags &
          (IRACING_FLAG_YELLOW |
           IRACING_FLAG_YELLOW_WAVING |
           IRACING_FLAG_CAUTION |
           IRACING_FLAG_CAUTION_WAVING)) !== 0;

      const debrisOnly =
        (sessionFlags & IRACING_FLAG_DEBRIS) !== 0 && !anyYellow;

      if ((anyYellow || debrisOnly) && trackLengthMeters && trackLengthMeters > 0) {
        const mySpeed = telemetry.Speed?.value?.[0] ?? carSpeeds[driverIdx] ?? 0;

        const INCIDENT_MIN_METERS_AHEAD = 50;
        let bestIncident = null;
        let bestIncidentDeltaPct = Infinity;

        if (anyYellow) {
          // solo buscamos coche incidente cuando hay yellow/caution
          for (const c of cars) {
            if (c.idx === driverIdx) continue;
            if (c.onPit) continue;
            if (!Number.isFinite(c.speed) || c.speed > 5) continue;
            if (!Number.isFinite(c.pct)) continue;

            let dPct = c.pct - myPct;
            if (dPct < 0) dPct += 1;

            const distMeters = dPct * trackLengthMeters;
            if (distMeters < INCIDENT_MIN_METERS_AHEAD) continue;

            if (dPct < bestIncidentDeltaPct) {
              bestIncidentDeltaPct = dPct;
              bestIncident = c;
            }
          }
        }

        if (anyYellow && bestIncident) {
          const distanceMeters = bestIncidentDeltaPct * trackLengthMeters;
          let timeSeconds = null;
          if (mySpeed > 1) {
            timeSeconds = distanceMeters / mySpeed;
          }

          yellowWarning = {
            active: true,
            distanceMeters,
            timeSeconds,
            carNum: bestIncident.carNum ?? null,
            classId: bestIncident.classId ?? null,
            classPosition: bestIncident.posClass || null,
            type: "incident",
          };
        } else {
          // debris puro o yellow sin coche claro → rayado
          yellowWarning = {
            active: true,
            distanceMeters: null,
            timeSeconds: null,
            carNum: null,
            classId: null,
            classPosition: null,
            type: "debris",
          };
        }
      } else {
        yellowWarning = {
          active: false,
          distanceMeters: null,
          timeSeconds: null,
          carNum: null,
          classId: null,
          classPosition: null,
          type: null,
        };
      }
    }

    const bestLapTime = driverIdx >= 0
      ? (carIdxBestLapTime[driverIdx] || null)
      : null;

    // Sin clientes conectados (y sin grabación en curso) no merece la pena serializar ni enviar nada
    if (wss.clients.size === 0 && !diag.recorder) return;

    const payload = JSON.stringify({
  fuelLevel,
  lap,
  lapCompleted,
  lastLapTime,
  bestLapTime,
  sessionTimeRemain,
  sessionLapsRemainEx,
  fuelMax,
  sessionKey,
  onPitRoad: !!telemetry.OnPitRoad?.value?.[0],
  isInGarage: !!telemetry.IsInGarage?.value?.[0],
  isReplayPlaying: !!telemetry.IsReplayPlaying?.value?.[0],
  lapDistPct: telemetry.LapDistPct?.value?.[0] ?? null,
  sessionFlags,
  airTemp,
  trackTemp,
  relative,
  relativeOnTrack,
  classColorIndexById,
  yellowWarning,
  pitClearAir,
  standings,
  cameraCarNumber,
  debugCamera,
  cameraDriver, 

   //  datos para TrackInfoWidget
  trackName,
  trackLength,
  windSpeed,
  windDirection,
  rainChance,
});


    if (diag.recorder) diag.recorder.write(payload + "\n");

    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(payload);
      }
    });
   } catch (err) {
     // Una excepcion en un tick no debe tumbar el proceso (en Electron corre en el proceso principal)
     const now = Date.now();
     if (now - lastErrorLogAt > 5000) {
       lastErrorLogAt = now;
       console.error("[iFuel] Error en el ciclo de telemetría (se ignora este tick):", err);
     }
   }
  }, BROADCAST_INTERVAL);

  return timer;
}

// telemetry-server.mjs (solo la parte de abajo)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connectToIRacingWithRetry(control) {
  while (!control.stopped) {
    try {
      if (await control.isSimRunning()) {
        const sdk = await control.createSdk();
        if (!sdk.startSDK()) {
          console.warn("[iFuel] startSDK() devolvió false; se continúa igualmente");
        }
        control.waitingLogged = false;
        console.log("[iFuel] Conectado a iRacing");
        return sdk;
      } else if (!control.waitingLogged) {
        control.waitingLogged = true; // un solo aviso hasta que el sim se abra de nuevo
        console.log("[iFuel] iRacing no está en ejecución; esperando...");
      }
    } catch (err) {
      console.error("[iFuel] Error comprobando iRacing:", err);
    }
    await sleep(5000); // reintenta cada 5s
  }
  return null;
}

async function startTelemetryServer(options = {}) {
  const host = options.host || WS_HOST;
  const port = options.port || WS_PORT;
  const pathWs = options.path || WS_PATH;

  loadClassMapFromDisk_init(options.dataDir);

  const wss = new WebSocketServer({
    host,
    port,
    path: pathWs,
    maxPayload: MAX_MESSAGE_BYTES, // rechaza mensajes grandes antes de bufferizarlos
    // Rechazo en el propio handshake (HTTP 403) para orígenes no permitidos.
    // Sin Origin (clientes no-navegador en localhost) se admite, como antes.
    verifyClient: ({ origin }) => !origin || allowedOrigins.has(origin),
  });

  // Estado de conexion con iRacing, para poder parar/reiniciar el servidor de forma limpia
  // Estado compartido con el bucle para diagnóstico (SDK actual, sesión y grabador)
  const diag = { sdk: null, session: null, recorder: null };

  const control = {
    stopped: false,
    sdk: null,
    timer: null,
    finishLoop: null,
    isSimRunning: options.isSimRunning || defaultIsSimRunning,
    createSdk: options.createSdk || defaultCreateSdk,
    simClosedCheckMs: options.simClosedCheckMs ?? SIM_CLOSED_CHECK_MS,
  };

  // El origen de desarrollo (Vite) solo se admite si no se indica lo contrario
  const allowedOrigins = new Set(["file://", "app://ifuel"]);
  if (options.dev !== false) allowedOrigins.add("http://localhost:5173");

  wss.on("connection", (ws, request) => {
    console.log("[iFuel] Nuevo cliente conectado a iFuel WS");

    const origin = request.headers.origin;

if (origin && !allowedOrigins.has(origin)) {
  console.warn("[iFuel] Origin no permitido en WS:", origin);
  ws.close(1008, "Origin not allowed");
  return;
}


    ws.on("message", (data) => {
      if (data.length > MAX_MESSAGE_BYTES) {
        console.warn("[iFuel] Mensaje WS demasiado grande, cerrando conexión");
        ws.close(1009, "Message too big");
        return;
      }

      let msg;
      try {
        msg = JSON.parse(data.toString("utf8"));
      } catch {
        console.warn("[iFuel] Mensaje WS JSON inválido");
        ws.close(1003, "Invalid JSON");
        return;
      }

      if (!msg || typeof msg !== "object") {
        ws.close(1003, "Invalid message");
        return;
      }

      switch (msg.type) {
        case "updatePitStrategy": {
          const {
            pitWindowStartLap,
            pitWindowEndLap,
            pitDeltaSeconds,
          } = msg;

          if (
            typeof pitWindowStartLap !== "number" ||
            typeof pitWindowEndLap !== "number" ||
            typeof pitDeltaSeconds !== "number"
          ) {
            console.warn("[iFuel] updatePitStrategy: tipos inválidos");
            return;
          }

          if (
            !Number.isFinite(pitWindowStartLap) ||
            !Number.isFinite(pitWindowEndLap) ||
            !Number.isFinite(pitDeltaSeconds)
          ) {
            console.warn("[iFuel] updatePitStrategy: valores no finitos");
            return;
          }

          if (
            pitWindowStartLap < 1 ||
            pitWindowEndLap < pitWindowStartLap ||
            pitWindowEndLap - pitWindowStartLap > 100
          ) {
            console.warn("[iFuel] updatePitStrategy: rango inválido");
            return;
          }

          if (pitDeltaSeconds <= 0 || pitDeltaSeconds > 600) {
            console.warn("[iFuel] updatePitStrategy: pitDeltaSeconds inválido");
            return;
          }

          pitStrategyParams = {
            pitWindowStartLap,
            pitWindowEndLap,
            pitDeltaSeconds,
          };

          break;
        }

        default:
          // ignorar mensajes desconocidos
          break;
      }
    });

    ws.on("error", (err) => {
      console.error("[iFuel] Error en conexión WS cliente:", err);
    });
  });

  wss.on("listening", () => {
    console.log(
      `[iFuel] Servidor WS iFuel en ws://${host}:${port}${pathWs}`,
    );
  });

  wss.on("error", (err) => {
    console.error("Error en WebSocketServer:", err);
    if (err && err.code === "EADDRINUSE") {
      // El puerto ya esta ocupado (otra instancia): no tiene sentido seguir leyendo del sim
      control.stopped = true;
      if (control.finishLoop) control.finishLoop();
    }
  });

  // Bucle de conexion con iRacing: conecta, procesa ticks y, si el sim se cierra, vuelve a esperar
  const runConnectionLoop = async () => {
    while (!control.stopped) {
      const sdk = await connectToIRacingWithRetry(control);
      if (!sdk) break;
      control.sdk = sdk;

      await new Promise((resolve) => {
        control.finishLoop = resolve;
        try {
          control.timer = startTelemetryLoop(sdk, wss, {
            isSimRunning: control.isSimRunning,
            simClosedCheckMs: control.simClosedCheckMs,
            diag,
            onSimClosed: () => {
              console.log("[iFuel] iRacing se ha cerrado; esperando para reconectar...");
              resolve();
            },
          });
        } catch (err) {
          console.error("[iFuel] Error arrancando el telemetry loop:", err);
          resolve();
        }
      });

      if (control.timer) clearInterval(control.timer);
      control.timer = null;
      control.finishLoop = null;
      try {
        sdk.stopSDK();
      } catch {
        /* ignorar */
      }
      control.sdk = null;
      if (!control.stopped) await sleep(1000);
    }
  };

  runConnectionLoop().catch((err) => {
    console.error("[iFuel] Error en el bucle de conexión con iRacing:", err);
  });

  // Parada limpia: corta el bucle, libera el SDK y cierra el servidor WS
  const startRecording = (dir) => {
    if (diag.recorder) return diag.recorder.file;
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `ifuel-${timestamp()}.jsonl.gz`);
    diag.recorder = openRecorder(file);
    diag.recorder.write(
      JSON.stringify({ _meta: { startedAt: new Date().toISOString(), format: "un payload de iFuel por línea (~4 Hz)" } }) + "\n",
    );
    return file;
  };

  const stopRecording = async () => {
    const recorder = diag.recorder;
    diag.recorder = null;
    if (!recorder) return null;
    await recorder.close();
    return recorder.file;
  };

  // Volcado puntual de datos crudos del SDK. No incluye nombres ni IDs de pilotos.
  const saveSnapshot = (dir) => {
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `ifuel-sdk-snapshot-${timestamp()}.json`);
    const session = diag.session ?? {};
    const sessionNum = diag.sdk?.getTelemetryVariable?.("SessionNum")?.value?.[0];
    const telemetry = {};
    for (const name of SNAPSHOT_VARS) {
      const variable = diag.sdk?.getTelemetryVariable?.(name);
      telemetry[name] = variable ? Array.from(variable.value ?? []).slice(0, 64) : null;
    }
    const snapshot = {
      _meta: { takenAt: new Date().toISOString(), sdkConnected: !!diag.sdk, sessionNum },
      weekendInfo: pick(session.WeekendInfo, [
        "TrackName", "TrackDisplayName", "TrackLength", "TrackLengthOfficial", "SeriesID",
        "SeasonID", "SessionID", "SubSessionID", "EventType", "Category", "NumCarClasses",
      ]),
      driverInfo: pick(session.DriverInfo, [
        "DriverCarIdx", "DriverCarFuelKgPerLtr", "DriverCarFuelMaxLtr", "DriverCarMaxFuelPct",
        "DriverCarEstLapTime", "DriverPitTrkPct", "DriverCarVersion",
      ]),
      session: pick(
        (session.SessionInfo?.Sessions ?? []).find((x) => x.SessionNum === sessionNum),
        ["SessionNum", "SessionType", "SessionName", "SessionLaps", "SessionTime"],
      ),
      telemetry,
    };
    fs.writeFileSync(file, JSON.stringify(snapshot, null, 2));
    return file;
  };

  const stop = async () => {
    control.stopped = true;
    await stopRecording();
    if (control.timer) clearInterval(control.timer);
    if (control.finishLoop) control.finishLoop();
    try {
      if (control.sdk) control.sdk.stopSDK();
    } catch {
      /* ignorar */
    }
    for (const client of wss.clients) client.terminate();
    await new Promise((resolve) => wss.close(() => resolve()));
  };

  const isSdkConnected = () => !!diag.sdk;

  return { stop, startRecording, stopRecording, saveSnapshot, isSdkConnected };
}

export { startTelemetryServer, probeSimRunning, TELEMETRY_VARS, SNAPSHOT_VARS };

// Arranque manual: `npm run telemetry` (node telemetry-server.mjs). Electron lo importa y
// lo arranca él mismo, así que esto solo se ejecuta si el archivo es el punto de entrada.
// (pathToFileURL: la comparación con import.meta.url también funciona con rutas de Windows)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startTelemetryServer()
    .then((server) => {
      const shutdown = () => {
        server.stop().finally(() => process.exit(0));
      };
      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
    })
    .catch((err) => {
      console.error("Error en telemetry-server:", err);
      process.exit(1);
    });
}
