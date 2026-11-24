// Datos derivados para la torre y la tarjeta del replay.
import type { StandingsRow } from "../types/standings";

const norm = (n: string) => n.replace(/^#/, "").replace(/^0+(?=\d)/, "");

/** Número de coche de la mejor vuelta de toda la sesión (null si nadie tiene). */
export function fastestLapCar(rows: StandingsRow[]): string | null {
  let best: StandingsRow | null = null;
  for (const r of rows) {
    if (r.bestLapTime != null && r.bestLapTime > 0 && (!best || r.bestLapTime < (best.bestLapTime as number))) best = r;
  }
  return best ? norm(best.carNumber) : null;
}

/** Letra del neumático para la insignia (S/M/H/I/W…). */
export function tyreLetter(name: string | null | undefined): string | null {
  if (!name) return null;
  const t = name.toLowerCase();
  if (/soft|blando/.test(t)) return "S";
  if (/medium|medio/.test(t)) return "M";
  if (/hard|duro/.test(t)) return "H";
  if (/inter/.test(t)) return "I";
  if (/wet|lluvia|rain/.test(t)) return "W";
  if (/slick|dry|seco/.test(t)) return "D";
  return name.trim().charAt(0).toUpperCase() || null;
}

/** Puestos ganados (+) o perdidos (−) respecto a la referencia; 0 si no hay referencia. */
export function positionChange(start: number | undefined, now: number): number {
  if (start == null || !Number.isFinite(start)) return 0;
  return start - now;
}

/** Hueco con el coche inmediatamente delante de la MISMA clase: segundos, vueltas, o null. */
export function classIntervals(rows: StandingsRow[]): Map<string, { seconds: number | null; laps: number }> {
  const out = new Map<string, { seconds: number | null; laps: number }>();
  const byClass = new Map<number, StandingsRow[]>();
  for (const r of rows) {
    const list = byClass.get(r.classId) ?? [];
    list.push(r);
    byClass.set(r.classId, list);
  }
  for (const list of byClass.values()) {
    list.sort((a, b) => a.position - b.position);
    list.forEach((r, i) => {
      if (i === 0) return;
      const prev = list[i - 1];
      const laps = Math.max(0, r.lapsDown - prev.lapsDown);
      const sec = r.gapToLeader != null && prev.gapToLeader != null ? Math.max(0, r.gapToLeader - prev.gapToLeader) : null;
      out.set(norm(r.carNumber), { seconds: sec, laps });
    });
  }
  return out;
}

export type BattleCar = { carNumber: string; name: string; gap: number | null };
export type Battle = { ahead: BattleCar | null; behind: BattleCar | null };

const short = (n: string) => {
  const p = (n || "").trim().split(/\s+/);
  return (p[p.length - 1] || "").toUpperCase();
};

/** Coche de delante y de detrás del coche en pantalla, dentro de su clase. */
export function battleFor(rows: StandingsRow[], carNumber: string | null): Battle {
  const empty: Battle = { ahead: null, behind: null };
  if (!carNumber) return empty;
  const me = rows.find((r) => norm(r.carNumber) === norm(carNumber));
  if (!me) return empty;
  const cls = rows.filter((r) => r.classId === me.classId).sort((a, b) => a.position - b.position);
  const i = cls.findIndex((r) => r === me);
  const gapBetween = (a: StandingsRow, b: StandingsRow) => {
    if (a.lapsDown !== b.lapsDown) return null;
    return a.gapToLeader != null && b.gapToLeader != null ? Math.abs(a.gapToLeader - b.gapToLeader) : null;
  };
  const mk = (r: StandingsRow): BattleCar => ({ carNumber: norm(r.carNumber), name: short(r.driverName), gap: gapBetween(me, r) });
  return { ahead: i > 0 ? mk(cls[i - 1]) : null, behind: i >= 0 && i < cls.length - 1 ? mk(cls[i + 1]) : null };
}

export type Trend = "closing" | "opening" | "flat";

/** Tendencia del hueco entre la muestra más antigua de la ventana y la actual. */
export function gapTrend(samples: { t: number; gap: number }[], now: number, gap: number | null, minDelta = 0.15): Trend {
  if (gap == null) return "flat";
  const ref = samples.find((s) => now - s.t >= 3) ?? null;
  if (!ref) return "flat";
  const d = gap - ref.gap;
  if (d <= -minDelta) return "closing";
  if (d >= minDelta) return "opening";
  return "flat";
}
