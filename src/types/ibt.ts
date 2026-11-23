export type IbtLap = { n: number; timeS: number | null; fuelUsedL?: number | null; complete: boolean; clean: boolean; pitS: number; offTrackS: number; reason: string | null };
export type IbtCornerMetrics = {
  minKph: number; apexM: number; brakeStartM: number | null; brakeLenM: number | null; peakBrake: number | null;
  throttleAfterApexM: number | null; exitKph: number; gear: number;
};
export type IbtCorner = {
  potentialS?: number; bestZoneLap?: number;
  id: number; apexM: number; zoneStartM: number; zoneEndM: number; ref: IbtCornerMetrics; lossAvgS: number | null;
  incidents: { lap: number; lossS: number }[]; tips: string[];
  stats: { minKphStd: number | null; brakeStartStdM: number | null; lossStdS: number | null };
  rows: ({ lap: number; loss: number } & IbtCornerMetrics)[];
};
export type IbtProfileLap = { lap: number; speed: number[]; throttle: number[]; brake: number[]; delta: number[] };
export type IbtAnalysis = {
  meta: { track: string | null; car: string | null; trackLengthM: number; tickRate: number; sessionType?: string | null; stepM?: number; records?: number };
  laps: IbtLap[];
  error?: string;
  reference?: { lap: number; timeS: number };
  summary?: { cleanLaps: number; comparableLaps: number; bestS: number; meanS: number | null; stdS: number | null; idealS?: number; fuelPerLapL?: number | null };
  corners?: IbtCorner[];
  topLosses?: { id: number; apexM: number; lossAvgS: number; tips: string[]; incidents: { lap: number; lossS: number }[] }[];
  profile?: { stepM: number; reference: number; laps: IbtProfileLap[] };
};
