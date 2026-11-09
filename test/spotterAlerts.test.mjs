import { test } from "node:test";
import assert from "node:assert/strict";
import { alertsFor, initialAlertMemory } from "../src/spotter/alerts.ts";

test("clase rápida: avisa una vez por coche y repite pasados 40 s", () => {
  let m = initialAlertMemory();
  const ft = { carNum: "7", classId: 4029, catchInSeconds: 20 };
  let r = alertsFor(m, { fastTraffic: ft, classNames: { 4029: "LMP2" }, nowMs: 1000 });
  assert.deepEqual(r.say, ["LMP2 por detrás, número 7"]);
  r = alertsFor(r.mem, { fastTraffic: ft, nowMs: 5000 });
  assert.deepEqual(r.say, []);
  r = alertsFor(r.mem, { fastTraffic: ft, nowMs: 50000 });
  assert.equal(r.say.length, 1);
});
test("amarilla/debris con distancia redondeada, una sola vez", () => {
  let r = alertsFor(initialAlertMemory(), { yellow: { active: true, type: "debris", distanceMeters: 327, carNum: null }, nowMs: 0 });
  assert.deepEqual(r.say, ["Debris a 350 metros"]);
  r = alertsFor(r.mem, { yellow: { active: true, type: "debris", distanceMeters: 250, carNum: null }, nowMs: 100 });
  assert.deepEqual(r.say, []);
  r = alertsFor(r.mem, { yellow: null, nowMs: 200 });
  r = alertsFor(r.mem, { yellow: { active: true, type: "incident", distanceMeters: 80, carNum: 13 }, nowMs: 300 });
  assert.deepEqual(r.say, ["Coche parado a 80 metros"]);
});
test("combustible crítico, ventana abierta y box esta vuelta (solo en el flanco)", () => {
  let r = alertsFor(initialAlertMemory(), { fuelStatus: "critical", windowStatus: "window", nowMs: 0 });
  assert.deepEqual(r.say, ["Combustible crítico", "Ventana de parada abierta"]);
  r = alertsFor(r.mem, { fuelStatus: "critical", windowStatus: "window", nowMs: 1 });
  assert.deepEqual(r.say, []);
  r = alertsFor(r.mem, { windowStatus: "window", pitLocked: true, pitSuggestedLap: 9, pitNextLap: 9, nowMs: 2 });
  assert.deepEqual(r.say, ["Entra a boxes esta vuelta"]);
  r = alertsFor(r.mem, { windowStatus: "window", pitLocked: true, pitSuggestedLap: 9, pitNextLap: 9, nowMs: 3 });
  assert.deepEqual(r.say, []);
});
test("última vuelta y bandera a cuadros avisan una vez; se pueden silenciar", () => {
  let r = alertsFor(initialAlertMemory(), { lastLap: true, nowMs: 0 });
  assert.deepEqual(r.say, ["Última vuelta"]);
  r = alertsFor(r.mem, { lastLap: true, checkered: true, nowMs: 1 });
  assert.deepEqual(r.say, ["Bandera a cuadros"]);
  r = alertsFor(initialAlertMemory(), { lastLap: true, muted: ["lastLap"], nowMs: 0 });
  assert.deepEqual(r.say, []);
});
