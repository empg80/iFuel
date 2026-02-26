import React, { useMemo } from "react";
import { FuelHistoryMiniChart } from "./FuelHistoryMiniChart";
import { FuelHistogramMini } from "./FuelHistogramMini";
import type { LapHistoryItem } from "../types/telemetry";
import {
  formatFuel,
  formatFuelDiff,
  formatLapLabel,
  formatLapTime,
  formatTemperatureC,
} from "../utils/format";

type FuelWidgetProps = {
  fuel: number;
  fuelTime: string;
  estLaps: number;
  fuelLast: number;
  fuelAvg: number;
  estRefuel: number;
  fuelLevelRatio: number;
  fuelAvg2: number;
  fuelAvg5: number;
  fuelAvg10: number;
  lapNumber?: number;
  lapTime?: string;
  lapFuel?: number;

  earliestPitLap?: number | null;
  totalStops?: number | null;
  stintLaps?: number[];
  lapHistoryLast5?: LapHistoryItem[];
  lapHistoryLast30?: LapHistoryItem[];

  sessionLabel: string;
  airTemp: number | null;
  trackTemp: number | null;
};

export const FuelWidget = React.memo(function FuelWidget(props: FuelWidgetProps) {
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
  } = props;

  const { ratio, barClass } = useMemo(() => {
    const r = Math.min(1, Math.max(0, fuelLevelRatio));
    let cls = "fuel-bar-fill fuel-bar-orange";
    if (r > 0.5) cls = "fuel-bar-fill fuel-bar-green";
    else if (r < 0.25) cls = "fuel-bar-fill fuel-bar-red";
    return { ratio: r, barClass: cls };
  }, [fuelLevelRatio]);

  const { fuelDiff, text: fuelDiffText } = useMemo(
    () => formatFuelDiff(lapFuel, fuelAvg),
    [lapFuel, fuelAvg],
  );

  const stintLapsText = useMemo(() => {
    if (!stintLaps || stintLaps.length === 0) return "--";
    return stintLaps
      .map((lap, idx) => (idx === 0 ? `L${lap}` : ` · L${lap}`))
      .join("");
  }, [stintLaps]);

  return (
    <div className="fuel-widget">
      {/* Fila: sesión + temperaturas */}
      <div className="fuel-row top">
        <div className="fuel-block">
          <div className="label">SESSION</div>
          <div className="value">{sessionLabel}</div>
        </div>

        <div className="fuel-block right">
          <div className="label">TEMPS</div>
          <div className="value value--align-right">
            <span className="value__temp value__temp--air">
              ☀ {formatTemperatureC(airTemp)}
            </span>
            <span className="value__temp value__temp--track">
              🛣 {formatTemperatureC(trackTemp)}
            </span>
          </div>
        </div>
      </div>

      {/* Fila EST LAPS / FUEL TIME / FUEL */}
      <div className="fuel-row top">
        <div className="fuel-block">
          <div className="label">EST LAPS</div>
          <div className="value">{estLaps.toFixed(1)}</div>
        </div>
        <div className="fuel-block center">
          <div className="label">FUEL TIME</div>
          <div className="value">{fuelTime}</div>
        </div>
        <div className="fuel-block right">
          <div className="label">FUEL</div>
          <div className="value fuel-main">{fuel.toFixed(2)}</div>
        </div>
      </div>

      <div className="fuel-bar">
        <div className={barClass} style={{ width: `${ratio * 100}%` }} />
      </div>

      <div className="fuel-row bottom">
        <div className="fuel-block">
          <div className="label">FUEL LAST</div>
          <div className="value">{formatFuel(fuelLast)}</div>
        </div>
        <div className="fuel-block center">
          <div className="label">FUEL AVG</div>
          <div className="value">{formatFuel(fuelAvg)}</div>
        </div>
        <div className="fuel-block right">
          <div className="label">EST REFUEL</div>
          <div className="value">{estRefuel.toFixed(1)}</div>
        </div>
      </div>

      <div className="fuel-row bottom">
        <div className="fuel-block">
          <div className="label">FUEL AVG 2</div>
          <div className="value">{formatFuel(fuelAvg2)}</div>
        </div>
        <div className="fuel-block center">
          <div className="label">FUEL AVG 5</div>
          <div className="value">{formatFuel(fuelAvg5)}</div>
        </div>
        <div className="fuel-block right">
          <div className="label">FUEL AVG 10</div>
          <div className="value">{formatFuel(fuelAvg10)}</div>
        </div>
      </div>

      <div className="fuel-separator" />

      <div className="fuel-row lap-info">
        <div className="fuel-block">
          <div className="label">LAP</div>
          <div className="value">{formatLapLabel(lapNumber)}</div>
        </div>
        <div className="fuel-block center">
          <div className="label">LAP TIME</div>
          <div className="value">{formatLapTime(lapTime)}</div>
        </div>
        <div className="fuel-block right">
          <div className="label">FUEL LAP</div>
          <div className="value">
            {lapFuel !== undefined ? formatFuel(lapFuel) : "--"}
            {fuelDiff !== undefined && (
              <span
                className={
                  fuelDiff > 0
                    ? "fuel-diff fuel-diff-bad"
                    : "fuel-diff fuel-diff-good"
                }
              >
                {" "}
                ({fuelDiffText})
              </span>
            )}
          </div>
        </div>
      </div>

      {lapHistoryLast5 && lapHistoryLast5.length > 1 && (
        <>
          <div className="fuel-separator" />
          <FuelHistoryMiniChart history={lapHistoryLast5} />
        </>
      )}

      <div className="fuel-separator" />

      <div className="fuel-row strategy-row">
        <div className="fuel-block">
          <div className="label">EARLY PIT</div>
          <div className="value">
            {earliestPitLap != null ? `L${earliestPitLap}` : "--"}
          </div>
        </div>
        <div className="fuel-block center">
          <div className="label">STOPS</div>
          <div className="value">
            {totalStops != null ? totalStops : "--"}
          </div>
        </div>
        <div className="fuel-block right">
          <div className="label">STINTS</div>
          <div className="value">{stintLapsText}</div>
        </div>
      </div>

      {lapHistoryLast30 && lapHistoryLast30.length > 0 && (
        <>
          <div className="fuel-separator" />
          <FuelHistogramMini history={lapHistoryLast30} />
        </>
      )}
    </div>
  );
});


