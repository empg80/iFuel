// iFuel-telemetry-node/pitLoss.mjs
// Mide cuánto tiempo pierdes de verdad en una parada: tiempo en el pit road menos lo que
// habrías tardado en recorrer ese mismo tramo rodando a ritmo de carrera.

const MAX_STRETCH = 0.5; // un pit road no ocupa más de media vuelta; si sale más, el dato no es fiable
const MAX_LOSS_SECONDS = 180;

export function createPitLossTracker() {
  let seenOnTrack = false; // hemos visto al coche en pista antes de entrar (no es la salida inicial)
  let entry = null; // { time, pct }
  let lastLoss = null;
  let stops = 0;

  return {
    /**
     * @param {{onPitRoad:boolean, sessionTime:number, lapDistPct:number, baseLapTime:number, inWorld?:boolean}} s
     *   inWorld=false (garaje, replay, coche fuera del mundo): la lectura no cuenta
     * @returns {number|null} última pérdida medida en segundos, o null si todavía no hay ninguna
     */
    update({ onPitRoad, sessionTime, lapDistPct, baseLapTime, inWorld = true }) {
      if (!inWorld || !Number.isFinite(lapDistPct) || lapDistPct < 0) return lastLoss; // fuera del mundo
      if (!onPitRoad) {
        if (entry) {
          const duration = sessionTime - entry.time;
          const stretch = (((lapDistPct - entry.pct) % 1) + 1) % 1;
          entry = null;
          if (duration > 0 && stretch > 0 && stretch <= MAX_STRETCH && baseLapTime > 0) {
            const loss = duration - stretch * baseLapTime;
            if (loss > 0 && loss <= MAX_LOSS_SECONDS) {
              lastLoss = loss;
              stops += 1;
            }
          }
        }
        seenOnTrack = true;
      } else if (!entry && seenOnTrack) {
        entry = { time: sessionTime, pct: lapDistPct };
      }
      return lastLoss;
    },
    get stops() {
      return stops;
    },
    reset() {
      seenOnTrack = false;
      entry = null;
      lastLoss = null;
      stops = 0;
    },
  };
}
