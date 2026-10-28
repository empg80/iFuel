import { test } from "node:test";
import assert from "node:assert/strict";
import { createPitLossTracker } from "../pitLoss.mjs";

const step = (t, time, onPitRoad, pct) => t.update({ onPitRoad, sessionTime: time, lapDistPct: pct, baseLapTime: 100 });

test("la salida inicial del box no cuenta como parada", () => {
  const t = createPitLossTracker();
  assert.equal(step(t, 0, false, -1), null); // fuera del mundo
  step(t, 5, true, 0.067); // aparece ya en el pit road
  step(t, 50, false, 0.075);
  assert.equal(t.stops, 0);
  assert.equal(step(t, 51, false, 0.08), null);
});

test("mide la pérdida: tiempo en pit road menos el tramo a ritmo de carrera", () => {
  const t = createPitLossTracker();
  step(t, 0, false, 0.5);
  step(t, 800, false, 0.95);
  step(t, 801, true, 0.96); // entra al pit road en 0.96
  step(t, 850, true, 0.01);
  // sale en 0.11: tramo 0.15 vueltas = 15 s; estuvo 54 s => pérdida 39 s
  const loss = step(t, 855, false, 0.11);
  assert.ok(Math.abs(loss - 39) < 0.01, `loss=${loss}`);
  assert.equal(t.stops, 1);
});

test("descarta medidas imposibles y se reinicia", () => {
  const t = createPitLossTracker();
  step(t, 0, false, 0.5);
  step(t, 10, true, 0.5);
  assert.equal(step(t, 400, false, 0.51), null); // 390 s de pérdida: no fiable
  t.reset();
  assert.equal(t.stops, 0);
});

test("lecturas fuera del mundo (garaje, replay) no marcan la salida inicial como parada", () => {
  const t = createPitLossTracker();
  // replay: OnPitRoad false y pct 0 aunque el coche aún no esté en pista
  t.update({ onPitRoad: false, sessionTime: 0, lapDistPct: 0, baseLapTime: 100, inWorld: false });
  t.update({ onPitRoad: true, sessionTime: 5, lapDistPct: 0.067, baseLapTime: 100, inWorld: true });
  t.update({ onPitRoad: false, sessionTime: 60, lapDistPct: 0.075, baseLapTime: 100, inWorld: true });
  assert.equal(t.stops, 0);
});
