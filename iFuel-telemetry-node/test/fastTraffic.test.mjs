import test from "node:test";
import assert from "node:assert/strict";
import { computeFastTraffic } from "../fastTraffic.mjs";

const me = { myIdx: 0, myClassId: 1, myPct: 0.5, myPace: 120 };
const car = (o) => ({ idx: 5, pct: 0.45, classId: 2, carNum: "7", bestLap: 110, lastLap: 111, onPit: 0, ...o });

test("clase rápida detrás: tiempo de alcance por ritmo relativo", () => {
  const r = computeFastTraffic({ ...me, cars: [car({ pct: 0.47 })], maxCatchSeconds: 120 });
  assert.equal(r.carNum, "7");
  assert.ok(Math.abs(r.gapSeconds - 3.6) < 0.01);
  // 0.05 vueltas a 0.000758 v/s = 66 s: aún no avisa (ver siguiente test)
});

test("avisa solo si te alcanza pronto; ignora misma clase, boxes y coches delante", () => {
  assert.equal(computeFastTraffic({ ...me, cars: [car({ pct: 0.45 })] }), null); // 66 s
  const near = computeFastTraffic({ ...me, cars: [car({ pct: 0.48 })] });
  assert.ok(near && near.catchInSeconds < 30);
  assert.equal(computeFastTraffic({ ...me, cars: [car({ pct: 0.48, classId: 1 })] }), null);
  assert.equal(computeFastTraffic({ ...me, cars: [car({ pct: 0.48, onPit: 1 })] }), null);
  assert.equal(computeFastTraffic({ ...me, cars: [car({ pct: 0.6 })] }), null); // delante
  assert.equal(computeFastTraffic({ ...me, cars: [car({ pct: 0.48, bestLap: 119 })] }), null); // no es más rápido
});

test("con varios elige el que te alcanza antes y cuenta los demás", () => {
  const r = computeFastTraffic({ ...me, cars: [car({ pct: 0.48, carNum: "A" }), car({ idx: 6, pct: 0.495, carNum: "B" })] });
  assert.equal(r.carNum, "B");
  assert.equal(r.count, 2);
});

test("cruce de la meta: el coche está detrás aunque su % sea mayor", () => {
  const r = computeFastTraffic({ ...me, myPct: 0.02, cars: [car({ pct: 0.99 })] });
  assert.ok(r && Math.abs(r.gapSeconds - 3.6) < 0.01);
});

test("bandera azul: un coche de tu clase con más vueltas que viene detrás también avisa", () => {
  const base = { ...me, myLap: 5 };
  const lapper = car({ pct: 0.48, classId: 1, lapIdx: 6 }); // 1 vuelta más y detrás en pista
  const r = computeFastTraffic({ ...base, cars: [lapper] });
  assert.ok(r && r.lapping);
  assert.equal(computeFastTraffic({ ...base, cars: [car({ pct: 0.48, classId: 1, lapIdx: 5 })] }), null, "misma vuelta: no es azul");
});
