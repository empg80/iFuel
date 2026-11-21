// types/car.ts — datos del coche que envía el servidor (carData.mjs)
export type SectorInfo = { time: number | null; fresh: boolean; status: "best" | "slower" | null };

export type TyreCorner = "lf" | "rf" | "lr" | "rr";

export type TyreData = {
  /** % de banda de rodadura que queda, por zona [izquierda, medio, derecha] */
  wear: Record<TyreCorner, (number | null)[]>;
  /** temperatura de carcasa (°C) por zona; solo se refresca al pasar por boxes */
  temp: Record<TyreCorner, (number | null)[]>;
  /** presión en frío del garaje (kPa) */
  coldPressure: Record<TyreCorner, number | null>;
  measuredLap: number | null;
  lapsAgo: number | null;
};

export type CarData = {
  delta: number | null;
  brakeBias: number | null;
  tc1: number | null;
  tc2: number | null;
  abs: number | null;
  compound: number | null;
  tyres: TyreData | null;
  sectors: SectorInfo[];
  sectorStarts?: number[];
  dash?: DashData;
};

/** Datos del dashboard de volante (marcha, régimen, luces de cambio, híbrido). */
export type DashData = {
  gear: number | null;
  rpm: number | null;
  shiftPct: number | null;
  rpmInfo: { idle: number | null; first: number | null; shift: number | null; last: number | null; blink: number | null; redline: number | null } | null;
  soc: number | null;
  deployPct: number | null;
  mguMode: number | null;
  regen: number | null;
  engineBraking: number | null;
};

export type PedalTrace = { hz: number; throttle: number[]; brake: number[] };

/** [carNum, pct, speed, surface, classId, onPit] */
export type CompactCar = [string | number | null, number, number | null, number | null, number | null, number];
