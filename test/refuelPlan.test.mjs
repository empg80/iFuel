import { test } from "node:test";
import assert from "node:assert/strict";
import { planRefuel } from "../src/utils/refuelPlan.ts";

const base = { fuelLevel: 10, fuelPerLap: 2, avgLapTime: 100, lapsRemain: null, timeRemain: null, safetyLaps: 1 };

test("carrera por vueltas: (vueltas + seguridad) * consumo - depósito", () => {
  const p = planRefuel({ ...base, lapsRemain: 8 });
  assert.equal(p.mode, "laps");
  assert.equal(p.toAdd, 8);
});
test("no pide litros negativos si sobra combustible", () => {
  assert.equal(planRefuel({ ...base, lapsRemain: 2 }).toAdd, 0);
});
test("carrera por tiempo: redondea hacia arriba la vuelta en curso", () => {
  const p = planRefuel({ ...base, timeRemain: 410 });
  assert.equal(p.mode, "time");
  assert.equal(p.lapsToFinish, 5);
  assert.equal(p.toAdd, 2);
});
test("32767 (sin límite de vueltas) se trata como carrera por tiempo", () => {
  const p = planRefuel({ ...base, lapsRemain: 32767, timeRemain: 300 });
  assert.equal(p.mode, "time");
  assert.equal(p.lapsToFinish, 3);
});
test("sin datos suficientes devuelve unknown y 0", () => {
  assert.deepEqual(planRefuel(base), { lapsToFinish: null, toAdd: 0, mode: "unknown" });
  assert.equal(planRefuel({ ...base, fuelPerLap: 0, lapsRemain: 5 }).mode, "unknown");
  assert.equal(planRefuel({ ...base, timeRemain: 300, avgLapTime: 0 }).mode, "unknown");
});
