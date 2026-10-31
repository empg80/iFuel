// PitClearAirWidget.tsx
// Diseño "una frase grande + el porqué": qué hacer con la parada, el tráfico que encontrarás al salir
// de boxes y cómo se reparten las vueltas de la ventana.
import type { PitClearAirData, PitClearAirNearest } from "../types/pit";

type Tone = "go" | "wait" | "bad" | "info" | "idle";

type PitClearAirWidgetProps = {
  data: PitClearAirData | undefined;
  lapNumber: number | null;
  pitWindowStartLap: number | null;
  pitWindowEndLap: number | null;
};

const EXIT_RANGE_S = 6; // la barra de salida cubre ±6 s; la zona de aire limpio es ±3 s

function toneForScore(score: number | null | undefined): Tone {
  if (score == null) return "idle";
  return score === 0 ? "go" : score === 1 ? "wait" : "bad";
}

function carsPhrase(n: number): string {
  return n === 0 ? "clear air" : `${n} ${n === 1 ? "car" : "cars"} within ±3 s`;
}

// Desglose del tráfico: pegados a tu salida + (multiclase) más rápidos que te alcanzan y más lentos que adelantarás
function breakdown(o: { trafficScore: number; direct?: number; fastBehind?: number; slowAhead?: number } | undefined): string {
  if (!o || o.trafficScore === 0) return "clear air";
  if (o.direct == null && o.fastBehind == null && o.slowAhead == null) return carsPhrase(o.trafficScore);
  const parts: string[] = [];
  if (o.direct) parts.push(`${o.direct} ${o.direct === 1 ? "car" : "cars"} at your exit`);
  if (o.fastBehind) parts.push(`${o.fastBehind} faster ${o.fastBehind === 1 ? "car" : "cars"} closing`);
  if (o.slowAhead) parts.push(`${o.slowAhead} slower ${o.slowAhead === 1 ? "car" : "cars"} to pass`);
  return parts.join(", ");
}

function nearestPhrase(n: PitClearAirNearest | undefined): string {
  if (!n) return "";
  const sign = n.gapSeconds >= 0 ? "+" : "−";
  return ` #${n.carNum ?? "?"} ${sign}${Math.abs(n.gapSeconds).toFixed(1)} s.`;
}

function leftPercent(gap: number): number {
  const clamped = Math.max(-EXIT_RANGE_S, Math.min(EXIT_RANGE_S, gap));
  return 50 + (clamped / EXIT_RANGE_S) * 49;
}

