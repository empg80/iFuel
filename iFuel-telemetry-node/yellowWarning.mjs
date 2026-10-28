// iFuel-telemetry-node/yellowWarning.mjs
// Aviso de bandera amarilla / debris: localiza el coche incidente por delante y calcula distancia y tiempo.

export const FLAG_YELLOW = 0x00000008;
export const FLAG_DEBRIS = 0x00000040;
export const FLAG_YELLOW_WAVING = 0x00000100;
export const FLAG_CAUTION = 0x00004000;
export const FLAG_CAUTION_WAVING = 0x00008000;

const YELLOW_MASK = FLAG_YELLOW | FLAG_YELLOW_WAVING | FLAG_CAUTION | FLAG_CAUTION_WAVING;

const MIN_METERS_AHEAD = 30; // más cerca ya lo estás viendo / pasando
const STOPPED_MS = 5; // m/s (18 km/h): coche parado o casi
const MAX_LAP_FRACTION = 0.6; // más allá, el coche está en realidad detrás de ti
const SLOW_FRACTION = 0.35; // por debajo del 35 % de su ritmo normal = trompo, recuperando, averiado
const HOLD_SECONDS = 6; // iRacing apaga el debris tras unos 5 s; mantenemos el aviso un poco más

export const INACTIVE = {
  active: false,
  distanceMeters: null,
  timeSeconds: null,
  carNum: null,
  classId: null,
  classPosition: null,
  type: null,
};

/** ¿Este coche parece el incidente? Parado, muy lento para su ritmo, o fuera de la pista. */
export function looksLikeIncident(c, trackLengthMeters, fallbackLapTime) {
  if (c.onPit) return false;
  if (c.surface === -1 || c.surface === 1 || c.surface === 2) return false; // no está / en su box / entrando a boxes
  if (!Number.isFinite(c.pct) || c.pct < 0) return false;
  const speed = c.speed;
  if (Number.isFinite(speed)) {
    if (speed <= STOPPED_MS) return true;
    const lap = c.lastLap > 0 ? c.lastLap : c.bestLap > 0 ? c.bestLap : fallbackLapTime;
    if (lap > 0 && trackLengthMeters > 0) {
      const normal = trackLengthMeters / lap;
      if (speed < normal * SLOW_FRACTION) return true;
    }
  }
  return c.surface === 0 && !Number.isFinite(speed); // fuera de pista y sin velocidad conocida
}

export function createYellowTracker() {
  let holdUntil = -Infinity;
  let last = null;

  return {
    reset() {
      holdUntil = -Infinity;
      last = null;
    },
    /**
     * @param {{sessionFlags:number, cars:any[], myIdx:number, myPct:number, mySpeed:number,
     *   trackLengthMeters:number, baseLapTime:number, sessionTime:number}} s
     */
    update({ sessionFlags, cars, myIdx, myPct, mySpeed, trackLengthMeters, baseLapTime, sessionTime }) {
      if (!(trackLengthMeters > 0)) return INACTIVE;

      const yellow = (sessionFlags & YELLOW_MASK) !== 0;
      const debris = (sessionFlags & FLAG_DEBRIS) !== 0;
      const flagged = yellow || debris;
      if (flagged) holdUntil = sessionTime + HOLD_SECONDS;
      const held = !flagged && sessionTime <= holdUntil && last != null;
      if (!flagged && !held) {
        last = null;
        return INACTIVE;
      }

      // Incidente más cercano por delante
      let best = null;
      let bestD = Infinity;
      const nearby = []; // diagnóstico: los coches más cercanos por delante, sean o no el incidente
      for (const c of cars) {
        if (c.idx === myIdx) continue;
        if (Number.isFinite(c.pct) && c.pct >= 0) {
          let d = c.pct - myPct;
          if (d < 0) d += 1;
          if (d <= MAX_LAP_FRACTION) nearby.push({ carNum: c.carNum ?? null, meters: Math.round(d * trackLengthMeters), speed: Number.isFinite(c.speed) ? Math.round(c.speed * 10) / 10 : null, surface: c.surface ?? null });
        }
        if (!looksLikeIncident(c, trackLengthMeters, baseLapTime)) continue;
        let dPct = c.pct - myPct;
        if (dPct < 0) dPct += 1;
        if (dPct * trackLengthMeters < MIN_METERS_AHEAD || dPct > MAX_LAP_FRACTION) continue;
        if (dPct < bestD) {
          bestD = dPct;
          best = c;
        }
      }

      nearby.sort((a, b) => a.meters - b.meters);
      const debug = { flags: sessionFlags, nearby: nearby.slice(0, 3) };
      if (best) {
        const distanceMeters = bestD * trackLengthMeters;
        last = {
          active: true,
          distanceMeters,
          timeSeconds: mySpeed > 1 ? distanceMeters / mySpeed : null,
          carNum: best.carNum ?? null,
          classId: best.classId ?? null,
          classPosition: best.posClass || null,
          type: yellow ? "incident" : "debris",
          debug,
        };
        return last;
      }

      // Bandera activa pero sin coche identificable: aviso sin distancia
      last = { ...INACTIVE, active: true, type: "debris", debug }; // sin coche claro: aviso rayado
      return last;
    },
  };
}
