// iFuel-telemetry-node/pitLoss.mjs
// Mide cuánto tiempo pierdes de verdad en una parada: tiempo en el pit road menos lo que
// habrías tardado en recorrer ese mismo tramo rodando a ritmo de carrera. Además mide cuánto
// tarda el repostaje (litros por segundo) para poder estimar la pérdida de una parada con
// otra cantidad de combustible.

const MAX_STRETCH = 0.5; // un pit road no ocupa más de media vuelta; si sale más, el dato no es fiable
const MAX_LOSS_SECONDS = 180;
const FILL_STEP_LITERS = 0.02; // aumento mínimo entre lecturas para considerar que está repostando
const MIN_FILL_LITERS = 1;
const MIN_FILL_SECONDS = 2;
const MAX_FUEL_RATE = 15; // L/s; por encima, el dato no es creíble

export function createPitLossTracker() {
  let seenOnTrack = false; // hemos visto al coche en pista antes de entrar (no es la salida inicial)
  let lastOffPit = null; // { time, pct } última lectura en pista: la entrada a boxes debe ser continua con ella
  let entry = null; // { time, pct, fillStart, fillEnd, fillStartFuel, fillEndFuel, lastFuel }
  let lastLoss = null;
  let lastLiters = null; // litros que se añadieron en la última parada medida
  let fuelRate = null; // L/s medidos en el repostaje
  let stops = 0;

  return {
    /**
     * @param {{onPitRoad:boolean, sessionTime:number, lapDistPct:number, baseLapTime:number,
     *   inWorld?:boolean, fuelLevel?:number}} s
     *   inWorld=false (garaje, replay, coche fuera del mundo): la lectura no cuenta
     * @returns {number|null} última pérdida medida en segundos, o null si todavía no hay ninguna
     */
    update({ onPitRoad, sessionTime, lapDistPct, baseLapTime, inWorld = true, fuelLevel }) {
      if (!inWorld || !Number.isFinite(lapDistPct) || lapDistPct < 0) return lastLoss; // fuera del mundo
      if (!onPitRoad) {
        if (entry) {
          const duration = sessionTime - entry.time;
          const stretch = (((lapDistPct - entry.pct) % 1) + 1) % 1;
          const done = entry;
          entry = null;
          if (duration > 0 && stretch > 0 && stretch <= MAX_STRETCH && baseLapTime > 0) {
            const loss = duration - stretch * baseLapTime;
            if (loss > 0 && loss <= MAX_LOSS_SECONDS) {
              lastLoss = loss;
              stops += 1;
              // repostaje de esta parada
              const liters = done.fillEndFuel - done.fillStartFuel;
              const secs = done.fillEnd - done.fillStart;
              if (done.fillStart != null && liters >= MIN_FILL_LITERS && secs >= MIN_FILL_SECONDS) {
                const rate = liters / secs;
                if (rate > 0 && rate <= MAX_FUEL_RATE) {
                  fuelRate = rate;
                  lastLiters = liters;
                }
              } else {
                lastLiters = 0; // parada sin repostar: la pérdida medida no incluye combustible
              }
            }
          }
        }
        seenOnTrack = true;
        lastOffPit = { time: sessionTime, pct: lapDistPct };
      } else if (!entry && seenOnTrack) {
        // Una parada real viene de rodar por pista justo antes. Reaparecer en boxes (reset, salida de
        // garaje, cambio de sesión) no lo es: la lectura anterior en pista queda lejos en tiempo o distancia.
        const gap = lastOffPit ? (((lapDistPct - lastOffPit.pct) % 1) + 1) % 1 : null;
        const continuous = lastOffPit && sessionTime - lastOffPit.time <= 5 && gap <= 0.08;
        if (!continuous) { seenOnTrack = false; lastOffPit = null; return lastLoss; }
        entry = {
          time: sessionTime, pct: lapDistPct,
          fillStart: null, fillEnd: null, fillStartFuel: null, fillEndFuel: null,
          lastFuel: Number.isFinite(fuelLevel) ? fuelLevel : null, lastTime: sessionTime,
        };
      } else if (entry && Number.isFinite(fuelLevel)) {
        if (entry.lastFuel != null && fuelLevel - entry.lastFuel > FILL_STEP_LITERS) {
          if (entry.fillStart == null) {
            entry.fillStart = entry.lastTime; // el repostaje empezó entre la lectura anterior y esta
            entry.fillStartFuel = entry.lastFuel;
          }
          entry.fillEnd = sessionTime;
          entry.fillEndFuel = fuelLevel;
        }
        entry.lastFuel = fuelLevel;
        entry.lastTime = sessionTime;
      }
      return lastLoss;
    },
    /**
     * Pérdida estimada para una parada en la que se añaden `liters` litros. Si se ha medido el ritmo
     * de repostaje, se separa la parte fija (pit road, neumáticos...) de la del combustible.
     * Sin ritmo medido devuelve la última pérdida tal cual; sin ninguna medida, null.
     */
    lossFor(liters) {
      if (lastLoss == null) return null;
      if (fuelRate == null || lastLiters == null || !Number.isFinite(liters)) return lastLoss;
      const fixedPart = Math.max(0, lastLoss - lastLiters / fuelRate);
      return fixedPart + Math.max(0, liters) / fuelRate;
    },
    get lastLoss() { return lastLoss; },
    get fuelRate() { return fuelRate; },
    get stops() { return stops; },
    reset() {
      seenOnTrack = false;
      lastOffPit = null;
      entry = null;
      lastLoss = null;
      lastLiters = null;
      fuelRate = null;
      stops = 0;
    },
  };
}
