// iFuel-telemetry-node/carData.mjs
// Datos del coche para el pitboard: delta, ajustes (BIAS/TC/ABS), compuesto, neumáticos y sectores.
//
// Neumáticos: iRacing solo actualiza temperatura y desgaste cuando el coche pasa por boxes, y no
// da la presión en caliente (solo la presión en frío del garaje). Por eso se guarda la última
// lectura junto con la vuelta en la que cambió, para poder mostrar "medido hace N vueltas".
//
// Sectores: el SDK solo da los límites (SplitTimeInfo), no los tiempos. Se miden aquí cruzando
// cada límite con interpolación lineal entre dos lecturas (sale con error de centésimas aunque
// se muestree a 4 Hz).

const CORNERS = ["LF", "RF", "LR", "RR"];
const ZONES = ["L", "M", "R"]; // izquierda / medio / derecha de la banda

// Variables del SDK que lee este módulo (el servidor las añade a TELEMETRY_VARS)
export const CAR_VARS = [
  "LapDeltaToBestLap", "LapDeltaToBestLap_OK", "PlayerTireCompound", "ThrottleRaw", "BrakeRaw",
  "dcBrakeBias", "dcTractionControl", "dcTractionControl2", "dcABS",
  ...CORNERS.flatMap((c) => [
    `${c}coldPressure`,
    ...ZONES.map((z) => `${c}wear${z}`),
    ...ZONES.map((z) => `${c}tempC${z}`),
  ]),
];

const num = (v) => (Number.isFinite(v) ? v : null);

// iRacing da el desgaste como fracción (1 = nuevo). Si algún valor pasa de 1 ya viene en porcentaje.
function toPercent(values) {
  const scale = values.some((v) => v != null && v > 1.0001) ? 1 : 100;
  return values.map((v) => (v == null ? null : Math.max(0, Math.min(100, v * scale))));
}

function readTyres(vars) {
  const out = { wear: {}, temp: {}, coldPressure: {} };
  let any = false;
  for (const c of CORNERS) {
    const wear = toPercent(ZONES.map((z) => num(vars[`${c}wear${z}`])));
    const temp = ZONES.map((z) => num(vars[`${c}tempC${z}`]));
    const cold = num(vars[`${c}coldPressure`]);
    out.wear[c.toLowerCase()] = wear;
    out.temp[c.toLowerCase()] = temp;
    out.coldPressure[c.toLowerCase()] = cold;
    if (wear.some((v) => v != null) || temp.some((v) => v != null)) any = true;
  }
  return any ? out : null;
}

const sameTyres = (a, b) =>
  a && b && JSON.stringify([a.wear, a.temp]) === JSON.stringify([b.wear, b.temp]);

