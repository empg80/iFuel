// iFuel-telemetry-node/pitClearAir.mjs
// Sugiere en qué vuelta entrar a boxes para salir con el menor tráfico posible.

export const DEFAULT_CLEAR_AIR_SECONDS = 3; // ±3 s alrededor de tu salida cuentan como tráfico (ajustable)
// Multiclase: un coche mucho más rápido que viene detrás te alcanzará y uno más lento por delante tendrás que
// adelantarlo, aunque no esté pegado a tu salida. Cuentan la mitad que un coche pegado, si lo encuentras
// dentro de CATCH_LAPS vueltas.
const CATCH_LAPS = 1;
const PACE_DIFF_MIN = 0.01; // diferencia de ritmo mínima (1 %) para considerar "más rápido/lento"
const CATCH_WEIGHT = 0.5;

/**
 * Tráfico que encontrarías al salir de boxes si entras `lapsToGo` vueltas más tarde.
 * Tu posición al salir es la que tendrías en pista habiendo perdido `pitDeltaSeconds`;
 * los rivales que siguen rodando avanzan todo el tiempo (rodar + parada).
 */
function trafficAtExit({ lapsToGo, myPct, pitPct, cars, myIdx, baseLapTime, pitDeltaSeconds, clearAirSeconds = DEFAULT_CLEAR_AIR_SECONDS }) {
  // lapsToGo = vueltas (fraccionarias) hasta pasar por tu box. Con pitPct conocido sales cerca de tu box;
  // sin él (compatibilidad) se usa tu posición actual avanzada ese tiempo.
  const timeUntilPitIn = lapsToGo * baseLapTime;
  const pitExitTime = timeUntilPitIn + pitDeltaSeconds;
  const projectedPct = Number.isFinite(pitPct) && pitPct >= 0
    ? pitPct
    : ((((myPct ?? 0) + timeUntilPitIn / baseLapTime) % 1) + 1) % 1;

  let direct = 0;
  let fastBehind = 0; // coches más rápidos que te alcanzarán
  let slowAhead = 0; // coches más lentos que tendrás que adelantar
  let nearest = null; // el coche más pegado a tu salida

  for (const c of cars) {
    if (c.idx === myIdx) continue;
    if (!Number.isFinite(c.pct) || c.pct < 0) continue; // -1 = no está en el mundo (garaje, desconectado)
    if (c.onPit) continue; // parado o circulando por boxes: no es tráfico en pista

    const targetLapTime =
      c.lastLap > 0 ? c.lastLap : c.bestLap > 0 ? c.bestLap : baseLapTime;
    if (!Number.isFinite(targetLapTime) || targetLapTime <= 0) continue;

    const projectedPctOther = (c.pct + pitExitTime / targetLapTime) % 1;
    let dPct = projectedPctOther - projectedPct;
    if (dPct > 0.5) dPct -= 1;
    if (dPct < -0.5) dPct += 1;

    const gapSeconds = dPct * baseLapTime; // + = el rival queda por delante de tu salida
    if (Math.abs(gapSeconds) <= clearAirSeconds) {
      direct++;
    } else {
      // Ritmo de cada coche: mejor vuelta (limpia) si existe, si no la última
      const theirPace = c.bestLap > 0 ? c.bestLap : c.lastLap > 0 ? c.lastLap : null;
      if (theirPace != null) {
        const delta = baseLapTime - theirPace; // + = él es más rápido que tú
        if (delta > baseLapTime * PACE_DIFF_MIN && gapSeconds < 0 && -gapSeconds <= delta * CATCH_LAPS) fastBehind++;
        else if (-delta > baseLapTime * PACE_DIFF_MIN && gapSeconds > 0 && gapSeconds <= -delta * CATCH_LAPS) slowAhead++;
      }
    }
    if (nearest == null || Math.abs(gapSeconds) < Math.abs(nearest.gapSeconds)) {
      nearest = { carNum: c.carNum ?? null, gapSeconds };
    }
  }
  const weighted = direct + CATCH_WEIGHT * (fastBehind + slowAhead);
  return { trafficScore: Math.ceil(weighted), weighted, direct, fastBehind, slowAhead, nearest };
}

