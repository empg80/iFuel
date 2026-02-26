export type FuelOpts = {
  minLapTimeSeconds: number;
  minFuelUsedPerLap: number;
  safetyExtraLaps: number;
  avgMode: "2" | "5" | "10";
};
