import { test } from "node:test";
import assert from "node:assert/strict";
import { pitCall } from "../src/utils/pitCall.ts";
import { pitboardAlert } from "../src/utils/pitboardAlert.ts";

test("pitCall: sin datos, sin parada, crítico", () => {
  assert.equal(pitCall(undefined, 5).tone, "idle");
  assert.equal(pitCall({ suggestedLap: null, options: [], windowStatus: "no-stop" }, 5).headline, "SIN PARADA");
  assert.equal(pitCall({ suggestedLap: null, options: [], windowStatus: "critical" }, 5).tone, "bad");
});
test("pitCall: box ahora / próxima / en vuelta N", () => {
  const base = { suggestedLap: 16, options: [{ lap: 15, trafficScore: 2 }, { lap: 16, trafficScore: 0 }], windowStatus: "window" };
  const now = pitCall({ ...base, nextPitLap: 16 }, 16);
  assert.equal(now.headline, "BOX AHORA"); assert.equal(now.tone, "go"); assert.equal(now.pick, 16);
  assert.equal(pitCall({ ...base, nextPitLap: 16 }, 15).headline, "BOX PRÓXIMA VUELTA");
  assert.equal(pitCall({ ...base, nextPitLap: 14, nowScore: 2 }, 12).headline, "BOX EN V16");
  assert.deepEqual(now.laps.map((l) => l.lap), [15, 16]);
});
test("alerta: prioridad pit lane > sanción > amarilla > tráfico", () => {
  const all = { pitHelper: { status: "ok", limitKph: 60, boxDistM: 85 }, myPenalty: "black", yellow: { active: true, type: "debris", distanceMeters: 300 }, fastTraffic: { carNum: "7", catchInSeconds: 20 } };
  assert.equal(pitboardAlert(all).tag, "PIT LANE");
  assert.equal(pitboardAlert({ ...all, pitHelper: null }).tag, "SANCIÓN");
  assert.equal(pitboardAlert({ ...all, pitHelper: null, myPenalty: null }).msg, "DEBRIS a 300 m");
  assert.equal(pitboardAlert({ ...all, pitHelper: null, myPenalty: null, yellow: null }).tag, "TRÁFICO");
  assert.equal(pitboardAlert({}), null);
});
test("alerta: debris lejano sin cifra y pit lane con exceso", () => {
  assert.equal(pitboardAlert({ yellow: { active: true, type: "debris", distanceMeters: 2500 } }).msg, "DEBRIS");
  const a = pitboardAlert({ pitHelper: { status: "speeding", limitKph: 60, boxDistM: 85 } });
  assert.equal(a.tone, "danger"); assert.match(a.msg, /REDUCE VELOCIDAD · límite 60 · tu box a 85 m/);
});
