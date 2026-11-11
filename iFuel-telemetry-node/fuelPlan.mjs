// iFuel-telemetry-node/fuelPlan.mjs
// Plan de combustible y de parada con UNA sola fórmula, para que el widget de combustible y el
// pit clear air digan lo mismo.

import { computePitWindow } from "./pitWindow.mjs";

// Más de ~25 h = "tiempo ilimitado" (práctica/test: iRacing pone 2 o 7 días); la 24 h de Daytona/Le Mans no llega a esto
const UNLIMITED_TIME = 90000;
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
export function lapsToRun({ lapsRemain, timeRemain, lapTime, myPct, timeExpired, leader, finished }) {
  // Ya cruzaste la meta con la bandera a cuadros: no queda nada por correr
  if (finished) return 0;
  const pct = Number.isFinite(myPct) ? Math.min(Math.max(myPct, 0), 0.999) : 0;
  if (Number.isFinite(lapsRemain) && lapsRemain > 0 && lapsRemain < LAP_MODE_MAX) return lapsRemain - pct;
  // Sesión por vueltas ya terminada (bandera a cuadros): no queda nada por correr
  if (lapsRemain === 0) return 0;
  // El reloj ya llegó a 0: iRacing puede volver a poner un valor raro, pero el final se calcula con T = 0
  if (timeExpired && lapTime > 0) return timedLaps({ T: 0, pct, lapTime, leader });
  if (Number.isFinite(timeRemain) && timeRemain > 0 && timeRemain <= UNLIMITED_TIME && lapTime > 0) {
    return timedLaps({ T: timeRemain, pct, lapTime, leader });
  }
  return null;
}

/**
 * @returns {{perLap:number|null, perLapSource:string, lapsToFinish:number|null, litersToAdd:number|null,
 *   status:string, stops:number|null, stintLaps:number[], window:ReturnType<typeof computePitWindow>|null}}
 */
export function computeFuelPlan(i) {
  const { fuelLevel, fuelPerLap, fuelCapacity, myLap, myPct, pitPct, safetyLaps, lapsRemain, timeRemain, lapTime, timeExpired, leader, finished } = i;
  const empty = { perLap: fuelPerLap ?? null, litersToAdd: null, status: "unknown", stops: null, stintLaps: [], window: null, remainingLaps: null };
  if (!(fuelPerLap > 0) || !(fuelCapacity > 0)) return empty;

  const remaining = lapsToRun({ lapsRemain, timeRemain, lapTime, myPct, timeExpired, leader, finished });
  if (remaining == null) return empty;
  if (remaining <= 0) {
    return { perLap: fuelPerLap, litersToAdd: 0, status: "no-stop", stops: 0, stintLaps: [], window: null, remainingLaps: 0, lapsToFinish: 0 };
  }

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

/**
 * Reloj de sesión agotado ("solo queda cruzar la meta"). El reloj también cuenta hacia atrás ANTES
 * de la salida (cuenta atrás de parrilla): ese 0 no es el final. Solo cuenta cuando la sesión está
 * en marcha (SessionState >= 4: 4 en carrera, 5 bandera a cuadros, 6 enfriamiento); antes de eso
 * se reinicia. `sessionState` null = desconocido (se asume en marcha).
 * @returns {{timeWasRunning:boolean,timeExpired:boolean}}
 */
export function updateTimeLatch({ timeWasRunning, timeExpired }, { timeRemain, sessionState = null, replay = false }) {
  if (replay) return { timeWasRunning, timeExpired };
  if (sessionState != null && sessionState < 4) return { timeWasRunning: false, timeExpired: false };
  if (timeRemain > 1) return { timeWasRunning: true, timeExpired };
  if (timeWasRunning && timeRemain >= 0 && timeRemain <= 1) return { timeWasRunning, timeExpired: true };
  return { timeWasRunning, timeExpired };
}

/**
 * Detecta que el líder ya recibió la bandera a cuadros: con el reloj agotado, el líder cruza la meta (su % pasa de
 * ~1 a ~0) o SessionState pasa a 5. A partir de ahí tu final es TU siguiente cruce, sin la vuelta extra por "cruzar
 * antes que el líder" (iRacing además reinicia SessionTimeRemain a otro valor tras el 0, así que no sirve para esto).
 * @returns {{finished:boolean, pct:number|null}}
 */
export function updateLeaderFinished({ finished, pct }, { timeExpired, leaderPct, sessionState = null }) {
  if (!timeExpired) return { finished: false, pct: Number.isFinite(leaderPct) ? leaderPct : null };
  if (finished) return { finished, pct: Number.isFinite(leaderPct) ? leaderPct : pct };
  const wrapped = pct != null && Number.isFinite(leaderPct) && pct > 0.8 && leaderPct < 0.2;
  return { finished: wrapped || (sessionState != null && sessionState >= 5), pct: Number.isFinite(leaderPct) ? leaderPct : pct };
}

/**
 * Ahorro de combustible: cuántos litros/vuelta hay que ahorrar para
 *  - "avoid-stop": llegar a meta sin parar (si falta poco: ahorro ≤ 8 % del consumo), o
 *  - "extra-lap": hacer UNA vuelta más con el combustible actual.
 * @returns {{mode:"avoid-stop"|"extra-lap", targetLaps:number, perLapNeeded:number, savePerLap:number, savePct:number, realistic:boolean}|null}
 */
export function fuelSaving({ fuelLevel, fuelPerLap, remaining, stops }) {
  if (!(fuelPerLap > 0) || !(fuelLevel > 0)) return null;
  const lapsOnFuel = fuelLevel / fuelPerLap;
  let mode, target;
  if (stops > 0 && remaining > 0 && remaining > lapsOnFuel && remaining <= lapsOnFuel * 1.12) {
    mode = "avoid-stop";
    target = remaining;
  } else {
    mode = "extra-lap";
    target = Math.floor(lapsOnFuel) + 1;
    if (stops === 0 && remaining > 0 && lapsOnFuel >= remaining) return null; // ya llegas
  }
  const needed = fuelLevel / target;
  const save = fuelPerLap - needed;
  const pct = save / fuelPerLap;
  return { mode, targetLaps: target, perLapNeeded: needed, savePerLap: save, savePct: pct, realistic: pct <= 0.08 };
}
