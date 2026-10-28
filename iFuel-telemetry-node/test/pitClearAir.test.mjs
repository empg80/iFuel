import { test } from "node:test";
import assert from "node:assert/strict";
import { computePitClearAirSuggestion as f } from "../pitClearAir.mjs";

const base = { myLap: 5, myPct: 0.5, myIdx: 0, baseLapTime: 100, pitDeltaSeconds: 25, lapsRemainForRace: null, maxStintLapsFromFull: null };
const car = (idx, pct, lap = 100) => ({ idx, pct, lastLap: lap, bestLap: lap });

test("la pérdida de la parada se aplica: un coche 25 s detrás aparece justo a mi salida", () => {
  // Paro ahora y pierdo 25 s: el coche que iba 25 s detrás sale a mi lado (cuenta);
  // el que iba 5 s detrás y el que iba 20 s delante quedan lejos (20 s y 45 s por delante).
  const cars = [car(0, 0.5), car(1, 0.45), car(2, 0.25), car(3, 0.7)];
  const r = f({ ...base, cars, pitWindowStartLap: 5, pitWindowEndLap: 5 });
  assert.equal(r.options[0].trafficScore, 1);
});

test("un hueco libre tras la parada da 0 coches", () => {
  const cars = [car(0, 0.5), car(1, 0.45)]; // el único rival, 5 s detrás, sale 20 s por delante
  const r = f({ ...base, cars, pitWindowStartLap: 5, pitWindowEndLap: 5 });
  assert.equal(r.options[0].trafficScore, 0);
});

test("elige la vuelta con menos tráfico al salir", () => {
  // Rival a 0.25 (25 s detrás): si paro ya sale pegado a mí; si espero una vuelta ambos
  // avanzamos igual y vuelve a quedar 25 s detrás, es decir, pegado a mi salida también.
  // Con un rival más lento (110 s) el desfase cambia con las vueltas.
  const cars = [car(0, 0.5), car(1, 0.25, 110)];
  const r = f({ ...base, cars, pitWindowStartLap: 5, pitWindowEndLap: 12 });
  assert.ok(r.options.length >= 1);
  assert.equal(r.suggestedLap, r.options[0].lap);
  assert.ok(r.options[0].trafficScore <= r.options.at(-1).trafficScore);
});

test("sin parámetros válidos no sugiere nada", () => {
  const r = f({ ...base, cars: [], pitWindowStartLap: 5, pitWindowEndLap: 5, pitDeltaSeconds: 0 });
  assert.equal(r.suggestedLap, null);
});
