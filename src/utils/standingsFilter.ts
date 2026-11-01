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

export type GroupItem<T extends FilterableRow> =
  | { kind: "row"; row: T; classPos: number }
  | { kind: "gap"; hidden: number };

export type ClassGroup<T extends FilterableRow> = {
  classId: number;
  /** Coches totales de la clase (no solo los mostrados) */
  total: number;
  items: GroupItem<T>[];
};

/**
 * Standings agrupados por clase: la clase del líder general primero y, dentro de cada una, sus 10 primeros
 * y, solo en tu clase y si no estás entre ellos, los 3 de delante y los 3 de detrás con huecos marcados.
 * Cada fila lleva su posición dentro de la clase.
 */
export function groupStandings<T extends FilterableRow>(
  rows: T[],
  myCarNumber: string | null | undefined,
  opts: { topPerClass?: number; around?: number } = {},
): ClassGroup<T>[] {
  const topPerClass = opts.topPerClass ?? 10;
  const around = opts.around ?? 3;
  const sorted = [...rows].sort((a, b) => a.position - b.position);

  const order: number[] = [];
  const byClass = new Map<number, T[]>();
  for (const r of sorted) {
    if (!byClass.has(r.classId)) {
      byClass.set(r.classId, []);
      order.push(r.classId);
    }
    byClass.get(r.classId)!.push(r);
  }

  const me = myCarNumber ? sorted.find((r) => r.carNumber === myCarNumber) : undefined;

  return order.map((classId) => {
    const list = byClass.get(classId)!;
    const keep = new Set<number>();
    for (let i = 0; i < Math.min(topPerClass, list.length); i++) keep.add(i);
    if (me && me.classId === classId) {
      const idx = list.findIndex((r) => r.carNumber === me.carNumber);
      if (idx >= topPerClass) {
        for (let i = Math.max(0, idx - around); i <= Math.min(list.length - 1, idx + around); i++) keep.add(i);
      }
    }
    const items: GroupItem<T>[] = [];
    let hidden = 0;
    list.forEach((row, i) => {
      if (keep.has(i)) {
        if (hidden > 0 && items.length > 0) items.push({ kind: "gap", hidden });
        hidden = 0;
        items.push({ kind: "row", row, classPos: i + 1 });
      } else {
        hidden++;
      }
    });
    return { classId, total: list.length, items };
  });
}
