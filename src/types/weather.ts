export type Weather = {
  state: "dry" | "risk" | "raining" | "drying" | "wet";
  precip: number;   // 0..1
  wetness: number;  // 1 seca .. 7 extremadamente mojada
  skies: number;    // 0 despejado .. 3 cubierto
  humidity: number | null;
  windKph: number | null;
  windDir: number | null;
};
