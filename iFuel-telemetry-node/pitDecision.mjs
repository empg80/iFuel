// iFuel-telemetry-node/pitDecision.mjs
// Estabiliza la recomendación de Pit Clear Air. El tráfico cambia en cada lectura (4 Hz) y la vuelta "mejor"
// saltaba de "BOX AHORA" a "ESPERA 2 VUELTAS" con una diferencia mínima. Criterio:
//  1) Cada vuelta candidata se suaviza en el tiempo (media móvil de su tráfico ponderado).
//  2) La vuelta recomendada solo cambia si otra es mejor por >= SWITCH_MARGIN coches de forma sostenida
//     durante SWITCH_HOLD_MS.
//  3) Cuando la vuelta recomendada es la del próximo paso por boxes y estás a menos de LOCK_LAPS de la entrada,
//     la decisión se bloquea (si dice BOX, se mantiene hasta que entres o pases de largo).

const EMA_ALPHA = 0.2;
const SWITCH_MARGIN = 1.0;
const SWITCH_HOLD_MS = 6000;
const LOCK_LAPS = 0.2;

export function createPitDecisionStabilizer() {
  let ema = new Map(); // vuelta -> tráfico ponderado suavizado
  let committed = null;
  let candidate = null; // { lap, since }

  const reset = () => { ema = new Map(); committed = null; candidate = null; };

  function stabilize(pca, { nowMs = Date.now(), lapsToNextPit = null } = {}) {
    if (!pca || !Array.isArray(pca.all) || pca.all.length === 0) { reset(); return pca; }
    const laps = new Set(pca.all.map((o) => o.lap));
    for (const k of [...ema.keys()]) if (!laps.has(k)) ema.delete(k);
    for (const o of pca.all) {
      const prev = ema.get(o.lap);
      ema.set(o.lap, prev == null ? o.weighted : prev + EMA_ALPHA * (o.weighted - prev));
    }
    const sm = (lap) => ema.get(lap) ?? Infinity;
    const bestLap = [...pca.all].sort((a, b) => sm(a.lap) - sm(b.lap) || a.lap - b.lap)[0].lap;

    const nextLap = pca.nextPitLap ?? pca.all[0].lap;
    const locked = committed != null && committed === nextLap && lapsToNextPit != null && lapsToNextPit <= LOCK_LAPS;

    if (committed == null || !laps.has(committed)) {
      committed = bestLap; candidate = null;
    } else if (!locked && bestLap !== committed) {
      if (sm(committed) - sm(bestLap) >= SWITCH_MARGIN) {
        if (candidate?.lap !== bestLap) candidate = { lap: bestLap, since: nowMs };
        if (nowMs - candidate.since >= SWITCH_HOLD_MS) { committed = bestLap; candidate = null; }
      } else candidate = null;
    } else candidate = null;

    const view = (o) => ({ ...o, weighted: sm(o.lap), trafficScore: Math.round(sm(o.lap)) });
    const chosen = pca.all.find((o) => o.lap === committed);
    const others = pca.all.filter((o) => o.lap !== committed).map(view)
      .sort((a, b) => a.weighted - b.weighted || a.lap - b.lap).slice(0, 2);
    return { ...pca, suggestedLap: committed, options: [view(chosen), ...others], locked };
  }

  return { stabilize, reset };
}
