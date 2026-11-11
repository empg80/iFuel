import { test } from "node:test";
import assert from "node:assert/strict";
import { computePitHelper, parsePitLimitKph } from "../pitHelper.mjs";

test("límite en kph y mph", () => {
  assert.equal(parsePitLimitKph("60.00 kph"), 60);
  assert.ok(Math.abs(parsePitLimitKph("45 mph") - 72.42) < 0.01);
  assert.equal(parsePitLimitKph(""), null);
});
test("fuera de boxes no hay ayuda", () => {
  assert.equal(computePitHelper({ onPitRoad: false, speedMs: 20 }), null);
});
test("exceso de velocidad, limitador y distancia al box", () => {
  const h = computePitHelper({ onPitRoad: true, speedMs: 20, limitKph: 60, engineWarnings: 0x10, myPct: 0.97, pitPct: 0.99, trackLengthM: 5000 });
  assert.equal(h.status, "speeding");
  assert.ok(Math.abs(h.overKph - 12) < 1e-9);
  assert.ok(Math.abs(h.boxDistM - 100) < 1e-6);
  const ok = computePitHelper({ onPitRoad: true, speedMs: 16, limitKph: 60, engineWarnings: 0x10, myPct: 0.99, pitPct: 0.97, trackLengthM: 5000 });
  assert.equal(ok.status, "ok");
  assert.ok(ok.boxDistM < 0);
});
test("pit con wrap de meta", () => {
  const h = computePitHelper({ onPitRoad: true, speedMs: 10, limitKph: 60, engineWarnings: 0x10, myPct: 0.995, pitPct: 0.01, trackLengthM: 4000 });
  assert.ok(Math.abs(h.boxDistM - 60) < 1e-6);
});
test("sin limitador y moviéndose", () => {
  assert.equal(computePitHelper({ onPitRoad: true, speedMs: 10, limitKph: null, engineWarnings: 0, myPct: 0.1, pitPct: 0.2, trackLengthM: 4000 }).status, "no-limiter");
});
