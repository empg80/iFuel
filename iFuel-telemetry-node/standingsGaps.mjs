// Vueltas de desventaja y hueco en segundos de cada coche respecto al líder, para la torre de clasificación.
//
// Antes se calculaba con la diferencia de % de vuelta normalizada a (-0.5, 0.5] y el tiempo de vuelta
// del JUGADOR: un coche a 0,6 vueltas del líder salía como si fuera 0,4 vueltas por DELANTE (hueco
// negativo) y, en el replay, el tiempo de vuelta era el del coche propio, no el del líder.
//
//   cars   [{ idx, pos, lap, pct }]  solo coches con posición válida (> 0)
//   refLapTime  tiempo de vuelta de referencia (s) para convertir fracción de vuelta en segundos:
//               normalmente la última vuelta del líder; 0/undefined = no convertir
//
// Devuelve Map<idx, { lapsDown, gapSeconds }>; gapSeconds es null si no se puede dar un valor fiable.
export function computeStandingsGaps(cars, refLapTime) {
  const out = new Map();
  const valid = cars.filter((c) => c && c.pos > 0 && Number.isFinite(c.lap) && Number.isFinite(c.pct));
  if (valid.length === 0) return out;

  const progress = (c) => c.lap + c.pct;
  // Líder = P1 oficial; si no aparece, el coche con más progreso
  const leader =
    valid.find((c) => c.pos === 1) ??
    valid.reduce((best, c) => (progress(c) > progress(best) ? c : best), valid[0]);
  const leaderProgress = progress(leader);

  for (const c of valid) {
    if (c.idx === leader.idx) {
      out.set(c.idx, { lapsDown: 0, gapSeconds: 0 });
      continue;
    }
    const deficit = leaderProgress - progress(c);
    if (deficit < 0) {
      // por delante del P1 en pista (p. ej. el líder está entrando a boxes): sin hueco fiable
      out.set(c.idx, { lapsDown: 0, gapSeconds: null });
      continue;
    }
    const lapsDown = Math.floor(deficit + 1e-6);
    const frac = deficit - lapsDown;
    const gapSeconds = refLapTime > 0 ? Math.max(0, frac) * refLapTime : null;
    out.set(c.idx, { lapsDown, gapSeconds });
  }
  return out;
}
