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

import { formatLeaderGap, formatSessionRemaining } from "../src/utils/relativeFormat.ts";

test("formatLeaderGap: lider, vueltas, segundos y minutos", () => {
  assert.equal(formatLeaderGap(0, 0), "LEAD");
  assert.equal(formatLeaderGap(12.3456, 0), "+12.346");
  assert.equal(formatLeaderGap(65.04, 0), "+1:05.0");
  assert.equal(formatLeaderGap(125.96, 0), "+2:06.0");
  assert.equal(formatLeaderGap(null, 0), "--");
  assert.equal(formatLeaderGap(20, 2), "L2");
  assert.equal(formatLeaderGap(-3, 0), "LEAD");
});
test("formatSessionRemaining: vueltas, tiempo con horas y sin datos", () => {
  assert.equal(formatSessionRemaining(12, 999), "-12 LAPS");
  assert.equal(formatSessionRemaining(1, 0), "LAST LAP");
  assert.equal(formatSessionRemaining(32767, 3909), "1:05:09");
  assert.equal(formatSessionRemaining(32767, 750), "12:30");
  assert.equal(formatSessionRemaining(32767, 0), null);
  assert.equal(formatSessionRemaining(null, null), null);
  assert.equal(formatSessionRemaining(0, 604800), null);
});
