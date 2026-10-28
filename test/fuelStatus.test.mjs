import { test } from "node:test";
import assert from "node:assert/strict";
import { fuelLevel } from "../src/utils/fuelStatus.ts";

test("calma con combustible de sobra", () => {
  assert.equal(fuelLevel({ estLaps: 12.3, ratio: 0.7, hasEstimate: true }), "ok");
});
test("atención cuando quedan pocas vueltas de combustible", () => {
  assert.equal(fuelLevel({ estLaps: 2.6, ratio: 0.4, hasEstimate: true }), "warn");
});
test("crítico cuando queda menos de ~1 vuelta", () => {
  assert.equal(fuelLevel({ estLaps: 1.0, ratio: 0.4, hasEstimate: true }), "crit");
});
test("sin consumo medio (primeras vueltas) NO se alarma por estLaps = 0", () => {
  assert.equal(fuelLevel({ estLaps: 0, ratio: 0.9, hasEstimate: false }), "ok");
});
test("sin estimación se avisa solo por el nivel del depósito", () => {
  assert.equal(fuelLevel({ estLaps: 0, ratio: 0.15, hasEstimate: false }), "warn");
  assert.equal(fuelLevel({ estLaps: 0, ratio: 0.05, hasEstimate: false }), "crit");
});
test("depósito casi vacío es crítico aunque la estimación sea optimista", () => {
  assert.equal(fuelLevel({ estLaps: 9, ratio: 0.05, hasEstimate: true }), "crit");
});
test("los umbrales son exclusivos en el límite (3.0 vueltas ya es calma)", () => {
  assert.equal(fuelLevel({ estLaps: 3, ratio: 0.5, hasEstimate: true }), "ok");
  assert.equal(fuelLevel({ estLaps: 1.2, ratio: 0.5, hasEstimate: true }), "warn");
});
