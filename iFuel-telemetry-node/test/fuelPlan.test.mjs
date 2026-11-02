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

test("llegas a meta y solo falta margen de seguridad (<1 vuelta): no se manda a boxes", () => {
  const base = { fuelPerLap: 2.9, fuelCapacity: 46, myLap: 25, myPct: 0.64, pitPct: 0.98, safetyLaps: 1, timeRemain: -1, lapTime: 237 };
  const p = computeFuelPlan({ ...base, fuelLevel: 6.4, lapsRemain: 2 }); // 1.36 vueltas por rodar, 2.2 de gasolina
  assert.equal(p.status, "no-stop");
  assert.equal(p.stops, 0);
  const q = computeFuelPlan({ ...base, fuelLevel: 3.0, lapsRemain: 2 }); // 1.03 vueltas de gasolina: no llega
  assert.notEqual(q.status, "no-stop");
  assert.ok(q.stops >= 1);
});

test("lapsToRun: con el reloj agotado solo queda cruzar la meta, aunque el reloj vuelva a dar un valor raro", () => {
  const r = lapsToRun({ lapsRemain: 32767, timeRemain: 311, lapTime: 237, myPct: 0.73, timeExpired: true });
  assert.ok(Math.abs(r - 0.27) < 1e-9);
});

test("carrera por tiempo agotada: si el líder cruza la meta después de ti, te queda una vuelta más", () => {
  // Monza: reloj a 0 con 0,913 de vuelta; el líder va en 0,30 (pasa por meta después de mí) -> 0,087 + 1
  const behind = lapsToRun({ lapsRemain: 32767, timeRemain: 0, lapTime: 108, myPct: 0.913, timeExpired: true, leader: { pct: 0.3, lapTime: 107 } });
  assert.ok(Math.abs(behind - 1.087) < 1e-9);
  // Le Mans: el líder ya está por delante de mí en la vuelta (pasa antes): termino en mi primer paso por meta
  const ahead = lapsToRun({ lapsRemain: 32767, timeRemain: 0, lapTime: 200, myPct: 0.57, timeExpired: true, leader: { pct: 0.9, lapTime: 199 } });
  assert.ok(Math.abs(ahead - 0.43) < 1e-9);
  // Sin datos del líder (o si soy el líder) no se añade nada
  assert.ok(Math.abs(lapsToRun({ lapsRemain: 32767, timeRemain: 0, lapTime: 108, myPct: 0.913, timeExpired: true }) - 0.087) < 1e-9);
});

test("carrera por tiempo en curso: el final cuenta la vuelta extra si el líder cruza la meta después de ti", () => {
  // 300 s por delante, vuelta de 100 s, estoy en 0,5; el líder en 0,2. Mis pasos por meta: 50, 150, 250, 350 -> primero >=300 es 350
  // (0,5 + 3 = 3,5 vueltas); el líder cruza en 80, 180, 280, 380 -> primero >=300 es 380, DESPUÉS de mí: +1 vuelta
  const r = lapsToRun({ lapsRemain: 32767, timeRemain: 300, lapTime: 100, myPct: 0.5, leader: { pct: 0.2, lapTime: 100 } });
  assert.ok(Math.abs(r - 4.5) < 1e-9);
  const noLeader = lapsToRun({ lapsRemain: 32767, timeRemain: 300, lapTime: 100, myPct: 0.5 });
  assert.ok(Math.abs(noLeader - 3.5) < 1e-9);
});

test("la tolerancia de margen corto depende del margen elegido (mitad del margen)", () => {
  const base = { fuelPerLap: 2.9, fuelCapacity: 46, myLap: 25, myPct: 0.64, pitPct: 0.98, timeRemain: -1, lapTime: 237, lapsRemain: 2 };
  // 1,36 vueltas por rodar. Con margen 1: faltan 0,16 vueltas para el margen entero -> tolerado (< 0,5)
  assert.equal(computeFuelPlan({ ...base, safetyLaps: 1, fuelLevel: 6.4 }).status, "no-stop");
  // Con margen 0,5 y 4,6 L (1,59 vueltas): el margen pide 1,86 vueltas, faltan 0,27 > 0,25 -> ya no se tolera
  assert.notEqual(computeFuelPlan({ ...base, safetyLaps: 0.5, fuelLevel: 4.6 }).status, "no-stop");
});

import { updateTimeLatch } from "../fuelPlan.mjs";
test("la cuenta atrás de parrilla no cuenta como fin de carrera (Le Mans, beta.23)", () => {
  let s = { timeWasRunning: false, timeExpired: false };
  // cuenta atrás previa a la salida: SessionState 3 (parade/gridding), T llega a 0
  for (const T of [118, 50, 12, 0.5, -1]) s = updateTimeLatch(s, { timeRemain: T, sessionState: 3 });
  assert.equal(s.timeExpired, false);
  // arranca la carrera
  s = updateTimeLatch(s, { timeRemain: 2697, sessionState: 4 });
  assert.equal(s.timeExpired, false);
  assert.equal(s.timeWasRunning, true);
  // llega a 0 en carrera: ahora sí
  s = updateTimeLatch(s, { timeRemain: 0.4, sessionState: 4 });
  assert.equal(s.timeExpired, true);
  // valores raros tras el 0 no lo desactivan
  s = updateTimeLatch(s, { timeRemain: 311, sessionState: 5 });
  assert.equal(s.timeExpired, true);
});
test("sin SessionState (desconocido) conserva el comportamiento anterior", () => {
  let s = { timeWasRunning: false, timeExpired: false };
  s = updateTimeLatch(s, { timeRemain: 100 });
  s = updateTimeLatch(s, { timeRemain: 0.2 });
  assert.equal(s.timeExpired, true);
});
test("en replay no cambia nada", () => {
  const s0 = { timeWasRunning: true, timeExpired: false };
  assert.deepEqual(updateTimeLatch(s0, { timeRemain: 0, sessionState: 4, replay: true }), s0);
});
