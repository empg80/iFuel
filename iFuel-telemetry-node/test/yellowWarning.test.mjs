import { test } from "node:test";
import assert from "node:assert/strict";
import { createYellowTracker, FLAG_DEBRIS, FLAG_YELLOW_WAVING } from "../yellowWarning.mjs";

const TRACK = 4000; // m
const me = { idx: 0, pct: 0.1 };
const car = (idx, pct, o = {}) => ({ idx, pct, speed: 60, surface: 3, onPit: 0, lastLap: 100, bestLap: 100, carNum: String(idx), classId: 1, posClass: 2, ...o });
const run = (t, flags, cars, time = 0) =>
  t.update({ sessionFlags: flags, cars, myIdx: 0, myPct: me.pct, mySpeed: 50, trackLengthMeters: TRACK, baseLapTime: 100, sessionTime: time });

test("debris con un coche trompeado delante: da distancia y tiempo", () => {
  const t = createYellowTracker();
  // coche 1 fuera de pista y casi parado a 0.1 vueltas (400 m)
  const w = run(t, FLAG_DEBRIS, [car(0, 0.1), car(1, 0.2, { speed: 3, surface: 0 })]);
  assert.equal(w.active, true);
  assert.equal(w.type, "debris");
  assert.ok(Math.abs(w.distanceMeters - 400) < 0.5);
  assert.ok(Math.abs(w.timeSeconds - 8) < 0.01);
  assert.equal(w.carNum, "1");
});

test("amarilla: elige el incidente más cercano por delante y marca tipo incidente", () => {
  const t = createYellowTracker();
  const w = run(t, FLAG_YELLOW_WAVING, [car(0, 0.1), car(1, 0.4, { speed: 0 }), car(2, 0.25, { speed: 2 })]);
  assert.equal(w.type, "incident");
  assert.equal(w.carNum, "2");
});

test("coche lento para su ritmo (trompo, recuperando) cuenta; coches normales, en boxes o fuera del mundo no", () => {
  const t = createYellowTracker();
  const cars = [
    car(0, 0.1),
    car(1, 0.15, { speed: 60 }), // ritmo normal (40 m/s de media ...)
    car(2, 0.2, { onPit: 1, speed: 0 }),
    car(3, 0.22, { surface: -1, speed: 0 }),
    car(4, 0.3, { speed: 10 }), // 10 m/s con ritmo normal 40 m/s: lento
  ];
  const w = run(t, FLAG_DEBRIS, cars);
  assert.equal(w.carNum, "4");
});

test("un coche parado justo detrás de ti no se anuncia como si estuviera delante", () => {
  const t = createYellowTracker();
  const w = run(t, FLAG_DEBRIS, [car(0, 0.1), car(1, 0.09, { speed: 0, surface: 0 })]);
  assert.equal(w.active, true);
  assert.equal(w.distanceMeters, null);
});

test("bandera sin coche identificable: activa sin distancia", () => {
  const t = createYellowTracker();
  const w = run(t, FLAG_YELLOW_WAVING, [car(0, 0.1), car(1, 0.3)]);
  assert.equal(w.active, true);
  assert.equal(w.distanceMeters, null);
  assert.equal(w.type, "debris"); // sin coche claro se muestra el aviso rayado, no un incidente inventado
});

test("el aviso se mantiene unos segundos al apagarse la bandera y luego desaparece", () => {
  const t = createYellowTracker();
  const cars = [car(0, 0.1), car(1, 0.2, { speed: 0, surface: 0 })];
  run(t, FLAG_DEBRIS, cars, 100);
  assert.equal(run(t, 0, cars, 104).active, true);
  assert.equal(run(t, 0, cars, 107).active, false);
});

test("sin flags ni longitud de pista no avisa", () => {
  const t = createYellowTracker();
  assert.equal(run(t, 0, [car(0, 0.1)]).active, false);
  const w = t.update({ sessionFlags: FLAG_DEBRIS, cars: [], myIdx: 0, myPct: 0, mySpeed: 0, trackLengthMeters: 0, baseLapTime: 100, sessionTime: 0 });
  assert.equal(w.active, false);
});
