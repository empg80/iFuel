export type PitClearAirNearest = { carNum: string | number | null; gapSeconds: number } | null;

export type PitClearAirOption = {
  lap: number;
  trafficScore: number;
  nearest?: PitClearAirNearest;
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
} | null;
