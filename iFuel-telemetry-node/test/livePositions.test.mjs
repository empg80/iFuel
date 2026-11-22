import { test } from "node:test";
import assert from "node:assert/strict";
import { createLivePositions } from "../livePositions.mjs";

const car = (idx, pos, lap, pct, valid = true) => ({ idx, pos, lap, pct, valid });

test("livePositions: un adelantamiento se refleja antes de cruzar meta", () => {
  const lp = createLivePositions();
  let r = lp.update([car(1, 1, 5, 0.50), car(2, 2, 5, 0.49), car(3, 3, 5, 0.2)]);
  assert.deepEqual([r.get(1), r.get(2), r.get(3)], [1, 2, 3]);
  r = lp.update([car(1, 1, 5, 0.52), car(2, 2, 5, 0.54), car(3, 3, 5, 0.22)]); // 2 pasa a 1 sin cruzar meta
  assert.deepEqual([r.get(1), r.get(2), r.get(3)], [2, 1, 3]);
});

test("livePositions: histéresis en duelos y coches sin dato conservan su puesto", () => {
  const lp = createLivePositions();
  lp.update([car(1, 1, 5, 0.5), car(2, 2, 5, 0.4999), car(3, 3, 5, 0.1, false)]);
  const r = lp.update([car(1, 1, 5, 0.5001), car(2, 2, 5, 0.5002), car(3, 3, 5, -1, false)]); // diferencia < eps
  assert.equal(r.get(1), 1); assert.equal(r.get(2), 2); assert.equal(r.get(3), 3);
  const r2 = lp.update([car(1, 1, 5, 0.50, true), car(2, 2, 5, 0.60, true), car(3, 3, 0, -1, false)]);
  assert.equal(r2.get(2), 1); assert.equal(r2.get(3), 3);
});

test("livePositions: el desfase de una vuelta al cruzar meta no provoca saltos", () => {
  const lp = createLivePositions();
  lp.update([car(1, 1, 5, 0.999), car(2, 2, 5, 0.9)]);
  const r = lp.update([car(1, 1, 5, 0.001), car(2, 2, 5, 0.91)]); // lap aún sin incrementar: parece -1 vuelta
  assert.equal(r.get(1), 1);
});
