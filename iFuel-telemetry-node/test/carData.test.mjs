import { test } from "node:test";
import assert from "node:assert/strict";
import { createCarTracker, CAR_VARS } from "../carData.mjs";

const starts = [0, 0.33, 0.66];
const mk = () => createCarTracker();
// avanza una vuelta a `lapTime` s repartida en pasos de 0.25 s desde pct0
function drive(t, { t0, pct0, laps, lapTime, vars = {}, lap = 1 }) {
  let out;
  const steps = Math.round(laps * lapTime / 0.25);
  for (let i = 0; i <= steps; i++) {
    const time = t0 + i * 0.25;
    const pct = (pct0 + (i * 0.25) / lapTime) % 1;
    out = t.update({ vars, sessionTime: time, lap, lapDistPct: pct, onPitRoad: false, sectorStarts: starts });
  }
  return out;
}

test("CAR_VARS no tiene duplicados", () => {
  assert.equal(new Set(CAR_VARS).size, CAR_VARS.length);
});

test("mide sectores con interpolación y marca el mejor", () => {
  const t = mk();
  const out = drive(t, { t0: 100.1, pct0: 0.001, laps: 2.1, lapTime: 100 });
  const [s1, s2, s3] = out.sectors;
  assert.ok(Math.abs(s1.time - 33) < 0.05, `s1=${s1.time}`);
  assert.ok(Math.abs(s2.time - 33) < 0.05, `s2=${s2.time}`);
  assert.ok(Math.abs(s3.time - 34) < 0.05, `s3=${s3.time}`);
  assert.equal(s1.status, "best");
});

test("una vuelta con boxes no puntúa y resetea", () => {
  const t = mk();
  drive(t, { t0: 0, pct0: 0.5, laps: 0.4, lapTime: 100 });
  const out = t.update({ vars: {}, sessionTime: 50, lap: 1, lapDistPct: 0.9, onPitRoad: true, sectorStarts: starts });
  assert.ok(out.sectors.every((s) => s.time == null));
});

test("neumáticos: guarda la lectura y cuenta vueltas desde que cambió", () => {
  const t = mk();
  const vars = { LFwearL: 0.95, LFwearM: 0.96, LFwearR: 0.97, LFtempCL: 80, LFtempCM: 85, LFtempCR: 82, LFcoldPressure: 165 };
  let out = t.update({ vars, sessionTime: 1, lap: 3, lapDistPct: 0.5, onPitRoad: false, sectorStarts: starts });
  assert.equal(out.tyres.wear.lf[1], 96);
  assert.equal(out.tyres.temp.lf[1], 85);
  assert.equal(out.tyres.lapsAgo, 0);
  out = t.update({ vars, sessionTime: 400, lap: 7, lapDistPct: 0.5, onPitRoad: false, sectorStarts: starts });
  assert.equal(out.tyres.lapsAgo, 4);
  out = t.update({ vars: { ...vars, LFwearM: 0.9 }, sessionTime: 500, lap: 8, lapDistPct: 0.5, onPitRoad: false, sectorStarts: starts });
  assert.equal(out.tyres.lapsAgo, 0);
});

test("delta, ajustes y ausencia de datos", () => {
  const t = mk();
  let out = t.update({ vars: { LapDeltaToBestLap: -0.18, LapDeltaToBestLap_OK: true, dcBrakeBias: 54.5, dcABS: 3 }, sessionTime: 1, lap: 1, lapDistPct: 0.1, onPitRoad: false, sectorStarts: starts });
  assert.equal(out.delta, -0.18);
  assert.equal(out.brakeBias, 54.5);
  assert.equal(out.abs, 3);
  assert.equal(out.tc1, null);
  assert.equal(out.tyres, null);
  out = t.update({ vars: { LapDeltaToBestLap: 1, LapDeltaToBestLap_OK: false }, sessionTime: 2, lap: 1, lapDistPct: 0.1, onPitRoad: false, sectorStarts: starts });
  assert.equal(out.delta, null);
});

import { createTraceBuffer } from "../carData.mjs";
test("traza: buffer circular y valores 0-100", () => {
  const b = createTraceBuffer({ hz: 10, seconds: 1 });
  for (let i = 0; i < 25; i++) b.push(i / 24, 1 - i / 24);
  const s = b.snapshot();
  assert.equal(s.throttle.length, 10);
  assert.equal(s.throttle.at(-1), 100);
  assert.equal(s.brake.at(-1), 0);
  b.push(NaN, 5);
  assert.equal(b.snapshot().throttle.at(-1), 0);
  assert.equal(b.snapshot().brake.at(-1), 100);
});