export function createCarTracker() {
  let tyres = null; // última lectura
  let tyresLap = null; // vuelta en la que cambió por última vez
  let prev = null; // { time, pct } lectura anterior en pista
  let sectorIdx = null;
  let sectorStartTime = null;
  let lapValid = false; // la vuelta en curso es completa (sin boxes ni saltos)
  let current = []; // tiempos de la vuelta en curso
  let last = []; // tiempos de la última vuelta completa
  let best = []; // mejor tiempo personal de cada sector

  const resetSectors = () => {
    prev = null;
    sectorIdx = null;
    sectorStartTime = null;
    lapValid = false;
    current = [];
  };

  function trackSectors({ sessionTime, lapDistPct, onPitRoad, inWorld, sectorStarts }) {
    const starts = Array.isArray(sectorStarts) ? sectorStarts : [];
    if (starts.length < 2 || !inWorld || !Number.isFinite(lapDistPct) || lapDistPct < 0 || onPitRoad) {
      if (onPitRoad || !inWorld) resetSectors();
      return;
    }
    const idxOf = (pct) => {
      let i = 0;
      for (let k = 0; k < starts.length; k++) if (pct >= starts[k]) i = k;
      return i;
    };
    const now = { time: sessionTime, pct: lapDistPct };
    if (prev) {
      const dPct = (((now.pct - prev.pct + 0.5) % 1) + 1) % 1 - 0.5; // avance con vuelta al cerrar
      const dTime = now.time - prev.time;
      if (dTime <= 0 || dTime > 3 || dPct < 0 || dPct > 0.2) {
        resetSectors(); // salto (replay, teletransporte, parón largo)
        prev = now;
        sectorIdx = idxOf(now.pct);
        return;
      }
      const at = (boundary) => {
        // instante en que se cruza `boundary` entre prev y now
        const span = (((boundary - prev.pct) % 1) + 1) % 1;
        return dPct > 0 ? prev.time + (span / dPct) * dTime : now.time;
      };
      const idx = idxOf(now.pct);
      const crossed = idx !== sectorIdx;
      if (crossed) {
        const boundary = starts[idx];
        const tCross = at(boundary);
        if (sectorStartTime != null && lapValid && sectorIdx != null) {
          const t = tCross - sectorStartTime;
          if (t > 1 && t < 600) {
            current[sectorIdx] = t;
            if (best[sectorIdx] == null || t < best[sectorIdx]) best[sectorIdx] = t;
          }
        }
        if (idx === 0) {
          // cierra vuelta: los sectores completos pasan a "última vuelta"
          if (starts.every((_, k) => current[k] != null) && current.every((v) => v != null)) last = current.slice();
          current = [];
          lapValid = true;
        } else if (sectorIdx == null) {
          lapValid = false;
        }
        sectorStartTime = tCross;
        sectorIdx = idx;
      }
    } else {
      sectorIdx = idxOf(now.pct);
      sectorStartTime = null; // hasta cruzar un límite no hay un inicio fiable
    }
    prev = now;
  }

  return {
    reset() {
      resetSectors();
      last = [];
      best = [];
      tyres = null;
      tyresLap = null;
    },

    /**
     * @param {{vars:Object, sessionTime:number, lap:number, lapDistPct:number, onPitRoad:boolean,
     *   inWorld?:boolean, sectorStarts?:number[]}} s  vars: valores numéricos por nombre de variable
     */
    update({ vars = {}, sessionTime, lap, lapDistPct, onPitRoad, inWorld = true, sectorStarts }) {
      trackSectors({ sessionTime, lapDistPct, onPitRoad, inWorld, sectorStarts });

      const reading = readTyres(vars);
      if (reading && !sameTyres(reading, tyres)) tyresLap = lap;
      if (reading) tyres = reading;

      const sectors = (sectorStarts ?? []).map((_, i) => {
        const t = current[i] ?? last[i] ?? null;
        const fresh = current[i] != null;
        let status = null;
        if (t != null) status = best[i] != null && Math.abs(t - best[i]) < 0.0005 ? "best" : "slower";
        return { time: t, fresh, status };
      });

      const deltaOk = vars.LapDeltaToBestLap_OK;
      return {
        delta: deltaOk === false || deltaOk === 0 ? null : num(vars.LapDeltaToBestLap),
        brakeBias: num(vars.dcBrakeBias),
        tc1: num(vars.dcTractionControl),
        tc2: num(vars.dcTractionControl2),
        abs: num(vars.dcABS),
        compound: num(vars.PlayerTireCompound),
        tyres: tyres ? { ...tyres, measuredLap: tyresLap, lapsAgo: tyresLap != null ? Math.max(0, lap - tyresLap) : null } : null,
        sectors,
      };
    },
  };
}

// Traza de acelerador y freno: el bucle principal va a 4 Hz, así que un muestreador aparte
// (20 Hz) rellena este buffer circular y cada envío lleva los últimos `seconds` segundos.
export function createTraceBuffer({ hz = 20, seconds = 8 } = {}) {
  const cap = Math.round(hz * seconds);
  const throttle = [];
  const brake = [];
  const pct = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v * 100))) : 0);
  return {
    hz,
    push(t, b) {
      throttle.push(pct(t));
      brake.push(pct(b));
      if (throttle.length > cap) {
        throttle.shift();
        brake.shift();
      }
    },
    clear() {
      throttle.length = 0;
      brake.length = 0;
    },
    snapshot() {
      return { hz, throttle: throttle.slice(), brake: brake.slice() };
    },
  };
}
