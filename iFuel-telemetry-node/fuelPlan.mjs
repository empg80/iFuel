// iFuel-telemetry-node/fuelPlan.mjs
// Plan de combustible y de parada con UNA sola fórmula, para que el widget de combustible y el
// pit clear air digan lo mismo.

import { computePitWindow } from "./pitWindow.mjs";

const LAP_MODE_MAX = 1000; // SessionLapsRemainEx = 32767 significa "sin límite de vueltas"

/**
 * Vueltas que te quedan por rodar desde donde estás (con la fracción de la vuelta en curso).
 * Carrera por vueltas: SessionLapsRemainEx cuenta la vuelta en curso entera.
 * Carrera por tiempo: al llegar el reloj a 0 terminas al cruzar la meta, así que se cuentan los pasos
 * por línea que quedan hasta que el reloj se agota.
 * @returns {number|null}
 */
export function lapsToRun({ lapsRemain, timeRemain, lapTime, myPct }) {
  const pct = Number.isFinite(myPct) ? Math.min(Math.max(myPct, 0), 0.999) : 0;
  if (Number.isFinite(lapsRemain) && lapsRemain > 0 && lapsRemain < LAP_MODE_MAX) return lapsRemain - pct;
  if (Number.isFinite(timeRemain) && timeRemain > 0 && timeRemain < 86400 * 3 && lapTime > 0) {
    const toLine = (1 - pct) * lapTime; // tiempo hasta cruzar la meta de esta vuelta
    if (timeRemain <= toLine) return 1 - pct; // el reloj se agota antes de la línea: terminas ahí
    return (1 - pct) + Math.ceil((timeRemain - toLine) / lapTime);
  }
  return null;
}

/**
 * @returns {{perLap:number|null, perLapSource:string, lapsToFinish:number|null, litersToAdd:number|null,
 *   status:string, stops:number|null, stintLaps:number[], window:ReturnType<typeof computePitWindow>|null}}
 */
export function computeFuelPlan(i) {
  const { fuelLevel, fuelPerLap, fuelCapacity, myLap, myPct, pitPct, safetyLaps, lapsRemain, timeRemain, lapTime } = i;
  const empty = { perLap: fuelPerLap ?? null, litersToAdd: null, status: "unknown", stops: null, stintLaps: [], window: null, remainingLaps: null };
  if (!(fuelPerLap > 0) || !(fuelCapacity > 0)) return empty;

  const remaining = lapsToRun({ lapsRemain, timeRemain, lapTime, myPct });
  if (remaining == null) return empty;

  const pct = Number.isFinite(myPct) ? myPct : 0;
  const window = computePitWindow({
    fuelLevel, fuelPerLap, fuelCapacity, myLap, myPct: pct, pitPct,
    lapsToFinish: remaining + pct, // computePitWindow resta myPct
    safetyLaps,
  });

  const needed = (remaining + safetyLaps) * fuelPerLap;
  const litersToAdd = Math.max(0, needed - fuelLevel);
  const capacityLaps = fuelCapacity / fuelPerLap;
  const lapsOnFuel = fuelLevel / fuelPerLap;

  // Paradas necesarias: depósitos extra que hacen falta a partir del que llevas
  const deficitLaps = Math.max(0, remaining + safetyLaps - lapsOnFuel);
  const stops = deficitLaps <= 0 ? 0 : Math.ceil(deficitLaps / Math.max(capacityLaps - safetyLaps, 1));

  // Vueltas de parada previstas: la primera en el último paso posible y las siguientes cada depósito
  const stintLaps = [];
  if (stops > 0 && window.endLap != null) {
    const step = Math.max(1, Math.floor(capacityLaps - safetyLaps - 0.25));
    for (let k = 0; k < stops; k++) stintLaps.push(window.endLap + k * step);
  }

  return { perLap: fuelPerLap, litersToAdd, status: window.status, stops, stintLaps, window, remainingLaps: remaining };
}
