// Fases de la torre de replay: General y una por categoría (si hay más de una clase).
import type { StandingsRow } from "../types/standings";

export type TowerPhase = { key: string; classId: number | null };
export type TowerRow = StandingsRow & { shownPos: number; gapText: string };

export const TOWER_MAX_ROWS = 20;
export const TOWER_PINNED = 3;

export function buildPhases(rows: StandingsRow[]): TowerPhase[] {
  const best = new Map<number, number>();
  for (const r of rows) {
    const p = best.get(r.classId);
    if (p == null || r.position < p) best.set(r.classId, r.position);
  }
  const phases: TowerPhase[] = [{ key: "all", classId: null }];
  if (best.size > 1) {
    [...best.entries()]
      .sort((a, b) => a[1] - b[1])
      .forEach(([classId]) => phases.push({ key: `c${classId}`, classId }));
  }
  return phases;
}

function gapLabel(gap: number | null | undefined, lapsDown: number): string {
  if (lapsDown > 0) return `L${lapsDown}`;
  if (gap == null || !Number.isFinite(gap)) return "--";
  if (gap <= 0.0005) return "Líder";
  if (gap >= 60) {
    const t = Math.round(gap * 10);
    return `+${Math.floor(t / 600)}:${((t % 600) / 10).toFixed(1).padStart(4, "0")}`;
  }
  return `+${gap.toFixed(1)}`;
}

export function phaseRows(rows: StandingsRow[], phase: TowerPhase): TowerRow[] {
  const sorted = [...rows].sort((a, b) => a.position - b.position);
  if (phase.classId == null) {
    return sorted.map((r) => ({
      ...r,
      shownPos: r.position,
      gapText: r.position === sorted[0].position ? "Líder" : gapLabel(r.gapToLeader, r.lapsDown),
    }));
  }
  const cls = sorted.filter((r) => r.classId === phase.classId);
  const lead = cls[0];
  return cls.map((r, i) => ({
    ...r,
    shownPos: i + 1,
    gapText:
      i === 0
        ? "Líder"
        : gapLabel(
            r.gapToLeader != null && lead.gapToLeader != null ? Math.max(0, r.gapToLeader - lead.gapToLeader) : null,
            Math.max(0, r.lapsDown - lead.lapsDown),
          ),
  }));
}

/** Duración de una fase en ms; la de la categoría del coche en pantalla dura 1,5 veces más. */
export function phaseDurationMs(baseS: number, phase: TowerPhase, focusClassId: number | null): number {
  const base = Math.max(3, baseS) * 1000;
  return phase.classId != null && phase.classId === focusClassId ? base * 1.5 : base;
}