export function computePitClearAirSuggestion({
  myLap,
  myPct,
  cars,
  myIdx,
  baseLapTime,
  pitPct = null,
  passes = null, // [{lap, lapsToPit, lossSeconds?}] de pitWindow.mjs; si no, se usa pitWindowStartLap..EndLap
  pitWindowStartLap,
  pitWindowEndLap,
  pitDeltaSeconds,
  // info de fuel / carrera
  lapsRemainForRace,
  maxStintLapsFromFull,
  clearAirSeconds = DEFAULT_CLEAR_AIR_SECONDS,
}) {
  const empty = { suggestedLap: null, options: [], nowScore: null, nowNearest: null };
  if (Array.isArray(passes) && passes.length > 0 && Number.isFinite(baseLapTime) && baseLapTime > 0) {
    const opts = passes.map((p) => {
      const loss = Number.isFinite(p.lossSeconds) && p.lossSeconds > 0 ? p.lossSeconds : pitDeltaSeconds;
      const { trafficScore, weighted, direct, fastBehind, slowAhead, nearest } = trafficAtExit({
        lapsToGo: p.lapsToPit, myPct, pitPct, cars, myIdx, baseLapTime, pitDeltaSeconds: loss, clearAirSeconds,
      });
      return { lap: p.lap, trafficScore, weighted, direct, fastBehind, slowAhead, nearest, lossSeconds: loss };
    });
    const sorted = [...opts].sort((a, b) => a.weighted - b.weighted || a.lap - b.lap);
    const first = passes[0];
    const now = trafficAtExit({
      lapsToGo: first.lapsToPit, myPct, pitPct, cars, myIdx, baseLapTime,
      pitDeltaSeconds: opts[0].lossSeconds, clearAirSeconds,
    });
    return {
      suggestedLap: sorted[0].lap,
      options: sorted.slice(0, 3),
      all: opts.map((o) => ({ lap: o.lap, weighted: o.weighted, trafficScore: o.trafficScore, direct: o.direct,
        fastBehind: o.fastBehind, slowAhead: o.slowAhead, nearest: o.nearest, lossSeconds: o.lossSeconds })),
      nowScore: now.trafficScore, // si entras en el próximo paso por tu box
      nowFastBehind: now.fastBehind,
      nowSlowAhead: now.slowAhead,
      nowNearest: now.nearest,
      nextPitLap: first.lap,
    };
  }
  if (
    !Number.isFinite(pitWindowStartLap) ||
    !Number.isFinite(pitWindowEndLap) ||
    pitWindowEndLap < pitWindowStartLap ||
    !Number.isFinite(baseLapTime) ||
    baseLapTime <= 0 ||
    !Number.isFinite(pitDeltaSeconds) ||
    pitDeltaSeconds <= 0
  ) {
    return empty;
  }

  const options = [];

  for (let lapTarget = pitWindowStartLap; lapTarget <= pitWindowEndLap; lapTarget++) {
    const lapsToGo = lapTarget - myLap;
    if (lapsToGo < 0) continue; // ventana ya pasada para esa vuelta

    // Filtro de combustible: si aun llenando no llegas a meta, descartamos esta vuelta
    if (
      lapsRemainForRace != null &&
      lapsRemainForRace > 0 &&
      maxStintLapsFromFull != null &&
      maxStintLapsFromFull > 0 &&
      lapsRemainForRace - lapsToGo > maxStintLapsFromFull
    ) {
      continue;
    }

    const { trafficScore, nearest } = trafficAtExit({
      lapsToGo, myPct, cars, myIdx, baseLapTime, pitDeltaSeconds, clearAirSeconds,
    });
    options.push({ lap: lapTarget, trafficScore, nearest });
  }

  options.sort((a, b) => a.trafficScore - b.trafficScore || a.lap - b.lap);
  const suggestedLap = options.length > 0 ? options[0].lap : null;

  // Qué pasaría si entras en esta misma vuelta, para poder decir "ahora sí" o "espera"
  const now = trafficAtExit({ lapsToGo: 0, myPct, cars, myIdx, baseLapTime, pitDeltaSeconds });

  return {
    suggestedLap,
    options: options.slice(0, 3),
    nowScore: now.trafficScore,
    nowNearest: now.nearest,
  };
}
