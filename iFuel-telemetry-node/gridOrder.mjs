// Orden de parrilla a partir de los resultados de clasificación de la sesión (YAML de iRacing).
// Devuelve Map<CarIdx, rango> (menor = más adelantado) o null si no hay resultados.
export function qualifyGridRanks(session) {
  const fromResults = (list) => {
    const rows = (Array.isArray(list) ? list : [])
      .filter((r) => r && Number.isFinite(Number(r.CarIdx)) && Number.isFinite(Number(r.Position)))
      .sort((a, b) => Number(a.Position) - Number(b.Position));
    return rows.length ? new Map(rows.map((r, i) => [Number(r.CarIdx), i])) : null;
  };
  const q = fromResults(session?.QualifyResultsInfo?.Results);
  if (q) return q;
  const sessions = session?.SessionInfo?.Sessions ?? [];
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (/qual/i.test(sessions[i]?.SessionType ?? "")) {
      const r = fromResults(sessions[i].ResultsPositions);
      if (r) return r;
    }
  }
  return null;
}
