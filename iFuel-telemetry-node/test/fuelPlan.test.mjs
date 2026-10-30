import test from "node:test";
import assert from "node:assert/strict";
import { lapsToRun, computeFuelPlan } from "../fuelPlan.mjs";
import { createFuelModel } from "../fuelModel.mjs";

test("lapsToRun: carrera por vueltas descuenta la fracción de la vuelta en curso", () => {
  assert.ok(Math.abs(lapsToRun({ lapsRemain: 10, timeRemain: -1, lapTime: 100, myPct: 0.25 }) - 9.75) < 1e-9);
});

test("lapsToRun: carrera por tiempo cuenta los pasos por meta hasta que se agota el reloj", () => {
  assert.equal(lapsToRun({ lapsRemain: 32767, timeRemain: 20, lapTime: 100, myPct: 0.5 }), 0.5); // se agota antes de la línea
  const r = lapsToRun({ lapsRemain: 32767, timeRemain: 250, lapTime: 100, myPct: 0.5 });
  assert.ok(Math.abs(r - 2.5) < 1e-9); // cruzas la línea en t=50, 150 y 250 (el reloj se agota ahí): 0.5 + 2 vueltas
});

test("lapsToRun: sin dato de duración devuelve null", () => {
  assert.equal(lapsToRun({ lapsRemain: 32767, timeRemain: -1, lapTime: 100, myPct: 0.1 }), null);
});

test("el plan da los mismos litros que el cálculo manual y no depende de cuándo pares", () => {
  const base = { fuelCapacity: 100, fuelPerLap: 5, myLap: 4, safetyLaps: 1, pitPct: 0.02, lapsRemain: 20, timeRemain: -1, lapTime: 100 };
  const a = computeFuelPlan({ ...base, fuelLevel: 40, myPct: 0.3 });
  // 20 - 0.3 = 19.7 laps + 1 de margen = 20.7 * 5 = 103.5 - 40 = 63.5
  assert.ok(Math.abs(a.litersToAdd - 63.5) < 1e-6);
  assert.equal(a.status, "window");
  assert.equal(a.stops, 1);
});

test("sin parada necesaria", () => {
  const p = computeFuelPlan({ fuelCapacity: 100, fuelPerLap: 5, myLap: 4, myPct: 0.3, fuelLevel: 90, safetyLaps: 1, pitPct: 0.02, lapsRemain: 10, timeRemain: -1, lapTime: 100 });
  assert.equal(p.status, "no-stop");
  assert.equal(p.stops, 0);
  assert.equal(p.litersToAdd, 0);
});

test("fuelModel: mide el consumo rodando, sin vueltas válidas", () => {
  const m = createFuelModel();
  let fuel = 50;
  for (let i = 0; i <= 100; i++) {
    const lapPos = 3 + i * 0.008; // 0.8 vueltas
    m.update({ fuelLevel: fuel, lap: Math.floor(lapPos), lapDistPct: lapPos - Math.floor(lapPos), onPitRoad: false });
    fuel -= 0.008 * 7.4;
  }
  assert.ok(Math.abs(m.perLap - 7.4) < 0.1);
});

test("fuelModel: no tiene dato con menos de media vuelta ni cuenta boxes ni repostajes", () => {
  const m = createFuelModel();
  m.update({ fuelLevel: 50, lap: 1, lapDistPct: 0.1, onPitRoad: false });
  m.update({ fuelLevel: 49.9, lap: 1, lapDistPct: 0.11, onPitRoad: false });
  assert.equal(m.perLap, null);
  // repostaje en boxes: no suma consumo ni distancia
  m.update({ fuelLevel: 20, lap: 1, lapDistPct: 0.2, onPitRoad: true });
  m.update({ fuelLevel: 60, lap: 1, lapDistPct: 0.21, onPitRoad: true });
  m.update({ fuelLevel: 60, lap: 1, lapDistPct: 0.22, onPitRoad: false });
  assert.equal(m.lapsMeasured < 0.05, true);
});
