import test from "node:test";
import assert from "node:assert/strict";
import { computePitWindow } from "../pitWindow.mjs";
import { createPitLossTracker } from "../pitLoss.mjs";
import { computePitClearAirSuggestion } from "../pitClearAir.mjs";

const base = { fuelPerLap: 2.5, fuelCapacity: 110, myLap: 10, myPct: 0.5, pitPct: 0.07, safetyLaps: 1 };

test("ventana: del primer paso con un depósito suficiente al último con autonomía", () => {
  const w = computePitWindow({ ...base, fuelLevel: 80, lapsToFinish: 51 });
  assert.equal(w.status, "window");
  assert.equal(w.startLap, 31);
  assert.equal(w.endLap, 42);
  assert.ok(w.passes.every((p) => p.lapsToPit * 2.5 <= 80 - 0.25 * 2.5));
});

test("ventana: sin parada si el combustible llega a meta con margen", () => {
  assert.equal(computePitWindow({ ...base, fuelLevel: 100, lapsToFinish: 30 }).status, "no-stop");
});

test("ventana: parada extra si un solo repostaje no llega", () => {
  const w = computePitWindow({ ...base, fuelLevel: 20, lapsToFinish: 120 });
  assert.equal(w.status, "extra-stop");
  assert.ok(w.passes.length > 0);
});

test("ventana: crítico si no llegas ni al próximo paso por boxes", () => {
  const w = computePitWindow({ ...base, fuelLevel: 1, lapsToFinish: 51 });
  assert.equal(w.status, "critical");
});

test("ventana: desconocida sin consumo, sin box o sin final", () => {
  assert.equal(computePitWindow({ ...base, fuelPerLap: 0, fuelLevel: 80, lapsToFinish: 51 }).status, "unknown");
  assert.equal(computePitWindow({ ...base, pitPct: -1, fuelLevel: 80, lapsToFinish: 51 }).status, "unknown");
  assert.equal(computePitWindow({ ...base, fuelLevel: 80, lapsToFinish: null }).status, "unknown");
});

test("pitLoss: mide el ritmo de repostaje y lossFor cambia con los litros", () => {
  const t = createPitLossTracker();
  const lap = 90;
  for (let s = 0; s < 10; s++) t.update({ onPitRoad: false, sessionTime: s, lapDistPct: 0.9 + s * 0.005, baseLapTime: lap, fuelLevel: 10 });
  t.update({ onPitRoad: true, sessionTime: 10, lapDistPct: 0.95, baseLapTime: lap, fuelLevel: 10 });
  // 4 s de entrada, luego repostaje 2.5 L/s durante 10 s, luego sale
  let fuel = 10;
  for (let s = 11; s <= 13; s++) t.update({ onPitRoad: true, sessionTime: s, lapDistPct: 0.96, baseLapTime: lap, fuelLevel: fuel });
  for (let s = 14; s <= 24; s++) { fuel += 2.5; t.update({ onPitRoad: true, sessionTime: s, lapDistPct: 0.97, baseLapTime: lap, fuelLevel: fuel }); }
  t.update({ onPitRoad: false, sessionTime: 30, lapDistPct: 0.05, baseLapTime: lap, fuelLevel: fuel });
  assert.ok(Math.abs(t.fuelRate - 2.5) < 0.2);
  const full = t.lossFor(25);
  const half = t.lossFor(12.5);
  assert.ok(Math.abs(full - t.lastLoss) < 1.5);
  assert.ok(full - half > 4); // 12.5 L menos = ~5 s menos
});

test("pitLoss: sin repostaje medido devuelve la última pérdida", () => {
  const t = createPitLossTracker();
  assert.equal(t.lossFor(30), null);
});

test("pitClearAir con pasos y box: usa la posición del box y la pérdida de cada paso", () => {
  const cars = [
    { idx: 0, pct: 0.2, lastLap: 90, onPit: false, carNum: "1" },
    { idx: 1, pct: 0.2, lastLap: 90, onPit: false, carNum: "7" },
  ];
  const passes = [
    { lap: 5, lapsToPit: 0.4, lossSeconds: 20 },
    { lap: 6, lapsToPit: 1.4, lossSeconds: 20 },
  ];
  const r = computePitClearAirSuggestion({ myLap: 5, myPct: 0.6, cars, myIdx: 0, baseLapTime: 90, pitPct: 0.99, passes, pitDeltaSeconds: 32 });
  assert.equal(r.options.length, 2);
  assert.equal(r.nextPitLap, 5);
  assert.ok(r.options[0].lossSeconds === 20);
});

test("pitLoss: reaparecer en boxes (reset, salida de garaje) no cuenta como parada", () => {
  const t = createPitLossTracker();
  const lap = 210;
  t.update({ onPitRoad: false, sessionTime: 0, lapDistPct: 0, baseLapTime: lap, fuelLevel: 58 });
  // aparece de golpe en boxes, 16 s después sale
  for (let s = 10; s <= 26; s++) t.update({ onPitRoad: true, sessionTime: s, lapDistPct: 0.012 + (s - 10) * 0.001, baseLapTime: lap, fuelLevel: 58 });
  t.update({ onPitRoad: false, sessionTime: 27, lapDistPct: 0.03, baseLapTime: lap, fuelLevel: 58 });
  assert.equal(t.lastLoss, null);
  assert.equal(t.stops, 0);
});

test("pitLoss: una parada real tras rodar por pista sí cuenta", () => {
  const t = createPitLossTracker();
  const lap = 100;
  for (let s = 0; s < 60; s += 1) t.update({ onPitRoad: false, sessionTime: s, lapDistPct: (s / lap) % 1, baseLapTime: lap, fuelLevel: 40 });
  // entra en boxes sin hueco: pct 0.60 -> 0.66 en 25 s
  for (let s = 60; s <= 85; s++) t.update({ onPitRoad: true, sessionTime: s, lapDistPct: 0.6 + (s - 60) * 0.0024, baseLapTime: lap, fuelLevel: 40 });
  t.update({ onPitRoad: false, sessionTime: 86, lapDistPct: 0.66, baseLapTime: lap, fuelLevel: 40 });
  assert.equal(t.stops, 1);
  assert.ok(t.lastLoss > 15 && t.lastLoss < 30);
});
