// Cálculo puro de cuánto combustible añadir. Solo sintaxis TS borrable para poder testearlo con Node.

export type RefuelInput = {
  fuelLevel: number; // litros en el depósito
  fuelPerLap: number; // consumo por vuelta (> 0)
  avgLapTime: number; // segundos por vuelta (0 si no se conoce)
  lapsRemain?: number | null; // SessionLapsRemainEx (32767 = sin límite de vueltas)
  timeRemain?: number | null; // SessionTimeRemain en segundos
  safetyLaps: number;
};

export type RefuelPlan = {
  lapsToFinish: number | null; // vueltas que quedan por rodar (con la vuelta en curso), null si se desconoce
  toAdd: number; // litros a añadir (>= 0)
  mode: "laps" | "time" | "unknown";
};

const isFiniteLaps = (n: number | null | undefined): n is number => n != null && n > 0 && n < 1000;

export function planRefuel(i: RefuelInput): RefuelPlan {
  if (!(i.fuelPerLap > 0)) return { lapsToFinish: null, toAdd: 0, mode: "unknown" };

  let lapsToFinish: number | null = null;
  let mode: RefuelPlan["mode"] = "unknown";

  if (isFiniteLaps(i.lapsRemain)) {
    lapsToFinish = i.lapsRemain;
    mode = "laps";
  } else if (i.timeRemain != null && i.timeRemain > 0 && i.avgLapTime > 0) {
    // La carrera termina al cruzar la meta tras llegar el reloj a 0: la vuelta en curso cuenta entera.
    lapsToFinish = Math.ceil(i.timeRemain / i.avgLapTime);
    mode = "time";
  }

  if (lapsToFinish == null) return { lapsToFinish: null, toAdd: 0, mode: "unknown" };

  const needed = (lapsToFinish + i.safetyLaps) * i.fuelPerLap;
  return { lapsToFinish, toAdd: Math.max(0, needed - i.fuelLevel), mode };
}
