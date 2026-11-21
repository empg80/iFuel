import { test } from "node:test";
import assert from "node:assert/strict";
import { planStints } from "../src/utils/stintPlan.ts";

test("planificador: 3 h, 60 L, 2,70 L/v → stint máx 21 y reparto equilibrado", () => {
  const p = planStints({ durationS: 10800, tankL: 60, lapS: 107.5, fuelPerLap: 2.7, pitLossS: 38, marginLaps: 1 });
  assert.equal(p.maxStintLaps, 21);
  assert.equal(p.stints.length, p.stops + 1);
  assert.equal(p.stints.reduce((a, s) => a + s.laps, 0), p.totalLaps);
  assert.ok(p.stints.every((s) => s.laps <= 21));
  assert.ok(Math.max(...p.stints.map((s) => s.laps)) - Math.min(...p.stints.map((s) => s.laps)) <= 1);
  assert.equal(p.stints.at(-1).refuelL, null);
  assert.ok(p.stints[0].refuelL <= 60);
});
test("planificador: sin paradas si llega, y entradas inválidas → null", () => {
  assert.equal(planStints({ durationS: 1800, tankL: 100, lapS: 100, fuelPerLap: 2, pitLossS: 30, marginLaps: 1 }).stops, 0);
  assert.equal(planStints({ durationS: 1800, tankL: 100, lapS: 0, fuelPerLap: 2, pitLossS: 30, marginLaps: 1 }), null);
  assert.equal(planStints({ durationS: 1800, tankL: 2, lapS: 100, fuelPerLap: 2, pitLossS: 30, marginLaps: 1 }), null);
});
