import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStandingsGaps } from "../standingsGaps.mjs";

const car = (idx, pos, lap, pct) => ({ idx, pos, lap, pct });

test("el lider tiene hueco 0 y los demas, fraccion de vuelta por el tiempo de vuelta", () => {
  const g = computeStandingsGaps([car(0, 1, 5, 0.5), car(1, 2, 5, 0.4), car(2, 3, 5, 0.1)], 100);
  assert.deepEqual(g.get(0), { lapsDown: 0, gapSeconds: 0 });
  assert.equal(g.get(1).lapsDown, 0);
  assert.ok(Math.abs(g.get(1).gapSeconds - 10) < 1e-9);
  assert.ok(Math.abs(g.get(2).gapSeconds - 40) < 1e-9);
});
test("un coche a mas de media vuelta ya no sale como si fuera por delante", () => {
  const g = computeStandingsGaps([car(0, 1, 5, 0.9), car(1, 2, 5, 0.2)], 100);
  assert.ok(Math.abs(g.get(1).gapSeconds - 70) < 1e-9, `gap=${g.get(1).gapSeconds}`);
});
test("coches doblados: vueltas de desventaja y fraccion restante", () => {
  const g = computeStandingsGaps([car(0, 1, 6, 0.3), car(1, 2, 5, 0.1), car(2, 3, 4, 0.9)], 100);
  assert.equal(g.get(1).lapsDown, 1);
  assert.ok(Math.abs(g.get(1).gapSeconds - 20) < 1e-9);
  assert.equal(g.get(2).lapsDown, 1);
  assert.ok(Math.abs(g.get(2).gapSeconds - 40) < 1e-9);
});
test("justo una vuelta: no queda 'casi 1 vuelta' por redondeo", () => {
  const g = computeStandingsGaps([car(0, 1, 6, 0.5), car(1, 2, 5, 0.5)], 100);
  assert.equal(g.get(1).lapsDown, 1);
  assert.ok(g.get(1).gapSeconds < 1e-6);
});
test("coche por delante del P1 en pista: sin hueco, no negativo", () => {
  const g = computeStandingsGaps([car(0, 1, 5, 0.2), car(1, 2, 5, 0.3)], 100);
  assert.equal(g.get(1).gapSeconds, null);
  assert.equal(g.get(1).lapsDown, 0);
});
test("sin tiempo de referencia: hueco null; sin coches: mapa vacio; ignora pos <= 0", () => {
  assert.equal(computeStandingsGaps([car(0, 1, 5, 0.5), car(1, 2, 5, 0.4)], 0).get(1).gapSeconds, null);
  assert.equal(computeStandingsGaps([], 100).size, 0);
  assert.equal(computeStandingsGaps([car(0, 0, 5, 0.5)], 100).size, 0);
});
test("si no hay P1 el lider es el de mas progreso", () => {
  const g = computeStandingsGaps([car(0, 2, 5, 0.9), car(1, 3, 5, 0.5)], 100);
  assert.deepEqual(g.get(0), { lapsDown: 0, gapSeconds: 0 });
  assert.ok(Math.abs(g.get(1).gapSeconds - 40) < 1e-9);
});
