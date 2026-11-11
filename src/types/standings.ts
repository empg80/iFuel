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
  iRating: number | null;
  incidents: number | null;
  penalty: "black" | "dq" | "repair" | "warn" | null;
};

export type RaceStandingsWidgetProps = {
  rows: StandingsRow[];
  myCarNumber: string;
  classColorIndexById: Record<number, number>;
  classNames?: Record<number, string>;
  /** Máximo de filas que caben (pitboard): recorta coches para que la tabla no se corte */
  maxRows?: number | null;
  clock?: { time: string; cap: string; extra?: string; low: boolean } | null;
};
