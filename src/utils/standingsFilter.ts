// Recorte de la tabla de standings: los N primeros de cada clase y, si no estás entre ellos,
// los coches de tu clase que tienes justo delante y detrás. Solo sintaxis TS borrable (se testea con Node).

export type FilterableRow = { position: number; carNumber: string; classId: number };

export type StandingsItem<T extends FilterableRow> =
  | { kind: "row"; row: T }
  | { kind: "gap"; hidden: number };

export function filterStandings<T extends FilterableRow>(
  rows: T[],
  myCarNumber: string | null | undefined,
  opts: { topPerClass?: number; around?: number } = {},
): StandingsItem<T>[] {
  const topPerClass = opts.topPerClass ?? 10;
  const around = opts.around ?? 3;
  const sorted = [...rows].sort((a, b) => a.position - b.position);

  const keep = new Set<string>();
  const byClass = new Map<number, T[]>();
  for (const r of sorted) {
    const list = byClass.get(r.classId) ?? [];
    list.push(r);
    byClass.set(r.classId, list);
  }
  for (const list of byClass.values()) {
    list.slice(0, topPerClass).forEach((r) => keep.add(r.carNumber));
  }

  const me = myCarNumber ? sorted.find((r) => r.carNumber === myCarNumber) : undefined;
  if (me) {
    const mine = byClass.get(me.classId) ?? [];
    const idx = mine.findIndex((r) => r.carNumber === me.carNumber);
    if (idx >= topPerClass) {
      for (let i = Math.max(0, idx - around); i <= Math.min(mine.length - 1, idx + around); i++) {
        keep.add(mine[i].carNumber);
      }
    }
  }

  const out: StandingsItem<T>[] = [];
  let hidden = 0;
  for (const r of sorted) {
    if (keep.has(r.carNumber)) {
      if (hidden > 0 && out.length > 0) out.push({ kind: "gap", hidden });
      hidden = 0;
      out.push({ kind: "row", row: r });
    } else {
      hidden++;
    }
  }
  return out;
}
