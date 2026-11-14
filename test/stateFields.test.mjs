import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// El hook arma el estado campo a campo: si falta uno, las tarjetas que lo usan se quedan en "–" (pasó con fuelPlan).
test("el estado del hook reenvía los datos que usan las tarjetas", () => {
  const src = fs.readFileSync(new URL("../src/useIfuelWebSocket.ts", import.meta.url), "utf8");
  const start = src.indexOf("const nextState: IfuelState = {");
  assert.ok(start > 0);
  const block = src.slice(start, start + 6000);
  for (const k of ["fuelPlan", "weather", "pitHelper", "trackHistory", "pitClearAir", "fastTraffic", "yellowWarning", "standings", "carData"]) {
    assert.match(block, new RegExp(`\\b${k}\\b`), `falta ${k} en nextState`);
  }
});
