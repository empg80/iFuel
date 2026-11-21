// Planificador de stints para endurance: reparte las vueltas en el mínimo de paradas posible según
// depósito, consumo, ritmo y pérdida en boxes. Puro (sin React).
export type StintInput = { durationS: number; tankL: number; lapS: number; fuelPerLap: number; pitLossS: number; marginLaps: number };
export type Stint = { n: number; laps: number; fromLap: number; endTimeS: number | null; refuelL: number | null };
export type StintPlan = { totalLaps: number; stops: number; maxStintLaps: number; totalFuelL: number; stints: Stint[] } | null;

export function planStints(i: StintInput): StintPlan {
  const { durationS, tankL, lapS, fuelPerLap, pitLossS, marginLaps } = i;
  if (![durationS, tankL, lapS, fuelPerLap].every((v) => Number.isFinite(v) && v > 0)) return null;
  const maxStint = Math.floor(tankL / fuelPerLap - Math.max(0, marginLaps));
  if (maxStint < 1) return null;
  const loss = Math.max(0, pitLossS || 0);
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
  let lap = 1;
  let t = 0;
  for (let k = 0; k < n; k++) {
    const laps = base + (k < extra ? 1 : 0);
    t += laps * lapS;
    const next = k < n - 1 ? base + (k + 1 < extra ? 1 : 0) : 0;
    stints.push({
      n: k + 1, laps, fromLap: lap,
      endTimeS: k < n - 1 ? t + k * loss : null,
      refuelL: k < n - 1 ? Math.min(tankL, (next + Math.max(0, marginLaps)) * fuelPerLap) : null,
    });
    lap += laps;
  }
  return { totalLaps: total, stops, maxStintLaps: maxStint, totalFuelL: total * fuelPerLap, stints };
}
