// iFuel-telemetry-node/pitClearAir.mjs
// Sugiere en qué vuelta entrar a boxes para salir con el menor tráfico posible.

const CLEAR_AIR_SECONDS = 3; // ±3 s alrededor de tu salida cuentan como tráfico

/**
 * Tráfico que encontrarías al salir de boxes si entras `lapsToGo` vueltas más tarde.
 * Tu posición al salir es la que tendrías en pista habiendo perdido `pitDeltaSeconds`;
 * los rivales que siguen rodando avanzan todo el tiempo (rodar + parada).
 */
function trafficAtExit({ lapsToGo, myPct, pitPct, cars, myIdx, baseLapTime, pitDeltaSeconds }) {
  // lapsToGo = vueltas (fraccionarias) hasta pasar por tu box. Con pitPct conocido sales cerca de tu box;
  // sin él (compatibilidad) se usa tu posición actual avanzada ese tiempo.
  const timeUntilPitIn = lapsToGo * baseLapTime;
  const pitExitTime = timeUntilPitIn + pitDeltaSeconds;
  const projectedPct = Number.isFinite(pitPct) && pitPct >= 0
    ? pitPct
    : ((((myPct ?? 0) + timeUntilPitIn / baseLapTime) % 1) + 1) % 1;

  let trafficScore = 0;
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
    if (Math.abs(gapSeconds) <= CLEAR_AIR_SECONDS) trafficScore++;
    if (nearest == null || Math.abs(gapSeconds) < Math.abs(nearest.gapSeconds)) {
      nearest = { carNum: c.carNum ?? null, gapSeconds };
    }
  }
  return { trafficScore, nearest };
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
}) {
  const empty = { suggestedLap: null, options: [], nowScore: null, nowNearest: null };
  if (Array.isArray(passes) && passes.length > 0 && Number.isFinite(baseLapTime) && baseLapTime > 0) {
    const opts = passes.map((p) => {
      const loss = Number.isFinite(p.lossSeconds) && p.lossSeconds > 0 ? p.lossSeconds : pitDeltaSeconds;
      const { trafficScore, nearest } = trafficAtExit({
        lapsToGo: p.lapsToPit, myPct, pitPct, cars, myIdx, baseLapTime, pitDeltaSeconds: loss,
      });
      return { lap: p.lap, trafficScore, nearest, lossSeconds: loss };
    });
    const sorted = [...opts].sort((a, b) => a.trafficScore - b.trafficScore || a.lap - b.lap);
    const first = passes[0];
    const now = trafficAtExit({
      lapsToGo: first.lapsToPit, myPct, pitPct, cars, myIdx, baseLapTime,
      pitDeltaSeconds: opts[0].lossSeconds,
    });
    return {
      suggestedLap: sorted[0].lap,
      options: sorted.slice(0, 3),
      nowScore: now.trafficScore, // si entras en el próximo paso por tu box
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
      lapsToGo, myPct, cars, myIdx, baseLapTime, pitDeltaSeconds,
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
