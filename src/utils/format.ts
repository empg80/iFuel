export function formatTemperatureC(value: number | null): string {
  if (value === null) return "--";
  return `${value.toFixed(1)}°C`;
}

export function formatLapLabel(lapNumber?: number): string {
  if (lapNumber === undefined) return "--";
  return `L${lapNumber}`;
}

export function formatLapTime(lapTime?: string): string {
  return lapTime ?? "--:--.---";
}

export function formatFuel(value: number, digits = 3): string {
  return value.toFixed(digits);
}

export function formatFuelDiff(lapFuel: number | undefined, fuelAvg: number) {
  if (lapFuel === undefined) {
    return { fuelDiff: undefined as number | undefined, text: "" };
  }
  const diff = lapFuel - fuelAvg;
  const sign = diff > 0 ? "+" : "";
  return { fuelDiff: diff, text: `${sign}${diff.toFixed(3)}` };
}
