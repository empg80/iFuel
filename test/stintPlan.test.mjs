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

test("planificador: máximo al volante por stint fuerza más paradas y reparte pilotos en rotación", () => {
  const base = { durationS: 10800, tankL: 100, lapS: 100, fuelPerLap: 2, pitLossS: 40, marginLaps: 1 };
  const free = planStints(base);
  const lim = planStints({ ...base, drivers: 3, driverChangeS: 20, maxDriveS: 2400 });
  assert.ok(lim.stops > free.stops);
  assert.ok(lim.stints.every((s) => s.driveS <= 2400 + 1e-6));
  assert.deepEqual(lim.stints.slice(0, 4).map((s) => s.driver), [0, 1, 2, 0]);
  assert.ok(lim.driverTotals.length === 3);
});
test("planificador: avisa si un piloto supera su máximo total y con 1 piloto no suma el cambio", () => {
  const base = { durationS: 10800, tankL: 100, lapS: 100, fuelPerLap: 2, pitLossS: 40, marginLaps: 1 };
  const w = planStints({ ...base, drivers: 2, maxTotalS: 3600 });
  assert.ok(w.warnings.some((x) => /máximo al volante/.test(x)));
  const a = planStints({ ...base, driverChangeS: 60 }); // 1 piloto: el cambio no cuenta
  const b = planStints(base);
  assert.equal(a.totalLaps, b.totalLaps);
});
test("planificador: las amarillas esperadas alargan el stint (menos paradas o stints en vueltas más largos)", () => {
  const base = { durationS: 10800, tankL: 60, lapS: 100, fuelPerLap: 2.5, pitLossS: 40, marginLaps: 1 };
  const g = planStints(base);
  const y = planStints({ ...base, yellowPct: 20 });
  assert.ok(y.maxStintLaps > g.maxStintLaps);
  assert.ok(y.totalLaps < g.totalLaps);
});
