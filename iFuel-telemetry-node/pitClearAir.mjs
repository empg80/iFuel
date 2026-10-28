// --------- Pit Clear Air helper ---------
export function computePitClearAirSuggestion({
  myLap,
  myPct,
  cars,
  myIdx,
  baseLapTime,
  pitWindowStartLap,
  pitWindowEndLap,
  pitDeltaSeconds,

  //  info de fuel / carrera
  lapsRemainForRace,
  maxStintLapsFromFull,
}) {
  if (
    !Number.isFinite(pitWindowStartLap) ||
    !Number.isFinite(pitWindowEndLap) ||
    pitWindowEndLap < pitWindowStartLap ||
    !Number.isFinite(baseLapTime) ||
    baseLapTime <= 0 ||
    !Number.isFinite(pitDeltaSeconds) ||
    pitDeltaSeconds <= 0
  ) {
    return { suggestedLap: null, options: [] };
  }

  const options = [];

  for (let lapTarget = pitWindowStartLap; lapTarget <= pitWindowEndLap; lapTarget++) {
    const lapsToGo = lapTarget - myLap;
    if (lapsToGo < 0) continue; // ventana ya pasada para esa vuelta

    // ---------- FILTRO DE FUEL ----------
    if (
      lapsRemainForRace != null &&
      lapsRemainForRace > 0 &&
      maxStintLapsFromFull != null &&
      maxStintLapsFromFull > 0
    ) {
      // Vueltas que quedarían desde la parada hasta meta
      const lapsAfterStop = lapsRemainForRace - lapsToGo;

      // Si aun llenando no llegas a meta, descartamos esta vuelta
      if (lapsAfterStop > maxStintLapsFromFull) {
        continue;
      }
    }
    // ------------------------------------

    const timeUntilPitIn = lapsToGo * baseLapTime;
    const pitExitTime = timeUntilPitIn + pitDeltaSeconds;

    // Posición propia al salir de boxes, medida sobre la pista: yo me muevo solo durante
    // el tiempo que ruedo antes de entrar; el tiempo perdido en la parada (pitDeltaSeconds)
    // me deja atrás respecto a los coches que no paran, que sí avanzan pitExitTime.
    const lapsGained = timeUntilPitIn / baseLapTime;
    const projectedPct = (((myPct ?? 0) + lapsGained) % 1 + 1) % 1;

    let trafficScore = 0;
    const timeWindow = 3; // ±3 s de “aire limpio”

    for (const c of cars) {
      if (c.idx === myIdx) continue;
      if (!Number.isFinite(c.pct)) continue;

      const targetLapTime =
        c.lastLap > 0 ? c.lastLap :
        c.bestLap > 0 ? c.bestLap :
        baseLapTime;

      if (!Number.isFinite(targetLapTime) || targetLapTime <= 0) continue;

      const lapsGainedOther = pitExitTime / targetLapTime;
      const projectedPctOther = (c.pct + lapsGainedOther) % 1;

      let dPct = projectedPctOther - projectedPct;
      if (dPct > 0.5) dPct -= 1;
      if (dPct < -0.5) dPct += 1;

      const gapSeconds = dPct * baseLapTime;
      if (Math.abs(gapSeconds) <= timeWindow) {
        trafficScore++;
      }
    }

    options.push({ lap: lapTarget, trafficScore });
  }

  options.sort((a, b) => a.trafficScore - b.trafficScore || a.lap - b.lap);
  const suggestedLap = options.length > 0 ? options[0].lap : null;

  return {
    suggestedLap,
    options: options.slice(0, 3),
  };
}
