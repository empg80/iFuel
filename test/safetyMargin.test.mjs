import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

beforeEach(() => { globalThis.localStorage = { getItem: () => null, setItem: () => {} }; });

test("margen: pasos de 0,25 entre 0 y 5", async () => {
  const m = await import("../src/utils/safetyMargin.ts");
  m.setSafetyLaps(0.3); assert.equal(m.getSafetyLaps(), 0.25);
  m.setSafetyLaps(0.12); assert.equal(m.getSafetyLaps(), 0);
  m.setSafetyLaps(-1); assert.equal(m.getSafetyLaps(), 0);
  m.setSafetyLaps(1.75); assert.equal(m.getSafetyLaps(), 1.75);
  m.setSafetyLaps(9); assert.equal(m.getSafetyLaps(), 5);
});
