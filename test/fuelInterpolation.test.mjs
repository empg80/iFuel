import { test } from "node:test";
import assert from "node:assert/strict";
import { interpolateFuelAtLine } from "../src/utils/fuelInterpolation.ts";

const near = (a, b) => Math.abs(a - b) < 1e-9;

test("interpola el combustible en la meta entre dos lecturas", () => {
  // 3 % de vuelta antes de la meta, 4 % después: la meta cae al 3/7 del tramo
  assert.ok(near(interpolateFuelAtLine(45.03, 0.97, 44.96, 0.04), 45.03 + (44.96 - 45.03) * (3 / 7)));
});

test("con consumo lineal el resultado es exacto, independientemente de dónde caiga la lectura", () => {
  const fuelAt = (lapPos) => 50 - 1.0 * lapPos; // 1 L por vuelta
  for (const [before, after] of [[0.99, 0.01], [0.9, 0.02], [0.92, 0.1]]  /* cada tramo <= 20 % de vuelta */) {
    const got = interpolateFuelAtLine(fuelAt(4 + before), before, fuelAt(5 + after), after);
    assert.ok(near(got, fuelAt(5)), `before=${before} after=${after}`);
  }
});

test("sin cruce de meta, o con salto de más del 20 % de vuelta, o sin lectura previa: lectura actual", () => {
  assert.equal(interpolateFuelAtLine(45, 0.4, 44, 0.45), 44);
  assert.equal(interpolateFuelAtLine(45, 0.6, 44, 0.3), 44);
  assert.equal(interpolateFuelAtLine(null, null, 44, 0.02), 44);
  assert.equal(interpolateFuelAtLine(45, 0.97, 44, undefined), 44);
});
