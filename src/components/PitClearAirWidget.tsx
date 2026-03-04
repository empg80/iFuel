// PitClearAirWidget.tsx
import type { PitClearAirData } from "../types/pit";

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

  if (!data || !data.suggestedLap) {
    return (
      <div className="fuel-widget pit-clear-air-widget">
        <div className="label">PIT CLEAR AIR</div>
        <div className="value">Waiting for window…</div>
        <div className="pit-clear-air-widget__window">{windowLabel}</div>
      </div>
    );
  }

  const { suggestedLap, options } = data;

  const currentLap = lapNumber ?? 0;
  const diff = suggestedLap - currentLap;

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
      highlightLabel = "BOX THIS LAP";
    } else if (diff > 0 && diff <= SOON_THRESHOLD) {
      highlightClass = "pit-clear-air-widget__highlight--soon";
      highlightLabel = `IN ${diff} LAP${diff === 1 ? "" : "S"}`;
    }
  }

  const titleStateClass =
    highlightClass === "pit-clear-air-widget__highlight--now"
      ? "pit-clear-air-widget__title--now"
      : highlightClass === "pit-clear-air-widget__highlight--soon"
        ? "pit-clear-air-widget__title--soon"
        : "";

  return (
    <div className="fuel-widget pit-clear-air-widget">
      <div className={`label ${titleStateClass}`}>PIT CLEAR AIR</div>

      <div className="pit-clear-air-widget__header-row">
        <div className="value fuel-main">Lap {suggestedLap}</div>
        {highlightLabel && (
          <div className={`pit-clear-air-widget__highlight ${highlightClass}`}>
            {highlightLabel}
          </div>
        )}
      </div>

      <div className="pit-clear-air-widget__window">{windowLabel}</div>

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
            Lap {o.lap}: {o.trafficScore} cars ±3s
          </div>
        ))}
      </div>
    </div>
  );
};
