// iFuel-telemetry-node/pitPasses.mjs
// Pasos por boxes con los litros que se repostarían en cada uno y si caben en el depósito.

/**
 * @param {{passes:{lap:number,lapsToPit:number}[], status:string, fuelLevel:number, fuelPerLap:number,
 *   fuelCapacity:number, remaining:number, safetyLaps:number, lossFor:(liters:number)=>number}} i
 * @returns {{lap:number, lapsToPit:number, liters:number, need:number, room:number, fits:boolean, lossSeconds:number}[]}
 */
export function buildPitPasses(i) {
  const all = i.passes.map((p) => {
    const fuelAtPit = Math.max(0, i.fuelLevel - p.lapsToPit * i.fuelPerLap);
    const room = Math.max(0, i.fuelCapacity - fuelAtPit); // hueco libre en el depósito al llegar a boxes
    const need = Math.max(0, (i.remaining - p.lapsToPit + i.safetyLaps) * i.fuelPerLap - fuelAtPit);
    const liters = Math.min(need, room);
    return { ...p, liters, need, room, fits: need <= room + 0.3, lossSeconds: i.lossFor(liters) };
  });
  // Solo tiene sentido proponer paradas en las que lo que hay que repostar CABE en el depósito (si no, no llegas a
  // meta con ese repostaje). Con extra-stop se conservan todas: se rellena y habrá otra parada.
  const fitting = all.filter((p) => p.fits);
  return i.status === "window" && fitting.length > 0 ? fitting : all;
}
