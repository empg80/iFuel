// types/standings.ts
export type StandingsRow = {
  position: number;
  carNumber: string;
  classId: number;
  driverName: string;
  bestLapTime: number | null; // segundos
  stintLaps: number;
  lastPitTime: number | null; // segundos parada
};

export type RaceStandingsWidgetProps = {
  rows: StandingsRow[];
  myCarNumber: string;
  classColorIndexById: Record<number, number>;
};
