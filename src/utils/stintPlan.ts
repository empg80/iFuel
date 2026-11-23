// Planificador de stints para endurance: reparte las vueltas en el mínimo de paradas posible según
// depósito, consumo, ritmo y pérdida en boxes; opcionalmente con cambios de piloto (tiempo extra, máximo al volante
// por stint y por piloto) y un % de carrera esperado bajo amarilla. Puro (sin React).
export type StintInput = {
  durationS: number; tankL: number; lapS: number; fuelPerLap: number; pitLossS: number; marginLaps: number;
  drivers?: number; // nº de pilotos (1 = sin cambios)
  driverChangeS?: number; // segundos extra por parada con cambio de piloto
  maxDriveS?: number; // máximo al volante por stint (0 = sin límite)
  maxTotalS?: number; // máximo al volante por piloto en toda la carrera (0 = sin límite)
  yellowPct?: number; // % de la carrera esperado bajo amarilla (0–100)
};
export type Stint = { n: number; laps: number; fromLap: number; endTimeS: number | null; refuelL: number | null; driver: number; driveS: number };
export type StintPlan = {
  totalLaps: number; stops: number; maxStintLaps: number; totalFuelL: number; stints: Stint[]; warnings: string[];
  driverTotals: number[]; // segundos al volante de cada piloto
} | null;

// Bajo amarilla se va ~50 % más lento y se consume ~45 % menos por vuelta
const YELLOW_SLOW = 0.5;
const YELLOW_FUEL_SAVE = 0.45;

export function planStints(i: StintInput): StintPlan {
  const { durationS, tankL, marginLaps } = i;
  const y = Math.min(1, Math.max(0, (i.yellowPct ?? 0) / 100));
  const lapS = i.lapS * (1 + YELLOW_SLOW * y); // vuelta media con amarillas
  const fuelPerLap = i.fuelPerLap * (1 - YELLOW_FUEL_SAVE * y);
  if (![durationS, tankL, lapS, fuelPerLap].every((v) => Number.isFinite(v) && v > 0)) return null;
  const drivers = Math.max(1, Math.round(i.drivers ?? 1));
  const swap = drivers > 1 ? Math.max(0, i.driverChangeS ?? 0) : 0;
  let maxStint = Math.floor(tankL / fuelPerLap - Math.max(0, marginLaps));
  if ((i.maxDriveS ?? 0) > 0) maxStint = Math.min(maxStint, Math.floor(i.maxDriveS! / lapS));
  if (maxStint < 1) return null;
  const loss = Math.max(0, i.pitLossS || 0) + swap;
  let stops = 0;
  let total = Math.ceil(durationS / lapS);
  for (; stops < 40; stops++) {
    total = Math.ceil((durationS - stops * loss) / lapS);
    if ((stops + 1) * maxStint >= total) break;
  }
  const n = stops + 1;
  const base = Math.floor(total / n);
  const extra = total % n;
  const stints: Stint[] = [];
  const totals = Array.from({ length: drivers }, () => 0);
  let lap = 1;
  let t = 0;
  for (let k = 0; k < n; k++) {
    const laps = base + (k < extra ? 1 : 0);
    t += laps * lapS;
    const next = k < n - 1 ? base + (k + 1 < extra ? 1 : 0) : 0;
    const driver = k % drivers;
    totals[driver] += laps * lapS;
    stints.push({
      n: k + 1, laps, fromLap: lap, driver, driveS: laps * lapS,
      endTimeS: k < n - 1 ? t + k * loss : null,
      refuelL: k < n - 1 ? Math.min(tankL, (next + Math.max(0, marginLaps)) * fuelPerLap) : null,
    });
    lap += laps;
  }
  const warnings: string[] = [];
  const worst = Math.max(...totals);
  if ((i.maxTotalS ?? 0) > 0 && worst > i.maxTotalS!) {
    warnings.push(`Un piloto supera el máximo al volante (${Math.round(worst / 60)} min frente a ${Math.round(i.maxTotalS! / 60)}): hacen falta más pilotos o stints más cortos`);
  }
  if (drivers > 1 && n < drivers) warnings.push(`Hay ${drivers} pilotos pero solo ${n} stints: ${drivers - n} no conducirían`);
  return { totalLaps: total, stops, maxStintLaps: maxStint, totalFuelL: total * fuelPerLap, stints, warnings, driverTotals: totals };
}
