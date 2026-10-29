// PitClearAirWidget.tsx
import type { PitClearAirData, PitClearAirNearest } from "../types/pit";

function describeNearest(n: PitClearAirNearest | undefined): string {
  if (!n) return "";
  const sign = n.gapSeconds >= 0 ? "+" : "-";
  return ` · #${n.carNum ?? "?"} ${sign}${Math.abs(n.gapSeconds).toFixed(1)}s`;
}

function carsText(n: number): string {
  return n === 0 ? "clear air" : `${n} ${n === 1 ? "car" : "cars"} ±3s`;
}

type PitClearAirWidgetProps = {
  data: PitClearAirData | undefined;
  lapNumber: number | null;
  pitWindowStartLap: number | null;
  pitWindowEndLap: number | null;
};

export const PitClearAirWidget = ({
  data,
  lapNumber,
  pitWindowStartLap,
  pitWindowEndLap,
}: PitClearAirWidgetProps) => {
  const hasWindow =
    pitWindowStartLap != null &&
    pitWindowEndLap != null &&
    pitWindowEndLap >= pitWindowStartLap;

  const windowLabel = hasWindow
    ? `Window: L${pitWindowStartLap}–L${pitWindowEndLap}`
    : "Window: --";

  if (data?.windowStatus === "no-stop") {
    return (
      <div className="fuel-widget pit-clear-air-widget">
        <div className="label">PIT CLEAR AIR</div>
        <div className="value">No stop needed</div>
        <div className="pit-clear-air-widget__window">Fuel reaches the finish</div>
      </div>
    );
  }

  if (!data || !data.suggestedLap) {
    return (
      <div className="fuel-widget pit-clear-air-widget">
        <div className="label">PIT CLEAR AIR</div>
        <div className="value">Waiting for window…</div>
        <div className="pit-clear-air-widget__window">{windowLabel}</div>
      </div>
    );
  }

  const { suggestedLap, options, nowScore, nowNearest, pitLossSeconds, pitLossMeasured } = data;

  const currentLap = lapNumber ?? 0;
  // Con la ventana del servidor, la referencia es tu próximo paso por boxes (puede ser la vuelta siguiente)
  const refLap = data.nextPitLap ?? currentLap;
  const diff = suggestedLap - refLap;
  const entryLabel = refLap > currentLap && currentLap > 0 ? "BOX NEXT LAP" : "BOX THIS LAP";

  // tamaño de ventana real, si existe
  let windowSize = 0;
  if (pitWindowStartLap != null && pitWindowEndLap != null) {
    windowSize = pitWindowEndLap - pitWindowStartLap + 1;
  }

  // umbral: 30 % de la ventana, mínimo 3 vueltas, fallback 4 si no hay ventana
  const SOON_THRESHOLD =
    windowSize > 0 ? Math.max(3, Math.round(windowSize * 0.3)) : 4;

  let highlightClass = "";
  let highlightLabel = "";

  if (currentLap > 0) {
    if (diff <= 0) {
      highlightClass = "pit-clear-air-widget__highlight--now";
      highlightLabel = entryLabel;
    } else if (diff > 0 && diff <= SOON_THRESHOLD) {
      highlightClass = "pit-clear-air-widget__highlight--soon";
      highlightLabel = `IN ${diff} LAP${diff === 1 ? "" : "S"}`;
    }
  }

  const level =
    highlightClass === "pit-clear-air-widget__highlight--now"
      ? "now"
      : highlightClass === "pit-clear-air-widget__highlight--soon"
        ? "soon"
        : "none";

  const titleStateClass =
    highlightClass === "pit-clear-air-widget__highlight--now"
      ? "pit-clear-air-widget__title--now"
      : highlightClass === "pit-clear-air-widget__highlight--soon"
        ? "pit-clear-air-widget__title--soon"
        : "";

  return (
    <div className="fuel-widget pit-clear-air-widget" data-level={level}>
      <div className={`label ${titleStateClass}`}>PIT CLEAR AIR</div>

      <div className="pit-clear-air-widget__header-row">
        <div className="value fuel-main">Lap {suggestedLap}</div>
        {highlightLabel && (
          <div className={`pit-clear-air-widget__highlight ${highlightClass}`}>
            {highlightLabel}
          </div>
        )}
      </div>

      {nowScore != null && (
        <div className="pit-clear-air-widget__advice">
          {diff <= 0
            ? `Box now: ${carsText(nowScore)} at exit${describeNearest(nowNearest)}`
            : `Box now: ${carsText(nowScore)} at exit${describeNearest(nowNearest)} → wait ${diff} lap${diff === 1 ? "" : "s"}`}
        </div>
      )}

      {data.windowStatus === "extra-stop" && (
        <div className="pit-clear-air-widget__advice">One more stop needed: a single refuel will not reach the finish</div>
      )}
      {data.windowStatus === "critical" && (
        <div className="pit-clear-air-widget__advice">FUEL CRITICAL: box at the next pit entry</div>
      )}

      <div className="pit-clear-air-widget__window">
        {windowLabel}
        {pitLossSeconds != null &&
          ` · loss ${Math.round(pitLossSeconds)}s ${pitLossMeasured ? "(measured)" : "(est.)"}`}
      </div>

      <div className="pit-clear-air-widget__options">
        {options.map((o) => (
          <div
            key={o.lap}
            className={
              "value pit-clear-air-widget__option" +
              (o.lap === suggestedLap
                ? " pit-clear-air-widget__option--selected"
                : "")
            }
          >
            Lap {o.lap}: {carsText(o.trafficScore)}{describeNearest(o.nearest)}
          </div>
        ))}
      </div>
    </div>
  );
};
