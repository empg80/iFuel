// iFuel-telemetry-node/fastTraffic.mjs
// M1: aviso de tráfico más rápido por detrás (clases superiores en multiclase).
// Devuelve el coche de otra clase y más rápido que viene detrás y te alcanzará pronto.

const PACE_DIFF_MIN = 0.015; // 1,5 % más rápido que tú para contar como "más rápido"
const MAX_CATCH_SECONDS = 60; // avisar si te alcanza en menos de esto
const MAX_GAP_LAPS = 0.5;

/**
 * @param {{myIdx:number, myClassId:number|null, myPct:number, myPace:number,
 *   cars:{idx:number,pct:number,classId:number|null,carNum:string|null,bestLap:number,lastLap:number,onPit:number|boolean}[]}} i
 * @returns {{carNum:string|null, classId:number|null, gapSeconds:number, catchInSeconds:number, count:number}|null}
 */
export function computeFastTraffic({ myIdx, myClassId, myPct, myPace, cars, maxCatchSeconds = MAX_CATCH_SECONDS }) {
  if (!(myPace > 0) || !Number.isFinite(myPct) || myPct < 0 || myClassId == null) return null;
  let best = null;
  let count = 0;
  for (const c of cars) {
    if (c.idx === myIdx || c.classId == null || c.classId === myClassId) continue;
    if (!Number.isFinite(c.pct) || c.pct < 0 || c.onPit) continue;
    const pace = c.bestLap > 0 ? c.bestLap : c.lastLap > 0 ? c.lastLap : null;
    if (pace == null || pace > myPace * (1 - PACE_DIFF_MIN)) continue;
    const behindLaps = (((myPct - c.pct) % 1) + 1) % 1; // distancia (en vueltas) que te saca de detrás
    if (behindLaps <= 0 || behindLaps > MAX_GAP_LAPS) continue;
    const closing = 1 / pace - 1 / myPace; // vueltas por segundo que te recorta
    const catchIn = behindLaps / closing;
    if (!(catchIn > 0) || catchIn > maxCatchSeconds) continue;
    count++;
    if (best == null || catchIn < best.catchInSeconds) {
      best = { carNum: c.carNum ?? null, classId: c.classId, gapSeconds: behindLaps * myPace, catchInSeconds: catchIn };
    }
  }
  return best ? { ...best, count } : null;
}
