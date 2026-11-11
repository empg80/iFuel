// Margen de seguridad de combustible (en vueltas), compartido entre el panel de ajustes y el hook que
// envía la estrategia al servidor. Persiste en localStorage; por defecto 1 vuelta.
import { useSyncExternalStore } from "react";

const KEY = "ifuel-safety-laps";
const DEFAULT_LAPS = 1;
const MIN = 0;
const MAX = 5;

function clamp(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_LAPS;
  return Math.min(MAX, Math.max(MIN, Math.round(v * 4) / 4));
}

function read(): number {
  try {
    const raw = localStorage.getItem(KEY);
    return raw == null ? DEFAULT_LAPS : clamp(Number(raw));
  } catch {
    return DEFAULT_LAPS;
  }
}

let value = read();
const subs = new Set<() => void>();

export function getSafetyLaps(): number {
  return value;
}

export function setSafetyLaps(v: number): void {
  value = clamp(v);
  try {
    localStorage.setItem(KEY, String(value));
  } catch {
    /* sin almacenamiento: vale en memoria */
  }
  subs.forEach((cb) => cb());
}

function subscribe(cb: () => void): () => void {
  subs.add(cb);
  return () => subs.delete(cb);
}

export function useSafetyLaps(): number {
  return useSyncExternalStore(subscribe, getSafetyLaps, getSafetyLaps);
}

// Segundos de aire limpio: cuántos segundos alrededor de tu salida de boxes cuentan como tráfico (C6).
const CA_KEY = "ifuel-clear-air-seconds";
const CA_DEFAULT = 3;
function caClamp(v: number): number {
  if (!Number.isFinite(v)) return CA_DEFAULT;
  return Math.min(10, Math.max(1, Math.round(v)));
}
let caValue = (() => {
  try {
    const raw = localStorage.getItem(CA_KEY);
    return raw == null ? CA_DEFAULT : caClamp(Number(raw));
  } catch {
    return CA_DEFAULT;
  }
})();
const caSubs = new Set<() => void>();
export function getClearAirSeconds(): number {
  return caValue;
}
export function setClearAirSeconds(v: number): void {
  caValue = caClamp(v);
  try {
    localStorage.setItem(CA_KEY, String(caValue));
  } catch {
    /* sin almacenamiento */
  }
  caSubs.forEach((cb) => cb());
}
export function useClearAirSeconds(): number {
  return useSyncExternalStore(
    (cb) => {
      caSubs.add(cb);
      return () => caSubs.delete(cb);
    },
    getClearAirSeconds,
    getClearAirSeconds,
  );
}
