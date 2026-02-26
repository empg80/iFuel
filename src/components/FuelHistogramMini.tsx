import type { FuelHistoryPoint } from "../types/telemetry";
import { computeFuelStats, getFuelBarColor } from "../utils/fuelStats";

type FuelHistogramMiniProps = {
  history: FuelHistoryPoint[];
};

export const FuelHistogramMini = ({ history }: FuelHistogramMiniProps) => {
  if (!history.length) return null;

  const width = 340;
  const height = 40;

  const barGap = 1;
  const barCount = history.length;
  const barWidth = (width - barGap * (barCount - 1)) / barCount;

  const { minFuel, avgFuel, range, safeThreshold } = computeFuelStats(history);

  const gridColor = "#333";

  return (
    <div className="fuel-histogram-mini">
      <div className="fuel-histogram-mini__title">
        FUEL HISTOGRAM (last {history.length} laps)
      </div>
      <svg width={width} height={height}>
        <line
          x1={0}
          x2={width}
          y1={height - ((avgFuel - minFuel) / range) * height}
          y2={height - ((avgFuel - minFuel) / range) * height}
          stroke={gridColor}
          strokeWidth={0.5}
          strokeDasharray="2 2"
        />
        {history.map((h, idx) => {
          const x = idx * (barWidth + barGap);
          const norm = (h.fuelUsed - minFuel) / range;
          const barHeight = norm * height;
          const y = height - barHeight;
          const color = getFuelBarColor(h.fuelUsed, avgFuel, safeThreshold);

          return (
            <rect
              key={h.lapNumber}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={color}
            />
          );
        })}
      </svg>
    </div>
  );
};
