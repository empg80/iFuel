import { test } from "node:test";
import assert from "node:assert/strict";
import { formatGap, formatDelta } from "../src/utils/relativeFormat.ts";

test("formatGap redondea a milisegundos antes de separar (sin '01.1000')", () => {
  assert.equal(formatGap(1.9996), "02.000");
  assert.equal(formatGap(0.2), "00.200");
  assert.equal(formatGap(-12.4), "-12.400");
  assert.equal(formatGap(-0.0001), "00.000");
  assert.equal(formatGap(null), "--");
  assert.equal(formatGap(NaN), "--");
});
test("formatDelta lleva signo en ambos sentidos y parte entera", () => {
  assert.equal(formatDelta(0.31), "+0.310");
  assert.equal(formatDelta(-0.42), "-0.420");
  assert.equal(formatDelta(1.5), "+1.500");
  assert.equal(formatDelta(-2.0004), "-2.000");
  assert.equal(formatDelta(0.0001), "0.000");
  assert.equal(formatDelta(null), "");
});
