// Modelo del dashboard de volante: cálculos puros (sin React) para poder probarlos.
import type { DashData } from "../types/car";

export const gearLabel = (g: number | null | undefined): string => (g == null ? "–" : g < 0 ? "R" : g === 0 ? "N" : String(g));

/** Fracción 0-1 del arco de RPM: hasta la línea roja, o un 8 % por encima del régimen de cambio si el coche no la da. */
export function rpmFraction(d: Pick<DashData, "rpm" | "rpmInfo"> | null | undefined): number {
  const rpm = d?.rpm;
  if (rpm == null || !(rpm > 0)) return 0;
  const i = d?.rpmInfo;
  const top = i?.redline ?? (i?.shift ? i.shift * 1.08 : null) ?? 8000;
  return Math.min(1, Math.max(0, rpm / top));
}

/** Estado de las luces de cambio: "off" | "shift" (cambia ya) | "blink" (pasado de vueltas). */
export function shiftState(d: Pick<DashData, "rpm" | "shiftPct" | "rpmInfo"> | null | undefined): "off" | "shift" | "blink" {
  const rpm = d?.rpm;
  if (rpm == null) return "off";
  const i = d?.rpmInfo;
  if (i?.blink && rpm >= i.blink) return "blink";
  if (i?.shift && rpm >= i.shift) return "shift";
  if (!i?.shift && (d?.shiftPct ?? 0) >= 0.98) return "shift";
  return "off";
}

export type RibbonCell = { lap: number; label: string; score: number | null; inWindow: boolean; box: boolean; beyondFuel: boolean; now: boolean };

/** Cinta de carrera: una celda por vuelta desde la actual, con el tráfico al salir de boxes si hay dato. */
export function buildRibbon(o: {
  lap: number; count?: number; scores: { lap: number; score: number }[]; windowStart: number | null; windowEnd: number | null;
  pick: number | null; fuelEndLap: number | null; finishLap: number | null;
}): RibbonCell[] {
  const count = o.count ?? 17;
  const by = new Map(o.scores.map((s) => [s.lap, s.score]));
  const cells: RibbonCell[] = [];
  for (let k = 0; k < count; k++) {
    const lap = o.lap + k;
    if (o.finishLap != null && lap > o.finishLap) break;
    cells.push({
      lap, label: k === 0 ? "ya" : String(lap), score: by.get(lap) ?? null,
      inWindow: o.windowStart != null && o.windowEnd != null && lap >= o.windowStart && lap <= o.windowEnd,
      box: o.pick === lap, beyondFuel: o.fuelEndLap != null && lap > o.fuelEndLap, now: k === 0,
    });
  }
  return cells;
}
