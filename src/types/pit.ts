export type PitClearAirOption = {
  lap: number;
  trafficScore: number;
};

export type PitClearAirData = {
  suggestedLap: number | null;
  options: PitClearAirOption[];
} | null;
