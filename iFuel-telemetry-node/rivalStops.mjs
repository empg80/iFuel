// iFuel-telemetry-node/rivalStops.mjs
// C1: qué rivales van a parar en tu misma ventana de parada. Con la duración de sus stints anteriores (o la de la clase,
// o la tuya con el depósito lleno si aún no han parado) se estima en cuántas vueltas les toca entrar.

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * @param rows    [{carNumber, classId, position, stintLapCount, completedStints[], inPit}]
 * @param myCarNumber, myClassId
 * @param myStintLaps   vueltas que aguantas con el depósito lleno (fuelMax / consumo), o null
 * @param lapsToWindowStart, lapsToWindowEnd  vueltas hasta abrir/cerrar TU ventana de parada
 * @returns {{ stintLapsByClass: Record<string, number>, inWindow: Array, windowLaps: number[] } | null}
 */
export function estimateRivalStops({ rows, myCarNumber, myClassId, myStintLaps, lapsToWindowStart, lapsToWindowEnd, limit = 6 }) {
  if (!Array.isArray(rows) || !Number.isFinite(lapsToWindowStart) || !Number.isFinite(lapsToWindowEnd)) return null;
  const byClass = new Map();
  for (const r of rows) {
    if (!byClass.has(r.classId)) byClass.set(r.classId, []);
    byClass.get(r.classId).push(...(r.completedStints ?? []));
  }
  const classStint = new Map();
  for (const [cid, list] of byClass) {
    const m = median(list);
    if (m != null) classStint.set(cid, m);
  }
  if (!classStint.has(myClassId) && Number.isFinite(myStintLaps) && myStintLaps > 0) classStint.set(myClassId, myStintLaps);

  const inWindow = [];
  for (const r of rows) {
    if (String(r.carNumber) === String(myCarNumber)) continue;
    if (r.inPit) continue;
    const own = r.completedStints?.length ? r.completedStints[r.completedStints.length - 1] : null;
    const stint = own ?? classStint.get(r.classId) ?? null;
    if (stint == null || !Number.isFinite(r.stintLapCount)) continue;
    const lapsToStop = Math.round(stint - r.stintLapCount);
    // dentro de tu ventana (con una vuelta de margen por cada lado)
    if (lapsToStop >= lapsToWindowStart - 1 && lapsToStop <= lapsToWindowEnd + 1) {
      inWindow.push({
        carNumber: String(r.carNumber), classId: r.classId, position: r.position,
        lapsToStop: Math.max(0, lapsToStop), sameClass: r.classId === myClassId,
        known: own != null, // true = por su stint anterior; false = estimado por la clase
      });
    }
  }
  inWindow.sort((a, b) => a.lapsToStop - b.lapsToStop || a.position - b.position);
  return {
    stintLapsByClass: Object.fromEntries([...classStint].map(([k, v]) => [String(k), Math.round(v)])),
    inWindow: inWindow.slice(0, limit),
    total: inWindow.length,
    windowLaps: [lapsToWindowStart, lapsToWindowEnd],
  };
}
