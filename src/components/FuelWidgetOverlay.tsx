import React, { useMemo } from "react";
import type { FuelWidgetProps } from "./FuelWidget";
import { FuelHistoryMiniChart } from "./FuelHistoryMiniChart";
import { FuelHistogramMini } from "./FuelHistogramMini";
import { fuelLevel } from "../utils/fuelStatus";
import {
  formatFuel,
  formatFuelDiff,
  formatLapLabel,
  formatLapTime,
  formatTemperatureC,
} from "../utils/format";

export type FuelDetail = "compact" | "full";

type Props = FuelWidgetProps & { detail: FuelDetail };

type Tone = "good" | "bad" | "warn";

function Stat(props: {
  label: string;
  value: string;
  tone?: Tone;
  align?: "left" | "center" | "right";
}) {
  const { label, value, tone, align = "left" } = props;
  return (
    <div className={`fw__stat fw__stat--${align}`}>
      <div className="fw__stat-label">{label}</div>
      <div className={tone ? `fw__stat-value is-${tone}` : "fw__stat-value"}>
        {value}
      </div>
    </div>
  );
}

/**
 * Combustible para el overlay sobre el simulador.
 * Compact: dos cifras grandes (litros y vueltas de combustible), una barra y tres datos.
 * Full: añade medias, vuelta actual, estrategia y minigráficos, con peso visual menor.
 */
export const FuelWidgetOverlay = React.memo(function FuelWidgetOverlay(
  props: Props,
) {
  const {
    fuel,
    fuelTime,
    estLaps,
    fuelLast,
    fuelAvg,
    estRefuel,
    fuelLevelRatio,
    fuelAvg2,
    fuelAvg5,
    fuelAvg10,
    lapNumber,
    lapTime,
    lapFuel,
    earliestPitLap,
    totalStops,
    stintLaps,
    lapHistoryLast5,
    lapHistoryLast30,
    sessionLabel,
    airTemp,
    trackTemp,
    detail,
  } = props;

  const ratio = Math.min(1, Math.max(0, fuelLevelRatio));
  const hasEstimate = fuelAvg > 0;
  const level = fuelLevel({ estLaps, ratio, hasEstimate });
  const needsStop = estRefuel > 0.05;

  const { fuelDiff, text: fuelDiffText } = useMemo(
    () => formatFuelDiff(lapFuel, fuelAvg),
    [lapFuel, fuelAvg],
  );

  const lastTone: Tone | undefined =
    fuelDiff === undefined || !hasEstimate || Math.abs(fuelDiff) < 0.005
      ? undefined
      : fuelDiff > 0
        ? "bad"
        : "good";

  const stintLapsText = useMemo(() => {
    if (!stintLaps || stintLaps.length === 0) return "--";
    return stintLaps.map((lap) => `L${lap}`).join(" · ");
  }, [stintLaps]);

  const dash = (v: number) => (v > 0 ? formatFuel(v, 2) : "--");

  return (
    <div
      className="fuel-widget fw"
      data-level={level}
      data-detail={detail}
      aria-label="Fuel"
    >
      <div className="fw__head">
        <span className="fw__title">FUEL</span>
        <span className="fw__session">{sessionLabel}</span>
      </div>

      <div className="fw__hero">
        <div className="fw__hero-block">
          <div className="fw__big">
            {fuel.toFixed(1)}
            <small>L</small>
          </div>
          <div className="fw__cap">IN TANK</div>
        </div>
        <div className="fw__hero-block fw__hero-block--right">
          <div className="fw__big fw__big--laps">
            {hasEstimate ? estLaps.toFixed(1) : "--"}
          </div>
          <div className="fw__cap">FUEL LAPS</div>
        </div>
      </div>

      <div className="fw__bar">
        <div className="fw__bar-fill" style={{ width: `${ratio * 100}%` }} />
      </div>

      <div className="fw__stats">
        <Stat label="PER LAP" value={dash(fuelAvg)} />
        <Stat
          label="LAST LAP"
          value={fuelLast > 0 ? formatFuel(fuelLast, 2) : "--"}
          tone={lastTone}
          align="center"
        />
        <Stat
          label="TO ADD"
          value={needsStop ? `+${estRefuel.toFixed(1)}` : "0"}
          tone={needsStop ? "warn" : undefined}
          align="right"
        />
      </div>

      {detail === "full" && (
        <div className="fw__more">
          <div className="fw__sep" />
          <div className="fw__grid fw__grid--4">
            <Stat label="FUEL TIME" value={fuelTime} />
            <Stat label="AVG 2" value={dash(fuelAvg2)} align="center" />
            <Stat label="AVG 5" value={dash(fuelAvg5)} align="center" />
            <Stat label="AVG 10" value={dash(fuelAvg10)} align="right" />
          </div>

          <div className="fw__sep" />
          <div className="fw__grid fw__grid--3">
            <Stat label="LAP" value={formatLapLabel(lapNumber)} />
            <Stat label="LAP TIME" value={formatLapTime(lapTime)} align="center" />
            <Stat
              label="FUEL LAP"
              value={
                lapFuel !== undefined
                  ? `${formatFuel(lapFuel, 2)}${fuelDiffText ? ` (${fuelDiffText})` : ""}`
                  : "--"
              }
              tone={lastTone}
              align="right"
            />
          </div>

          {lapHistoryLast5 && lapHistoryLast5.length > 1 && (
            <FuelHistoryMiniChart history={lapHistoryLast5} />
          )}

          <div className="fw__sep" />
          <div className="fw__grid fw__grid--3">
            <Stat
              label="EARLY PIT"
              value={earliestPitLap != null ? `L${earliestPitLap}` : "--"}
            />
            <Stat
              label="STOPS"
              value={totalStops != null ? String(totalStops) : "--"}
              align="center"
            />
            <Stat label="STINTS" value={stintLapsText} align="right" />
          </div>

          {lapHistoryLast30 && lapHistoryLast30.length > 0 && (
            <FuelHistogramMini history={lapHistoryLast30} />
          )}

          <div className="fw__foot">
            AIR {formatTemperatureC(airTemp)} · TRACK {formatTemperatureC(trackTemp)}
          </div>
        </div>
      )}
    </div>
  );
});
