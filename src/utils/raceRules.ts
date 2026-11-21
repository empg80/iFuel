// C2-light: reglas de la carrera que Kike configura a mano (paradas obligatorias, tiempo mínimo en boxes,
// stint máximo). Persisten en localStorage. 0 = regla desactivada.
import { useSyncExternalStore } from "react";

export type RaceRules = { minStops: number; minStopSeconds: number; maxStintLaps: number };
export const DEFAULT_RULES: RaceRules = { minStops: 0, minStopSeconds: 0, maxStintLaps: 0 };
const KEY = "ifuel-race-rules";

export function clampRules(r: Partial<RaceRules> | null | undefined): RaceRules {
  const n = (v: unknown, max: number) => {
    const x = Math.round(Number(v));
    return Number.isFinite(x) ? Math.min(max, Math.max(0, x)) : 0;
  };
  return { minStops: n(r?.minStops, 20), minStopSeconds: n(r?.minStopSeconds, 300), maxStintLaps: n(r?.maxStintLaps, 200) };
}

function read(): RaceRules {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? clampRules(JSON.parse(raw)) : DEFAULT_RULES;
  } catch {
    return DEFAULT_RULES;
  }
}

let value = read();
const subs = new Set<() => void>();
export const getRaceRules = () => value;
export function setRaceRules(patch: Partial<RaceRules>): void {
  value = clampRules({ ...value, ...patch });
  try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* en memoria */ }
  subs.forEach((cb) => cb());
}
export function useRaceRules(): RaceRules {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, getRaceRules, getRaceRules);
}

export type RulesStatus = {
  active: boolean;
  stopsDone: number;
  stopsLeft: number | null;     // null = regla desactivada
  stopsOk: boolean;
  stintLaps: number;
  stintLeft: number | null;     // vueltas hasta el límite de stint
  stintTone: "ok" | "warn" | "bad" | null;
  holdLeft: number | null;      // segundos que faltan para el tiempo mínimo en boxes (solo estando en boxes)
};

/** Evalúa las reglas con los datos de mi coche. `pitSeconds` = segundos desde que entré a boxes (null si no estoy). */
export function evaluateRules(rules: RaceRules, me: { pitStops: number; stintLapCount: number } | null, pitSeconds: number | null): RulesStatus {
  const active = rules.minStops > 0 || rules.minStopSeconds > 0 || rules.maxStintLaps > 0;
  const stopsDone = me?.pitStops ?? 0;
  const stintLaps = me?.stintLapCount ?? 0;
  const stopsLeft = rules.minStops > 0 ? Math.max(0, rules.minStops - stopsDone) : null;
  const stintLeft = rules.maxStintLaps > 0 ? rules.maxStintLaps - stintLaps : null;
  const stintTone = stintLeft == null ? null : stintLeft <= 0 ? "bad" : stintLeft <= 3 ? "warn" : "ok";
  const holdLeft = rules.minStopSeconds > 0 && pitSeconds != null ? Math.max(0, rules.minStopSeconds - pitSeconds) : null;
  return { active, stopsDone, stopsLeft, stopsOk: stopsLeft === 0, stintLaps, stintLeft, stintTone, holdLeft };
}
