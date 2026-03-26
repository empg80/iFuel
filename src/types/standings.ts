// types/standings.ts
export type StandingsRow = {
  position: number;
  carNumber: string;
  classId: number;
  driverName: string;

  bestLapTime: number | null;
  gapToLeader: number | null;

  lapsDown: number;
  stintLapCount: number;
  lastPitDurationSeconds: number | null;
  pitStops: number;
  inPit: boolean;
  carModel: string;
};

export type RaceStandingsWidgetProps = {
  rows: StandingsRow[];
  myCarNumber: string;
  classColorIndexById: Record<number, number>;
};
