// iFuel-telemetry-node/fuelModel.mjs
// Consumo por vuelta medido directamente del depósito mientras ruedas, sin esperar a una vuelta
// "válida": litros quemados / vueltas recorridas, ignorando boxes, repostajes y saltos (reset, replay).

const MAX_STEP_LAPS = 0.05; // más que esto entre dos lecturas = salto, no se fía
const MAX_STEP_LITERS = 2; // una caída mayor entre lecturas no es consumo normal
const MIN_LAPS = 0.4; // con menos distancia el consumo por zona (rectas/curvas) engaña
const DECAY_AT_LAPS = 8; // tras esto se olvida lo más antiguo para seguir los cambios de ritmo
const DECAY = 0.7;

export function createFuelModel() {
  let prev = null; // { lapPos, fuel }
  let burned = 0;
  let laps = 0;

  return {
    /** @param {{fuelLevel:number, lap:number, lapDistPct:number, onPitRoad:boolean, inWorld?:boolean}} s */
    update({ fuelLevel, lap, lapDistPct, onPitRoad, inWorld = true }) {
      const valid = inWorld && !onPitRoad && Number.isFinite(fuelLevel) && fuelLevel > 0
        && Number.isFinite(lap) && Number.isFinite(lapDistPct) && lapDistPct >= 0;
      if (!valid) { prev = null; return this.perLap; }
      const lapPos = lap + lapDistPct;
      if (prev) {
        const dLaps = lapPos - prev.lapPos;
        const dFuel = prev.fuel - fuelLevel;
        if (dLaps > 0 && dLaps <= MAX_STEP_LAPS && dFuel >= 0 && dFuel <= MAX_STEP_LITERS) {
          burned += dFuel;
          laps += dLaps;
          if (laps > DECAY_AT_LAPS) { burned *= DECAY; laps *= DECAY; }
        }
      }
      prev = { lapPos, fuel: fuelLevel };
      return this.perLap;
    },
    get perLap() { return laps >= MIN_LAPS && burned > 0 ? burned / laps : null; },
    get lapsMeasured() { return laps; },
    reset() { prev = null; burned = 0; laps = 0; },
  };
}
