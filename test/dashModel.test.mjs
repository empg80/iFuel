import { test } from "node:test";
import assert from "node:assert/strict";
import { gearLabel, rpmFraction, shiftState, buildRibbon } from "../src/utils/dashModel.ts";

test("dash: marcha, arco de RPM y luces de cambio", () => {
  assert.equal(gearLabel(-1), "R"); assert.equal(gearLabel(0), "N"); assert.equal(gearLabel(4), "4"); assert.equal(gearLabel(null), "–");
  const info = { idle: 900, first: 6000, shift: 7200, last: 7600, blink: 7800, redline: 8000 };
  assert.equal(rpmFraction({ rpm: 4000, rpmInfo: info }), 0.5);
  assert.equal(rpmFraction({ rpm: 9000, rpmInfo: info }), 1);
  assert.equal(rpmFraction({ rpm: null, rpmInfo: info }), 0);
  assert.equal(shiftState({ rpm: 5000, shiftPct: 0, rpmInfo: info }), "off");
  assert.equal(shiftState({ rpm: 7300, shiftPct: 0, rpmInfo: info }), "shift");
  assert.equal(shiftState({ rpm: 7900, shiftPct: 0, rpmInfo: info }), "blink");
  assert.equal(shiftState({ rpm: 6000, shiftPct: 0.99, rpmInfo: null }), "shift");
});

test("dash: cinta de carrera con ventana, BOX, combustible y meta", () => {
  const r = buildRibbon({ lap: 12, count: 6, scores: [{ lap: 14, score: 0 }, { lap: 15, score: 2 }], windowStart: 14, windowEnd: 15, pick: 14, fuelEndLap: 16, finishLap: 17 });
  assert.equal(r.length, 6);
  assert.equal(r[0].label, "ya"); assert.equal(r[0].now, true);
  assert.equal(r[2].box, true); assert.equal(r[2].inWindow, true); assert.equal(r[2].score, 0);
  assert.equal(r[5].beyondFuel, true);
  assert.equal(buildRibbon({ lap: 12, count: 10, scores: [], windowStart: null, windowEnd: null, pick: null, fuelEndLap: null, finishLap: 14 }).length, 3);
});
