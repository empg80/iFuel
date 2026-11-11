import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createTrackHistory, sessionKind, historyKey } from "../trackHistory.mjs";

test("sessionKind y clave", () => {
  assert.equal(sessionKind("Race"), "race");
  assert.equal(sessionKind("Lone Qualify"), "quali");
  assert.equal(sessionKind("Open Practice"), "practice");
  assert.equal(historyKey("fuji", "gt3"), "fuji|gt3");
  assert.equal(historyKey("", "gt3"), null);
});
test("récords por tipo y persistencia", () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "th-")), "h.json");
  const h = createTrackHistory(f);
  assert.equal(h.recordLap("a|b", "race", 100), true);
  assert.equal(h.recordLap("a|b", "race", 101), false);
  assert.equal(h.recordLap("a|b", "race", 99.5), true);
  assert.equal(h.recordLap("a|b", "quali", 5), false); // inválida
  h.recordFuel("a|b", 3);
  h.recordFuel("a|b", 4);
  h.save();
  const h2 = createTrackHistory(f);
  assert.equal(h2.get("a|b").best.race, 99.5);
  assert.ok(Math.abs(h2.get("a|b").fuelPerLap - 3.3) < 1e-9);
});
test("archivo corrupto no rompe", () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "th-")), "h.json");
  fs.writeFileSync(f, "{nope");
  assert.equal(createTrackHistory(f).get("x"), null);
});
