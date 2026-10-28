import { test } from "node:test";
import assert from "node:assert/strict";
import { relativeGapSeconds } from "../relativeGap.mjs";

const base = { lapRef: 100, fallbackLap: 100, sameClass: true };

test("coche por delante: diferencia de EstTime", () => {
  const g = relativeGapSeconds({ ...base, dPct: 0.05, myEst: 40, otherEst: 44 });
  assert.equal(g, 4);
});
test("pista no lineal: usa EstTime y no el porcentaje", () => {
  // por % serian 5 s, pero la zona es lenta y EstTime dice 7 s
  const g = relativeGapSeconds({ ...base, dPct: 0.05, myEst: 40, otherEst: 47 });
  assert.equal(g, 7);
});
test("coche por detras: gap negativo", () => {
  assert.equal(relativeGapSeconds({ ...base, dPct: -0.04, myEst: 40, otherEst: 36 }), -4);
});
test("cruce de la linea de meta por delante: EstTime vuelve a empezar", () => {
  // yo en 98 s de vuelta, el otro acaba de cruzar y esta en 2 s: va 4 s por delante
  const g = relativeGapSeconds({ ...base, dPct: 0.04, myEst: 98, otherEst: 2 });
  assert.equal(g, 4);
});
test("cruce de la linea de meta por detras", () => {
  const g = relativeGapSeconds({ ...base, dPct: -0.04, myEst: 2, otherEst: 98 });
  assert.equal(g, -4);
});
test("otra clase o sin EstTime: cae al calculo lineal", () => {
  assert.equal(relativeGapSeconds({ ...base, dPct: 0.05, myEst: 40, otherEst: 44, sameClass: false }), 5);
  assert.equal(relativeGapSeconds({ ...base, dPct: 0.05, myEst: NaN, otherEst: 44 }), 5);
  assert.equal(relativeGapSeconds({ ...base, dPct: 0.05, myEst: undefined, otherEst: undefined }), 5);
});
test("EstTime incoherente con la geometria: cae al lineal", () => {
  assert.equal(relativeGapSeconds({ ...base, dPct: 0.05, myEst: 40, otherEst: 80 }), 5);
});
test("sin tiempo de referencia devuelve null", () => {
  assert.equal(relativeGapSeconds({ dPct: 0.05, myEst: 1, otherEst: 2, lapRef: 0, fallbackLap: 0 }), null);
  assert.equal(relativeGapSeconds({ ...base, dPct: NaN }), null);
});
