// Avisos de voz derivados del estado (clase rápida, amarilla/debris, combustible, box). Función pura:
// recibe el estado anterior que devolvió ella misma y el estado actual, y dice qué locutar.

export type AlertInput = {
  fastTraffic?: { carNum: string | null; classId: number | null; catchInSeconds: number } | null;
  classNames?: Record<number, string>;
  yellow?: { active: boolean; type?: "incident" | "debris" | null; distanceMeters: number | null; carNum: number | string | null } | null;
  fuelStatus?: string | null;
  windowStatus?: string | null;
  pitSuggestedLap?: number | null;
  pitNextLap?: number | null;
  pitLocked?: boolean;
  nowMs: number;
};

export type AlertMemory = {
  fastCar: string | null;
  fastAt: number;
  yellowKey: string | null;
  fuelCritical: boolean;
  windowOpen: boolean;
  boxLap: number | null;
};

export const initialAlertMemory = (): AlertMemory => ({
  fastCar: null, fastAt: -1e9, yellowKey: null, fuelCritical: false, windowOpen: false, boxLap: null,
});

const FAST_REPEAT_MS = 40000;

function roundMeters(m: number): number {
  return m < 100 ? Math.round(m / 10) * 10 : Math.round(m / 50) * 50;
}

export function alertsFor(mem: AlertMemory, i: AlertInput): { say: string[]; mem: AlertMemory } {
  const say: string[] = [];
  const next: AlertMemory = { ...mem };

  const ft = i.fastTraffic;
  if (ft && ft.carNum != null) {
    if (ft.carNum !== mem.fastCar || i.nowMs - mem.fastAt > FAST_REPEAT_MS) {
      const cls = ft.classId != null ? i.classNames?.[ft.classId] : null;
      say.push(`${cls ? cls : "Clase rápida"} por detrás, número ${ft.carNum}`);
      next.fastCar = ft.carNum;
      next.fastAt = i.nowMs;
    }
  } else if (mem.fastCar != null && i.nowMs - mem.fastAt > 5000) {
    next.fastCar = null; // se fue: el siguiente aviso del mismo coche vuelve a sonar
  }

  const y = i.yellow;
  if (y?.active) {
    const key = `${y.type ?? "y"}:${y.carNum ?? ""}`;
    if (key !== mem.yellowKey) {
      const what = y.type === "debris" ? "Escombros" : y.type === "incident" ? "Coche parado" : "Amarilla";
      const dist = y.distanceMeters != null && y.distanceMeters > 0 ? ` a ${roundMeters(y.distanceMeters)} metros` : "";
      say.push(`${what}${dist}`);
      next.yellowKey = key;
    }
  } else next.yellowKey = null;

  const crit = i.fuelStatus === "critical";
  if (crit && !mem.fuelCritical) say.push("Combustible crítico");
  next.fuelCritical = crit;

  const open = i.windowStatus === "window" || i.windowStatus === "extra-stop";
  if (open && !mem.windowOpen) say.push("Ventana de parada abierta");
  next.windowOpen = open;

  if (i.pitLocked && i.pitSuggestedLap != null && i.pitSuggestedLap === i.pitNextLap && i.pitNextLap !== mem.boxLap) {
    say.push("Entra a boxes esta vuelta");
    next.boxLap = i.pitNextLap;
  } else if (!i.pitLocked && mem.boxLap != null && i.pitNextLap !== mem.boxLap) {
    next.boxLap = null;
  }
  return { say, mem: next };
}
