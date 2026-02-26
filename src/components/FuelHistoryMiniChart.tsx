import type { FuelHistoryPoint } from "../types/telemetry";
import { computeFuelStats } from "../utils/fuelStats";

type FuelHistoryMiniChartProps = {
  history: FuelHistoryPoint[];
};

export const FuelHistoryMiniChart = ({
  history,
}: FuelHistoryMiniChartProps) => {
  if (!history.length) return null;

  const width = 340;
  const height = 40;

  const lineColor = "#6ee7a8";
  const gridColor = "#333";

  const { minFuel, range } = computeFuelStats(history);
  const stepX = width / Math.max(history.length - 1, 1);

  const points = history.map((h, idx) => {
    const x = idx * stepX;
    const norm = (h.fuelUsed - minFuel) / range;
    const y = height - norm * height;
    return `${x},${y}`;
  });

  return (
    <div className="fuel-history-mini">
      <div className="fuel-history-mini__title">
        FUEL (last {history.length} laps)
      </div>
      <svg width={width} height={height}>
        {([0.25, 0.5, 0.75] as const).map((frac) => (
          <line
            key={frac}
            x1={0}
            x2={width}
            y1={height * frac}
            y2={height * frac}
            stroke={gridColor}
            strokeWidth={0.5}
          />
        ))}

        <polyline
          fill="none"
          stroke={lineColor}
          strokeWidth={1.2}
          points={points.join(" ")}
        />

        {history.map((h, idx) => {
          const x = idx * stepX;
          const norm = (h.fuelUsed - minFuel) / range;
          const y = height - norm * height;
          return (
            <circle
              key={h.lapNumber}
              cx={x}
              cy={y}
              r={1.5}
              fill={lineColor}
            />
          );
        })}
      </svg>
    </div>
  );
};
