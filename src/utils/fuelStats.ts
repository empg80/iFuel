import type { FuelHistoryPoint } from "../types/telemetry";

export function computeFuelStats(history: FuelHistoryPoint[]) {
  if (!history.length) {
    return {
      minFuel: 0,
      maxFuel: 0,
      avgFuel: 0,
      range: 1,
      safeThreshold: 0,
    };
  }

  const minFuel = Math.min(...history.map((h) => h.fuelUsed));
  const maxFuel = Math.max(...history.map((h) => h.fuelUsed));
  const range = maxFuel - minFuel || 1;
  const avgFuel =
    history.reduce((acc, h) => acc + h.fuelUsed, 0) / history.length;
  const safeThreshold = avgFuel * 1.02;

  return { minFuel, maxFuel, avgFuel, range, safeThreshold };
}

export function getFuelBarColor(
  value: number,
  avgFuel: number,
  safeThreshold: number
) {
  if (value <= avgFuel * 0.98) return "#22c55e";
  if (value <= safeThreshold) return "#eab308";
  return "#f97316";
}
