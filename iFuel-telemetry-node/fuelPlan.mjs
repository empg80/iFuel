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
/**
 * Vueltas hasta mi primera línea de meta después de agotarse el reloj, más una vuelta si el líder cruza la línea
 * DESPUÉS de mí (él recibe la bandera a cuadros y yo todavía tengo que dar otra vuelta).
 * `leader` = {pct, lapTime} del líder si no soy yo.
 */
function timedLaps({ T, pct, lapTime, leader }) {
  const toLine = (1 - pct) * lapTime;
  const k = T <= toLine ? 0 : Math.ceil((T - toLine) / lapTime);
  const mine = (1 - pct) + k;
  if (!leader || !(leader.lapTime > 0) || !Number.isFinite(leader.pct)) return mine;
  const tMine = toLine + k * lapTime;
  const toLineL = (1 - leader.pct) * leader.lapTime;
  const kL = T <= toLineL ? 0 : Math.ceil((T - toLineL) / leader.lapTime);
  const tLeader = toLineL + kL * leader.lapTime;
  return mine + (tMine < tLeader - 0.01 ? 1 : 0);
}

/**
 * Vueltas que te quedan por rodar desde donde estás (con la fracción de la vuelta en curso).
 * Carrera por vueltas: SessionLapsRemainEx cuenta la vuelta en curso entera.
 * Carrera por tiempo: al agotarse el reloj termina el líder en su siguiente paso por meta; tú terminas en tu primer paso
 * por meta posterior al suyo (ver timedLaps).
 * @returns {number|null}
 */
export function lapsToRun({ lapsRemain, timeRemain, lapTime, myPct, timeExpired, leader }) {
  const pct = Number.isFinite(myPct) ? Math.min(Math.max(myPct, 0), 0.999) : 0;
  if (Number.isFinite(lapsRemain) && lapsRemain > 0 && lapsRemain < LAP_MODE_MAX) return lapsRemain - pct;
  // El reloj ya llegó a 0: iRacing puede volver a poner un valor raro, pero el final se calcula con T = 0
  if (timeExpired && lapTime > 0) return timedLaps({ T: 0, pct, lapTime, leader });
  if (Number.isFinite(timeRemain) && timeRemain > 0 && timeRemain < 86400 * 3 && lapTime > 0) {
    return timedLaps({ T: timeRemain, pct, lapTime, leader });
  }
  return null;
}

/**
 * @returns {{perLap:number|null, perLapSource:string, lapsToFinish:number|null, litersToAdd:number|null,
 *   status:string, stops:number|null, stintLaps:number[], window:ReturnType<typeof computePitWindow>|null}}
 */
export function computeFuelPlan(i) {
  const { fuelLevel, fuelPerLap, fuelCapacity, myLap, myPct, pitPct, safetyLaps, lapsRemain, timeRemain, lapTime, timeExpired, leader } = i;
  const empty = { perLap: fuelPerLap ?? null, litersToAdd: null, status: "unknown", stops: null, stintLaps: [], window: null, remainingLaps: null };
  if (!(fuelPerLap > 0) || !(fuelCapacity > 0)) return empty;

  const remaining = lapsToRun({ lapsRemain, timeRemain, lapTime, myPct, timeExpired, leader });
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

  // Si el combustible llega a meta y solo falta una parte pequeña del margen de seguridad, no merece la pena una
  // parada (~40 s). Se tolera como mucho la MITAD del margen elegido: la reserva real nunca baja de media reserva.
  const reachesFinish = remaining <= lapsOnFuel;
  if (stops > 0 && reachesFinish && deficitLaps < safetyLaps / 2) {
    return { perLap: fuelPerLap, litersToAdd, status: "no-stop", stops: 0, stintLaps: [], window: { ...window, status: "no-stop" }, remainingLaps: remaining };
  }

  return { perLap: fuelPerLap, litersToAdd, status: window.status, stops, stintLaps, window, remainingLaps: remaining };
}
