export type PitClearAirNearest = { carNum: string | number | null; gapSeconds: number } | null;

export type PitClearAirOption = {
  lap: number;
  trafficScore: number;
  nearest?: PitClearAirNearest;
  lossSeconds?: number;
};

export type PitClearAirData = {
  suggestedLap: number | null;
  options: PitClearAirOption[];
  /** Coches que encontrarías al salir si entras esta misma vuelta */
  nowScore?: number | null;
  nowNearest?: PitClearAirNearest;
  /** Segundos que pierdes en una parada y si se han medido en tus paradas o son una estimación */
  pitLossSeconds?: number | null;
  pitLossMeasured?: boolean;
  /** Ventana calculada por el servidor con el combustible real */
  windowStatus?: "window" | "no-stop" | "extra-stop" | "critical";
  windowStartLap?: number | null;
  windowEndLap?: number | null;
  litersNeeded?: number | null;
  nextPitLap?: number;
} | null;
