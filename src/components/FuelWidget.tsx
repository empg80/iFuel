import React, { useMemo } from "react";
import { FuelHistoryMiniChart } from "./FuelHistoryMiniChart";
import { FuelHistogramMini } from "./FuelHistogramMini";

type LapHistoryItem = {
  lapNumber: number;
  fuelUsed: number;
};

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

export const FuelWidget: React.FC<FuelWidgetProps> = React.memo(function FuelWidget(
  props,
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
  } = props;

  // Normalización del ratio y clase de color de la barra
  const { ratio, barClass } = useMemo(() => {
    const r = Math.min(1, Math.max(0, fuelLevelRatio));
    let cls = "fuel-bar-fill fuel-bar-orange";
    if (r > 0.5) cls = "fuel-bar-fill fuel-bar-green";
    else if (r < 0.25) cls = "fuel-bar-fill fuel-bar-red";
    return { ratio: r, barClass: cls };
  }, [fuelLevelRatio]);

  // Diferencia de fuel de la vuelta actual vs media
  const { fuelDiff, fuelDiffText } = useMemo(() => {
    if (lapFuel === undefined) {
      return { fuelDiff: undefined as number | undefined, fuelDiffText: "" };
    }
    const diff = lapFuel - fuelAvg;
    const text = `${diff > 0 ? "+" : ""}${diff.toFixed(3)}`;
    return { fuelDiff: diff, fuelDiffText: text };
  }, [lapFuel, fuelAvg]);

  // Texto de stint laps (para evitar recrear el array en cada render)
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
          <div className="value" style={{ textAlign: "right" }}>
            <span style={{ marginRight: 6 }}>
              ☀ {airTemp !== null ? `${airTemp.toFixed(1)}°C` : "--"}
            </span>
            <span>
              🛣 {trackTemp !== null ? `${trackTemp.toFixed(1)}°C` : "--"}
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
          <div className="value">{fuel.toFixed(2)}</div>
        </div>
      </div>

      <div className="fuel-bar">
        <div className={barClass} style={{ width: `${ratio * 100}%` }} />
      </div>

      <div className="fuel-row bottom">
        <div className="fuel-block">
          <div className="label">FUEL LAST</div>
          <div className="value">{fuelLast.toFixed(3)}</div>
        </div>
        <div className="fuel-block center">
          <div className="label">FUEL AVG</div>
          <div className="value">{fuelAvg.toFixed(3)}</div>
        </div>
        <div className="fuel-block right">
          <div className="label">EST REFUEL</div>
          <div className="value">{estRefuel.toFixed(1)}</div>
        </div>
      </div>

      <div className="fuel-row bottom">
        <div className="fuel-block">
          <div className="label">FUEL AVG 2</div>
          <div className="value">{fuelAvg2.toFixed(3)}</div>
        </div>
        <div className="fuel-block center">
          <div className="label">FUEL AVG 5</div>
          <div className="value">{fuelAvg5.toFixed(3)}</div>
        </div>
        <div className="fuel-block right">
          <div className="label">FUEL AVG 10</div>
          <div className="value">{fuelAvg10.toFixed(3)}</div>
        </div>
      </div>

      <div className="fuel-separator" />

      <div className="fuel-row lap-info">
        <div className="fuel-block">
          <div className="label">LAP</div>
          <div className="value">
            {lapNumber !== undefined ? `L${lapNumber}` : "--"}
          </div>
        </div>
        <div className="fuel-block center">
          <div className="label">LAP TIME</div>
          <div className="value">{lapTime ?? "--:--.---"}</div>
        </div>
        <div className="fuel-block right">
          <div className="label">FUEL LAP</div>
          <div className="value">
            {lapFuel !== undefined ? lapFuel.toFixed(3) : "--"}
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

      {/* Histograma (últimas 30 vueltas) */}
      {lapHistoryLast30 && lapHistoryLast30.length > 0 && (
        <>
          <div className="fuel-separator" />
          <FuelHistogramMini history={lapHistoryLast30} />
        </>
      )}
    </div>
  );
});
