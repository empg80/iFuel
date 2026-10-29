// iFuel-telemetry-node/pitWindow.mjs
// Ventana de parada a partir del combustible real: de qué paso por boxes en adelante te basta un
// depósito para llegar a meta, hasta el último paso al que llegas sin quedarte sin gasolina.

const RESERVE_LAPS_TO_PIT = 0.25; // margen de combustible para llegar a boxes (fracción de vuelta)
const MAX_PASSES = 12;

/**
 * @param {object} i
 * @param {number} i.fuelLevel litros en el depósito ahora
 * @param {number} i.fuelPerLap consumo por vuelta (> 0)
 * @param {number} i.fuelCapacity capacidad del depósito en litros
 * @param {number} i.myLap vuelta en curso (la que ves en el overlay)
 * @param {number} i.myPct 0..1 posición en la vuelta
 * @param {number} i.pitPct 0..1 posición de tu box (DriverPitTrkPct)
 * @param {number|null} i.lapsToFinish vueltas hasta meta contando la vuelta en curso entera, null si no se sabe
 * @param {number} i.safetyLaps vueltas de margen al repostar
 * @returns {{status:'unknown'|'no-stop'|'window'|'extra-stop'|'critical', passes:{lap:number, lapsToPit:number}[],
 *   startLap:number|null, endLap:number|null, litersNeeded:number|null}}
 */
export function computePitWindow(i) {
  const none = (status) => ({ status, passes: [], startLap: null, endLap: null, litersNeeded: null });
  const { fuelLevel, fuelPerLap, fuelCapacity, myLap, lapsToFinish } = i;
  const myPct = Number.isFinite(i.myPct) ? i.myPct : 0;
  const pitPct = Number.isFinite(i.pitPct) && i.pitPct >= 0 ? i.pitPct : null;
  const safetyLaps = Number.isFinite(i.safetyLaps) ? i.safetyLaps : 0;

  if (!(fuelPerLap > 0) || !(fuelCapacity > 0) || !(fuelLevel >= 0) || pitPct == null) return none("unknown");
  if (lapsToFinish == null || !(lapsToFinish > 0)) return none("unknown");

  const remaining = lapsToFinish - myPct; // vueltas que quedan por rodar desde donde estás
  const lapsOnFuel = fuelLevel / fuelPerLap;
  const capacityLaps = fuelCapacity / fuelPerLap;

  if (remaining + safetyLaps <= lapsOnFuel) return none("no-stop");

  // Pasos por tu box: k-ésima vez que pasas por pitPct desde ahora
  const firstOffset = (((pitPct - myPct) % 1) + 1) % 1;
  const firstLap = myLap + (pitPct > myPct ? 0 : 1);

  const passes = [];
  let latestK = -1;
  for (let k = 0; k < 200; k++) {
    const lapsToPit = firstOffset + k;
    if (lapsToPit > lapsOnFuel - RESERVE_LAPS_TO_PIT) break;
    latestK = k;
  }
  if (latestK < 0) {
    // ni siquiera llegas al próximo paso por boxes con margen
    return { ...none("critical"), passes: [{ lap: firstLap, lapsToPit: firstOffset }], startLap: firstLap, endLap: firstLap };
  }

  // Primer paso desde el que un solo depósito llega a meta
  let earliestK = 0;
  while (earliestK <= latestK) {
    const lapsToPit = firstOffset + earliestK;
    if (remaining - lapsToPit + safetyLaps <= capacityLaps) break;
    earliestK++;
  }

  let status = "window";
  let fromK = earliestK;
  if (earliestK > latestK) {
    // aunque pares en el último momento, no llegas con un solo repostaje: otra parada será necesaria
    status = "extra-stop";
    fromK = Math.max(0, latestK - 2);
  }
  fromK = Math.max(fromK, latestK - (MAX_PASSES - 1));

  for (let k = fromK; k <= latestK; k++) passes.push({ lap: firstLap + k, lapsToPit: firstOffset + k });

  const litersNeeded = Math.max(0, (remaining + safetyLaps) * fuelPerLap - fuelLevel);
  return {
    status,
    passes,
    startLap: passes[0].lap,
    endLap: passes.at(-1).lap,
    litersNeeded: Math.min(litersNeeded, fuelCapacity - 0), // el tope por hueco en el depósito lo aplica quien lo use
  };
}
