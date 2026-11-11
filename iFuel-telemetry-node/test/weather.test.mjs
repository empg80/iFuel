import { test } from "node:test";
import assert from "node:assert/strict";
import { createWeatherTracker } from "../weather.mjs";

const run = (t, n, s) => { let r; for (let i = 0; i < n; i++) { r = t.update(s); if (r.event) return r; } return r; };
test("empieza y deja de llover con histéresis", () => {
  const t = createWeatherTracker();
  assert.equal(t.update({ precip: 0.01, wetness: 1, skies: 1, rainChance: 0 }).event, null);
  const a = run(t, 10, { precip: 0.2, wetness: 3, skies: 1, rainChance: 0 });
  assert.equal(a.event, "started"); assert.equal(a.state, "raining");
  assert.equal(run(t, 20, { precip: 0, wetness: 4, skies: 1, rainChance: 0 }).event, null); // aún no
  const b = run(t, 80, { precip: 0, wetness: 4, skies: 1, rainChance: 0 });
  assert.equal(b.event, "stopped"); assert.equal(b.state, "drying");
});
test("riesgo de lluvia con cielo cubierto y probabilidad", () => {
  const t = createWeatherTracker();
  const r = t.update({ precip: 0, wetness: 1, skies: 3, rainChance: 30 });
  assert.equal(r.event, "risk"); assert.equal(r.state, "risk");
  assert.equal(t.update({ precip: 0, wetness: 1, skies: 3, rainChance: 30 }).event, null);
});
test("cielo despejado: seco", () => {
  assert.equal(createWeatherTracker().update({ precip: 0, wetness: 1, skies: 0, rainChance: 0 }).state, "dry");
});
