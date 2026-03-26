// telemetry-server.mjs
import { IRacingSDK } from "irsdk-node";
import { WebSocketServer } from "ws";
import fs from "fs";
import path from "path";

import {
  pitAndStintStateByCarIdx,
  getOrCreatePitState,
  updatePitAndStintState,
} from "./pitState.mjs";

const TIMEOUT = Math.floor((1 / 60) * 1000);
const BROADCAST_INTERVAL = 250; // ms
const WS_PORT = 7071;
const WS_PATH = "/ifuel";
const WS_HOST = "127.0.0.1"; 
const CLASS_MAP_FILE = path.join(process.cwd(), "classColorMap.json");

// mapa global por sesión: classId -> índice 0..5
let classColorIndexById = {};
let nextClassIndex = 0;

// parámetros provisionales de estrategia (luego los alimentarás desde el FuelWidget)
let pitStrategyParams = {
  pitWindowStartLap: null,
  pitWindowEndLap: null,
  pitDeltaSeconds: 32, // tiempo total de pit estimado
};

// Cargar si existe
try {
  if (fs.existsSync(CLASS_MAP_FILE)) {
    const raw = fs.readFileSync(CLASS_MAP_FILE, "utf8");
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

function saveClassMapToDisk() {
  try {
    fs.writeFileSync(
      CLASS_MAP_FILE,
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


function startTelemetryLoop(sdk, wss) {
  
  setInterval(() => {
    const hasData = sdk.waitForData(TIMEOUT);
    if (!hasData) return;

    const telemetry = sdk.getTelemetry();
    const session = sdk.getSessionData();

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
    const fuelMax = telemetry.FuelMaxLtr?.value?.[0] ?? 0;

    const airTemp = telemetry.AirTemp?.value?.[0] ?? null;
    const trackTemp =
      (telemetry.TrackTempCrew ?? telemetry.TrackTemp)?.value?.[0] ?? null;

    const driverInfo = session?.DriverInfo ?? {};
let driverIdx =
  driverInfo.DriverCarIdx ??
  driverInfo.PlayerCarIdx ??
  -1;

// Telemetry por coche (defínelos antes del fallback)
const carIdxLapDistPct = telemetry.CarIdxLapDistPct?.value ?? [];

const carIdxLap = telemetry.CarIdxLap?.value ?? [];
const carIdxLastLapTime = telemetry.CarIdxLastLapTime?.value ?? [];
const carIdxBestLapTime = telemetry.CarIdxBestLapTime?.value ?? [];

// multi‑class
const carIdxClass = telemetry.CarIdxClass?.value ?? [];
const carIdxClassPosition = telemetry.CarIdxClassPosition?.value ?? [];

// banderas / posición en pista
const sessionFlags = telemetry.SessionFlags?.value?.[0] ?? 0;
const carIdxSpeed = telemetry.CarIdxSpeed?.value ?? [];
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


let relative = { myPosition: null, ahead: null, behind: null };
let relativeOnTrack = { ahead: null, behind: null };
let yellowWarning = null;
let pitClearAir = { suggestedLap: null, options: [] };
let standings = [];

// Fallback: si el YAML está roto y driverIdx sigue en -1 pero sí hay coches,
// usamos 0 (primer coche) para poder calcular relative/standings.
if (driverIdx < 0 && carIdxLapDistPct.length > 0) {
  driverIdx = 0;
}

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
        const speed = carIdxSpeed[idx] ?? 0;
        const surface = carIdxTrackSurface[idx] ?? 0;
        const onPit = carIdxOnPitRoad[idx] ?? 0;

        return {
          idx,
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
        return diff * baseLapTime;
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

      const computeGapSecondsOnTrack = (d) => {
        if (baseLapTime <= 0 || !Number.isFinite(d)) return null;
        return d * baseLapTime;
      };

      const aheadOnTrackGap =
        bestAheadDiff !== Infinity
          ? computeGapSecondsOnTrack(bestAheadDiff)
          : null;
      const behindOnTrackGap =
        bestBehindDiff !== -Infinity
          ? computeGapSecondsOnTrack(bestBehindDiff)
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

let leaderTotalProgress = null;
let leaderIdx = -1;
if (carsForStandings.length > 0) {
  leaderTotalProgress = carsForStandings[0].totalProgress;
  leaderIdx = carsForStandings[0].idx;
}

for (const entry of carsForStandings) {
  const { idx, pos, totalProgress } = entry;

  const carNum = carIdxNumberMap[idx] ?? "";
  const classId = carIdxClass[idx] ?? 0;
  const bestLap = carIdxBestLapTime[idx] ?? 0;

  const driver = drivers.find((d) => d.CarIdx === idx);
  const driverName = driver?.UserName ?? String(carNum || `#${idx}`);
  const carModel = driver?.CarPath ?? ""; 

  // lapsDown: diferencia de vueltas completas respecto al líder
  let lapsDown = 0;
  if (leaderTotalProgress != null) {
    const diffLapsFloat = leaderTotalProgress - totalProgress;
    if (diffLapsFloat > 0) {
      lapsDown = Math.floor(diffLapsFloat + 1e-6);
    }
  }

  // gap en tiempo dentro de la misma vuelta (simple, usando baseLapTime)
  let gapToLeaderSeconds = null;
  if (leaderIdx === idx) {
    gapToLeaderSeconds = 0;
  } else if (
    leaderIdx !== -1 &&
    leaderTotalProgress != null &&
    baseLapTime > 0
  ) {
    const leaderPct = carIdxLapDistPct[leaderIdx] ?? 0;
    const myPct = carIdxLapDistPct[idx] ?? 0;
    let diffPct = leaderPct - myPct;
    if (diffPct > 0.5) diffPct -= 1;
    if (diffPct < -0.5) diffPct += 1;
    gapToLeaderSeconds = diffPct * baseLapTime;
  }

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
        const mySpeed = carIdxSpeed[driverIdx] ?? 0;

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

    const payload = JSON.stringify({
  fuelLevel,
  lap,
  lapCompleted,
  lastLapTime,
  bestLapTime,
  sessionTimeRemain,
  sessionLapsRemainEx,
  fuelMax,
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


    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(payload);
      }
    });
  }, BROADCAST_INTERVAL);
}

// telemetry-server.mjs (solo la parte de abajo)

async function connectToIRacingWithRetry() {
  while (true) {
    try {
      if (await IRacingSDK.IsSimRunning()) {
        const sdk = new IRacingSDK({ autoEnableTelemetry: true });
        sdk.startSDK();
        console.log("[iFuel] Conectado a iRacing");
        return sdk;
      } else {
        console.log("[iFuel] iRacing no está en ejecución, reintentando...");
      }
    } catch (err) {
      console.error("[iFuel] Error comprobando iRacing:", err);
    }
    await new Promise((r) => setTimeout(r, 5000)); // reintenta cada 5s
  }
}

const MAX_MESSAGE_BYTES = 16 * 1024; // 16 KB

async function startTelemetryServer(options = {}) {
  const host = options.host || WS_HOST;
  const port = options.port || WS_PORT;
  const pathWs = options.path || WS_PATH;

  const wss = new WebSocketServer({
    host,
    port,
    path: pathWs,
  });

  wss.on("connection", (ws, request) => {
    console.log("[iFuel] Nuevo cliente conectado a iFuel WS");

    const origin = request.headers.origin;

if (
  origin &&
  origin !== "file://" &&
  origin !== "app://ifuel" &&
  origin !== "http://localhost:5173"
) {
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
  });

  // bucle de reconexión a iRacing:
  while (true) {
    const sdk = await connectToIRacingWithRetry();
    try {
      startTelemetryLoop(sdk, wss);
      break;
    } catch (err) {
      console.error("[iFuel] Error en telemetry loop:", err);
    }
  }
}

export { startTelemetryServer };


// Si quisieras seguir pudiendo arrancarlo a mano con `node telemetry-server.mjs`,
// puedes dejar esto opcionalmente:
// if (import.meta.url === `file://${process.argv[1]}`) {
//   startTelemetryServer().catch((err) => {
//     console.error("Error en telemetry-server:", err);
//   });
// }