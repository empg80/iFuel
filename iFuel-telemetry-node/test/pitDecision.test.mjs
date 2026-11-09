import test from "node:test";
import assert from "node:assert/strict";
import { createPitDecisionStabilizer } from "../pitDecision.mjs";

const mk = (w, next = 10) => ({
  nextPitLap: next, suggestedLap: null,
  all: Object.entries(w).map(([lap, weighted]) => ({ lap: +lap, weighted, trafficScore: Math.ceil(weighted), nearest: null })),
});

test("no salta por diferencias pequeñas de tráfico", () => {
  const s = createPitDecisionStabilizer();
  let t = 0;
  assert.equal(s.stabilize(mk({ 10: 0, 11: 0.5, 12: 1 }), { nowMs: t }).suggestedLap, 10);
  for (let i = 0; i < 40; i++) { t += 250; assert.equal(s.stabilize(mk({ 10: 0.5, 11: 0, 12: 1 }), { nowMs: t }).suggestedLap, 10); }
});

test("cambia solo si otra vuelta es mejor por >=1 coche y de forma sostenida", () => {
  const s = createPitDecisionStabilizer();
  let t = 0, r;
  s.stabilize(mk({ 10: 0, 11: 0 }), { nowMs: t });
  for (let i = 0; i < 80; i++) { t += 250; r = s.stabilize(mk({ 10: 3, 11: 0 }), { nowMs: t }); }
  assert.equal(r.suggestedLap, 11);
});

test("un pico de tráfico de un instante no cambia la decisión", () => {
  const s = createPitDecisionStabilizer();
  let t = 0;
  for (let i = 0; i < 20; i++) { t += 250; s.stabilize(mk({ 10: 0, 11: 0 }), { nowMs: t }); }
  t += 250; let r = s.stabilize(mk({ 10: 4, 11: 0 }), { nowMs: t });
  assert.equal(r.suggestedLap, 10);
  for (let i = 0; i < 20; i++) { t += 250; r = s.stabilize(mk({ 10: 0, 11: 0 }), { nowMs: t }); }
  assert.equal(r.suggestedLap, 10);
});

test("cerca de la entrada a boxes la decisión se bloquea", () => {
  const s = createPitDecisionStabilizer();
  let t = 0, r;
  s.stabilize(mk({ 10: 0, 11: 0 }), { nowMs: t, lapsToNextPit: 0.5 });
  for (let i = 0; i < 80; i++) { t += 250; r = s.stabilize(mk({ 10: 4, 11: 0 }), { nowMs: t, lapsToNextPit: 0.1 }); }
  assert.equal(r.suggestedLap, 10);
  assert.equal(r.locked, true);
});

test("si la vuelta elegida ya no existe se recalcula", () => {
  const s = createPitDecisionStabilizer();
  s.stabilize(mk({ 10: 0, 11: 1 }), { nowMs: 0 });
  assert.equal(s.stabilize(mk({ 11: 1, 12: 0 }, 11), { nowMs: 250 }).suggestedLap, 12);
});
