import React from "react";

type FuelHistoryPoint = {
  lapNumber: number;
  fuelUsed: number;
};

type FuelHistogramMiniProps = {
  history: FuelHistoryPoint[];
};

export const FuelHistogramMini: React.FC<FuelHistogramMiniProps> = ({
  history,
}) => {
  if (!history.length) return null;

  const width = 340;
  const height = 40;

  const barGap = 1;
  const barCount = history.length;
  const barWidth = (width - barGap * (barCount - 1)) / barCount;

  const minFuel = Math.min(...history.map((h) => h.fuelUsed));
  const maxFuel = Math.max(...history.map((h) => h.fuelUsed));
  const range = maxFuel - minFuel || 1;

  const avgFuel =
    history.reduce((acc, h) => acc + h.fuelUsed, 0) / history.length;

  const safeThreshold = avgFuel * 1.02;

  const textColor = "#aaa";
  const gridColor = "#333";

  const getBarColor = (value: number) => {
    if (value <= avgFuel * 0.98) return "#22c55e"; // verde
    if (value <= safeThreshold) return "#eab308";  // amarillo
    return "#f97316";                              // naranja/rojo
  };

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 10, color: textColor, marginBottom: 2 }}>
        FUEL HISTOGRAM (last {history.length} laps)
      </div>
      <svg width={width} height={height}>
        {/* línea de media */}
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
          const color = getBarColor(h.fuelUsed);

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
