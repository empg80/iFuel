import React from "react";

type FuelHistoryPoint = {
  lapNumber: number;
  fuelUsed: number;
};

type FuelHistoryMiniChartProps = {
  history: FuelHistoryPoint[];
};

export const FuelHistoryMiniChart: React.FC<FuelHistoryMiniChartProps> = ({
  history,
}) => {
  if (!history.length) return null;

  const width = 340;
  const height = 40;

  // colores que pegan con tu HUD
  const lineColor = "#6ee7a8"; // verde suave
  const gridColor = "#333";    // gris oscuro
  const textColor = "#aaa";

  const minFuel = Math.min(...history.map((h) => h.fuelUsed));
  const maxFuel = Math.max(...history.map((h) => h.fuelUsed));
  const range = maxFuel - minFuel || 1;
  const stepX = width / Math.max(history.length - 1, 1);

  const points = history.map((h, idx) => {
    const x = idx * stepX;
    const norm = (h.fuelUsed - minFuel) / range;
    const y = height - norm * height;
    return `${x},${y}`;
  });

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 10, color: textColor, marginBottom: 2 }}>
        FUEL (last {history.length} laps)
      </div>
      <svg width={width} height={height}>
        {/* líneas de fondo */}
        {[0.25, 0.5, 0.75].map((frac) => (
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

        {/* curva */}
        <polyline
          fill="none"
          stroke={lineColor}
          strokeWidth={1.2}
          points={points.join(" ")}
        />

        {/* puntos en cada vuelta */}
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

