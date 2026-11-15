// types/standings.ts
export type StandingsRow = {
  position: number;
  carNumber: string;
  classId: number;
  driverName: string;

  bestLapTime: number | null;
  gapToLeader: number | null;
  /** Distancia total al líder en vueltas y tiempo de vuelta de referencia (hueco correcto entre coches de la misma clase) */
  gapLaps?: number | null;
  refLap?: number | null;
  /** Neumático que lleva el coche: índice de iRacing y nombre del compuesto si la sesión lo da */
  tire?: number | null;
  tireName?: string | null;

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
