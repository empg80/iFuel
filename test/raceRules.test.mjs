import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

beforeEach(() => { globalThis.localStorage = { getItem: () => null, setItem: () => {} }; });

test("reglas: limita valores y evalúa paradas, stint y tiempo mínimo", async () => {
  const m = await import("../src/utils/raceRules.ts");
  assert.deepEqual(m.clampRules({ minStops: -3, minStopSeconds: 9999, maxStintLaps: "x" }), { minStops: 0, minStopSeconds: 300, maxStintLaps: 0 });
  const r = { minStops: 2, minStopSeconds: 45, maxStintLaps: 30 };
  const s = m.evaluateRules(r, { pitStops: 1, stintLapCount: 28 }, 20);
  assert.equal(s.stopsLeft, 1); assert.equal(s.stopsOk, false);
  assert.equal(s.stintLeft, 2); assert.equal(s.stintTone, "warn");
  assert.equal(s.holdLeft, 25);
  const d = m.evaluateRules(m.DEFAULT_RULES, { pitStops: 3, stintLapCount: 99 }, null);
  assert.equal(d.active, false); assert.equal(d.stopsLeft, null); assert.equal(d.stintTone, null);
  assert.equal(m.evaluateRules(r, { pitStops: 2, stintLapCount: 31 }, null).stintTone, "bad");
});
