import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPitPasses } from "../pitPasses.mjs";

const base = { status: "window", fuelPerLap: 3, fuelCapacity: 46, safetyLaps: 1, lossFor: () => 30 };

test("una parada demasiado pronto, cuyos litros no caben en el depósito, no se propone", () => {
  // 20 vueltas por rodar, 27 L ahora: parar en 1 vuelta = quedan 24 L + hueco 22; hacen falta (19+1)*3-24 = 36 L > 22
  const passes = [1, 5, 9].map((k, n) => ({ lap: 10 + n, lapsToPit: k }));
  const r = buildPitPasses({ ...base, passes, fuelLevel: 27, remaining: 20 });
  assert.ok(r.every((p) => p.fits));
  assert.ok(!r.some((p) => p.lapsToPit === 1));
  assert.ok(r.some((p) => p.lapsToPit === 9));
  for (const p of r) assert.ok(p.liters <= p.room + 1e-9);
});

test("con extra-stop se conservan todos los pasos aunque no quepan", () => {
  const passes = [{ lap: 10, lapsToPit: 1 }, { lap: 11, lapsToPit: 2 }];
  const r = buildPitPasses({ ...base, status: "extra-stop", passes, fuelLevel: 27, remaining: 40 });
  assert.equal(r.length, 2);
  assert.ok(r.some((p) => !p.fits));
});