export const PitClearAirWidget = ({
  data,
  lapNumber,
  pitWindowStartLap,
  pitWindowEndLap,
}: PitClearAirWidgetProps) => {
  const hasWindow =
    pitWindowStartLap != null && pitWindowEndLap != null && pitWindowEndLap >= pitWindowStartLap;
  const windowLabel = hasWindow ? `Window L${pitWindowStartLap}–L${pitWindowEndLap}` : "Window --";
  const loss =
    data?.pitLossSeconds != null
      ? `LOSS ${Math.round(data.pitLossSeconds)} s · ${data.pitLossMeasured ? "MEASURED" : "ESTIMATE"}`
      : null;
  const add =
    data?.litersNeeded != null && data.litersNeeded > 0 ? `Add ${Math.round(data.litersNeeded)} L` : "";

  let tone: Tone = "idle";
  let badge = "…";
  let headline = "WAITING FOR WINDOW";
  let sub = "Pit window not open yet.";
  let showExit = false;
  let exitCar: PitClearAirNearest | undefined;
  let exitCars: { num: string; gap: number; tone: Tone }[] = [];
  let laps: { lap: number; score: number }[] = [];
  let pick: number | null = null;
  let footLeft = windowLabel;
  let footRight = add;

  if (data?.windowStatus === "no-stop") {
    tone = "info"; badge = "OK"; headline = "NO STOP NEEDED";
    sub = "Your fuel reaches the finish with the safety margin.";
    footRight = "";
  } else if (data?.windowStatus === "critical") {
    tone = "bad"; badge = "!"; headline = "FUEL CRITICAL";
    sub = "Box at the next pit entry. Fuel does not reach another lap.";
    footLeft = ""; footRight = "";
  } else if (data && data.suggestedLap) {
    const { suggestedLap, options, nowScore, nowNearest } = data;
    const currentLap = lapNumber ?? 0;
    const refLap = data.nextPitLap ?? currentLap;
    const diff = suggestedLap - refLap;
    const chosen = options.find((o) => o.lap === suggestedLap);
    const score = chosen?.trafficScore ?? nowScore ?? 0;
    laps = options.map((o) => ({ lap: o.lap, score: o.trafficScore })).sort((a, b) => a.lap - b.lap);
    pick = suggestedLap;
    showExit = true;

    if (diff <= 0) {
      const next = refLap > currentLap && currentLap > 0;
      tone = toneForScore(score);
      badge = score === 0 ? "GO" : String(score);
      headline = next ? "BOX NEXT LAP" : "BOX NOW";
      exitCar = nowNearest ?? chosen?.nearest ?? undefined;
      sub = score === 0
        ? `Clear air at exit.${nearestPhrase(exitCar) ? " Nearest" + nearestPhrase(exitCar) : ""}`
        : `${breakdown(chosen ?? { trafficScore: score })}.${nearestPhrase(exitCar)}`;
    } else {
      tone = "wait";
      badge = String(diff);
      headline = `WAIT ${diff} ${diff === 1 ? "LAP" : "LAPS"}`;
      exitCar = chosen?.nearest ?? undefined;
      sub = `Now: ${carsPhrase(nowScore ?? 0)} of your exit. L${suggestedLap} is the best option.`;
    }
    if (exitCar && exitCar.gapSeconds != null) {
      exitCars = [{ num: String(exitCar.carNum ?? "?"), gap: exitCar.gapSeconds, tone: toneForScore(score) }];
    }
    if (data.windowStatus === "extra-stop") {
      tone = "wait"; badge = "+1"; headline = "EXTRA STOP";
      sub = "One refuel will not reach the finish. Plan two stops.";
      showExit = false;
    }
  }

  const showLaps = laps.length > 0;

  return (
    <div className="pca" data-tone={tone}>
      <div className="pca__top">
        <span className="pca__title"><i className="pca__dot" />PIT CLEAR AIR</span>
        {loss && <span className="pca__pill">{loss}</span>}
      </div>

      <div className="pca__main">
        <div className="pca__badge">{badge}</div>
        <div className="pca__text">
          <div className="pca__headline">{headline}</div>
          <div className="pca__sub">{sub}</div>
        </div>
      </div>

      {showExit && (
        <div className="pca__exit">
          <div className="pca__exit-labels"><span>BEHIND</span><span>YOUR EXIT</span><span>AHEAD</span></div>
          <div className="pca__exit-bar">
            <div className="pca__exit-zone" />
            <div className="pca__exit-me" />
            {exitCars.map((c) => (
              <div key={c.num} className="pca__car" data-tone={c.tone} style={{ left: `${leftPercent(c.gap)}%` }}>
                #{c.num}
              </div>
            ))}
          </div>
          <div className="pca__exit-scale"><span>−6 s</span><span>±3 s = clear air zone</span><span>+6 s</span></div>
        </div>
      )}

      {showLaps && (
        <div className="pca__laps">
          {laps.map((l) => (
            <div key={l.lap} className="pca__lap" data-sel={l.lap === pick ? "1" : "0"} data-tone={toneForScore(l.score)}>
              <div className="pca__bar" style={{ height: 14 + (3 - Math.min(l.score, 3)) * 10 + (l.score === 0 ? 8 : 0) }} />
              <span className="pca__lap-label">L{l.lap}</span>
            </div>
          ))}
        </div>
      )}

      {(footLeft || footRight) && (
        <div className="pca__foot"><span>{footLeft}</span><span>{footRight}</span></div>
      )}
    </div>
  );
};
