import { test } from "node:test";
import assert from "node:assert/strict";
import { createCarSpeedTracker } from "../carSpeed.mjs";

const L = 4000; // m
const read = (t, sessionTime, pcts, surfaces) =>
  t({ sessionTime, carIdxLapDistPct: pcts, carIdxTrackSurface: surfaces ?? pcts.map(() => 3), trackLengthMeters: L });

test("primera lectura: velocidades desconocidas (null), nunca 0", () => {
  const t = createCarSpeedTracker();
  assert.deepEqual(read(t, 0, [0.1, 0.2]), [null, null]);
});

test("deriva m/s del avance de LapDistPct y marca parado = 0", () => {
  const t = createCarSpeedTracker();
  read(t, 0, [0.5, 0.6]);
  const [moving, stopped] = read(t, 0.25, [0.5 + (60 * 0.25) / L, 0.6]);
  assert.ok(Math.abs(moving - 60) < 1e-6);
  assert.equal(stopped, 0);
});

test("cruce de meta hacia delante no da velocidad negativa", () => {
  const t = createCarSpeedTracker();
  read(t, 0, [0.999]);
  const [s] = read(t, 0.25, [0.002]);
  assert.ok(Math.abs(s - ((0.003 * L) / 0.25)) < 1e-6);
});

test("coche fuera del mundo (pct -1 o superficie -1) y retroceso -> null", () => {
  const t = createCarSpeedTracker();
  read(t, 0, [0.5, 0.5, 0.5]);
  const out = read(t, 0.25, [-1, 0.52, 0.3], [3, -1, 3]);
  assert.deepEqual(out, [null, null, null]);
});

test("pausa (mismo tiempo) mantiene; salto grande o retroceso del tiempo -> null", () => {
  const t = createCarSpeedTracker();
  read(t, 10, [0.1]);
  const first = read(t, 10.25, [0.1 + 15 / L]);
  assert.ok(first[0] > 0);
  assert.deepEqual(read(t, 10.25, [0.5]), first); // en pausa: no recalcula
  assert.deepEqual(read(t, 60, [0.9]), [null]); // salto de 50 s (replay/menu)
  assert.deepEqual(read(t, 5, [0.2]), [null]); // el tiempo retrocede
});

test("sin longitud de pista no se puede derivar", () => {
  const t = createCarSpeedTracker();
  t({ sessionTime: 0, carIdxLapDistPct: [0.1], carIdxTrackSurface: [3], trackLengthMeters: null });
  const out = t({ sessionTime: 0.25, carIdxLapDistPct: [0.2], carIdxTrackSurface: [3], trackLengthMeters: null });
  assert.deepEqual(out, [null]);
});
