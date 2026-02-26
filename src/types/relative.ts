export type RelativeCar = {
  carNum: number | string | null;
  position?: number | null;
  gapSeconds: number | null;
  lastLap: number | null;
  bestLap: number | null;
  deltaLastToMe: number | null;
  classId?: number | null;
  classPosition?: number | null;
} | null;

export type OnTrackCar = {
  carNum: number | string | null;
  gapSeconds: number | null;
  lapsDiff: number | null;
  classId?: number | null;
  classPosition?: number | null;
} | null;
