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

test("al pasar el incidente el aviso desaparece aunque la bandera siga puesta", () => {
  const t = createYellowTracker();
  const stopped = car(1, 0.12, { speed: 0, surface: 0 });
  // incidente a 80 m por delante
  let w = t.update({ sessionFlags: FLAG_DEBRIS, cars: [car(0, 0.1), stopped], myIdx: 0, myPct: 0.1, mySpeed: 50, trackLengthMeters: TRACK, baseLapTime: 100, sessionTime: 10 });
  assert.equal(w.active, true);
  assert.ok(w.distanceMeters < 100);
  // ya lo has pasado (estás por delante del coche parado) y la bandera sigue
  w = t.update({ sessionFlags: FLAG_DEBRIS, cars: [car(0, 0.13), stopped], myIdx: 0, myPct: 0.13, mySpeed: 50, trackLengthMeters: TRACK, baseLapTime: 100, sessionTime: 11 });
  assert.equal(w.active, false);
  w = t.update({ sessionFlags: FLAG_DEBRIS, cars: [car(0, 0.14), stopped], myIdx: 0, myPct: 0.14, mySpeed: 50, trackLengthMeters: TRACK, baseLapTime: 100, sessionTime: 12 });
  assert.equal(w.active, false);
  // la bandera se apaga y se vuelve a levantar con otro coche delante: aviso nuevo
  t.update({ sessionFlags: 0, cars: [car(0, 0.5)], myIdx: 0, myPct: 0.5, mySpeed: 50, trackLengthMeters: TRACK, baseLapTime: 100, sessionTime: 60 });
  w = t.update({ sessionFlags: FLAG_DEBRIS, cars: [car(0, 0.5), car(2, 0.55, { speed: 1, surface: 0 })], myIdx: 0, myPct: 0.5, mySpeed: 50, trackLengthMeters: TRACK, baseLapTime: 100, sessionTime: 61 });
  assert.equal(w.active, true);
});

test("sin coche localizado el aviso se apaga casi al soltar la bandera", () => {
  const t = createYellowTracker();
  run(t, FLAG_DEBRIS, [car(0, 0.1)], 100);
  assert.equal(run(t, 0, [car(0, 0.1)], 100.8).active, true);
  assert.equal(run(t, 0, [car(0, 0.1)], 102).active, false);
});

test("una curva lenta no es un incidente: se compara con lo que hacen los demás coches en esa zona", () => {
  const t = createYellowTracker();
  // 12 coches pasan a 15 m/s por la horquilla (pct 0.3) y se aprende ese ritmo
  const slowCorner = Array.from({ length: 12 }, (_, i) => car(i + 1, 0.3, { speed: 15 }));
  run(t, 0, [car(0, 0.1), ...slowCorner], 50);
  // con bandera, un coche a 14 m/s en la horquilla es normal; uno a 2 m/s (parado en el sentido de la zona) cuenta
  let w = run(t, FLAG_DEBRIS, [car(0, 0.1), car(20, 0.3, { speed: 14 })], 60);
  assert.equal(w.carNum, null);
  w = run(t, FLAG_DEBRIS, [car(0, 0.1), car(21, 0.3, { speed: 4 })], 61);
  assert.equal(w.carNum, "21");
});

test("sin velocidad propia suficiente no se calcula el tiempo", () => {
  const t = createYellowTracker();
  const w = t.update({ sessionFlags: FLAG_DEBRIS, cars: [car(0, 0.1), car(1, 0.2, { speed: 0, surface: 0 })], myIdx: 0, myPct: 0.1, mySpeed: 3, trackLengthMeters: TRACK, baseLapTime: 100, sessionTime: 0 });
  assert.ok(w.distanceMeters > 0);
  assert.equal(w.timeSeconds, null);
});
