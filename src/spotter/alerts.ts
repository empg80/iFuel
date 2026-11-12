// Avisos de voz derivados del estado (clase rápida, amarilla/debris, combustible, box). Función pura:
// recibe el estado anterior que devolvió ella misma y el estado actual, y dice qué locutar.

import { fill, getPhrases } from "./phrases.ts";

/** Avisos que se pueden silenciar uno a uno desde el menú. */
export const ALERT_IDS = ["clear", "fastClass", "yellow", "fuel", "window", "box", "lastLap", "checkered", "rain"] as const;
export type AlertId = (typeof ALERT_IDS)[number];

export type AlertInput = {
  fastTraffic?: { carNum: string | null; classId: number | null; catchInSeconds: number; sameClass?: boolean; blueFlag?: boolean } | null;
  classNames?: Record<number, string>;
  yellow?: { active: boolean; type?: "incident" | "debris" | null; distanceMeters: number | null; carNum: number | string | null } | null;
  fuelStatus?: string | null;
  windowStatus?: string | null;
  pitSuggestedLap?: number | null;
  pitNextLap?: number | null;
  pitLocked?: boolean;
  lastLap?: boolean;
  checkered?: boolean;
  weatherState?: string | null;
  muted?: string[];
  nowMs: number;
};

export type AlertMemory = {
  fastCar: string | null;
  fastAt: number;
  yellowKey: string | null;
  fuelCritical: boolean;
  windowOpen: boolean;
  boxLap: number | null;
  lastLap: boolean;
  checkered: boolean;
  weather: string;
};

export const initialAlertMemory = (): AlertMemory => ({
  fastCar: null, fastAt: -1e9, yellowKey: null, fuelCritical: false, windowOpen: false, boxLap: null, lastLap: false, checkered: false, weather: "dry",
});

const FAST_REPEAT_MS = 40000;

function roundMeters(m: number): number {
  return m < 100 ? Math.round(m / 10) * 10 : Math.round(m / 50) * 50;
}

export function alertsFor(mem: AlertMemory, i: AlertInput): { say: string[]; mem: AlertMemory } {
  const say: string[] = [];
  const next: AlertMemory = { ...mem };
  const P = getPhrases();
  const on = (id: AlertId) => !i.muted?.includes(id);

  const ft = i.fastTraffic;
  if (ft && (ft.carNum != null || ft.blueFlag)) {
    const who = ft.carNum ?? "blue";
    if (who !== mem.fastCar || i.nowMs - mem.fastAt > FAST_REPEAT_MS) {
      if (on("fastClass")) {
        // Sin nombre de clase (las siglas se leían mal): "categoría más rápida" o "coche número X"
        say.push(ft.carNum == null ? P.blue : ft.sameClass ? fill(P.fastClassNoName, { numero: ft.carNum }) : fill(P.fastClass, { numero: ft.carNum }));
      }
      next.fastCar = who;
      next.fastAt = i.nowMs;
    }
  } else if (mem.fastCar != null && i.nowMs - mem.fastAt > 5000) {
    next.fastCar = null; // se fue: el siguiente aviso del mismo coche vuelve a sonar
  }

  const y = i.yellow;
  if (y?.active) {
    const key = `${y.type ?? "y"}:${y.carNum ?? ""}`;
    if (key !== mem.yellowKey) {
      const what = y.type === "debris" ? P.debris : y.type === "incident" ? P.incident : P.yellow;
      const dist = y.distanceMeters != null && y.distanceMeters > 0 ? fill(P.distance, { metros: roundMeters(y.distanceMeters) }) : "";
      if (on("yellow")) say.push(`${what}${dist}`);
      next.yellowKey = key;
    }
  } else next.yellowKey = null;

  const crit = i.fuelStatus === "critical";
  if (crit && !mem.fuelCritical && on("fuel")) say.push(P.fuelCritical);
  next.fuelCritical = crit;

  const open = i.windowStatus === "window" || i.windowStatus === "extra-stop";
  if (open && !mem.windowOpen && on("window")) say.push(P.windowOpen);
  next.windowOpen = open;

  if (i.pitLocked && i.pitSuggestedLap != null && i.pitSuggestedLap === i.pitNextLap && i.pitNextLap !== mem.boxLap) {
    if (on("box")) say.push(P.boxNow);
    next.boxLap = i.pitNextLap;
  } else if (!i.pitLocked && mem.boxLap != null && i.pitNextLap !== mem.boxLap) {
    next.boxLap = null;
  }

  const last = !!i.lastLap;
  if (last && !mem.lastLap && on("lastLap")) say.push(P.lastLap);
  next.lastLap = last;
  const chk = !!i.checkered;
  if (chk && !mem.checkered && on("checkered")) say.push(P.checkered);
  next.checkered = chk;

  const w = i.weatherState ?? "dry";
  if (w !== mem.weather && on("rain")) {
    if (w === "raining") say.push(P.rainStart);
    else if (mem.weather === "raining") say.push(P.rainStop);
    else if (w === "risk" && mem.weather === "dry") say.push(P.rainRisk);
  }
  next.weather = w;
  return { say, mem: next };
}
