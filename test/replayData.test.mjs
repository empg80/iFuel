import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./_tsLoad.mjs";

const d = await loadTs("../src/utils/replayData.ts");
const st = await loadTs("../src/utils/replayStyle.ts");

const row = (position, classId, gap, extra = {}) => ({
  position, classId, carNumber: String(position), driverName: `Piloto Apellido${position}`,
  gapToLeader: gap, lapsDown: 0, bestLapTime: null, ...extra,
});

test("vuelta rápida: la mejor de toda la sesión", () => {
  const rows = [row(1, 1, 0, { bestLapTime: 100 }), row(2, 1, 2, { bestLapTime: 99.5 }), row(3, 2, 5, { bestLapTime: 0 })];
  assert.equal(d.fastestLapCar(rows), "2");
  assert.equal(d.fastestLapCar([row(1, 1, 0)]), null);
});

test("letra del neumático", () => {
  assert.equal(d.tyreLetter("Soft"), "S");
  assert.equal(d.tyreLetter("Medium"), "M");
  assert.equal(d.tyreLetter("Hard"), "H");
  assert.equal(d.tyreLetter("Wet"), "W");
  assert.equal(d.tyreLetter(null), null);
});

test("cambio de posición: positivo = puestos ganados; sin referencia = 0", () => {
  assert.equal(d.positionChange(8, 3), 5);
  assert.equal(d.positionChange(2, 6), -4);
  assert.equal(d.positionChange(undefined, 3), 0);
});

test("intervalo con el coche de delante de la misma clase", () => {
  const rows = [row(1, 1, 0), row(2, 2, 3), row(3, 1, 4), row(4, 1, 9, { lapsDown: 1 }), row(5, 2, 10)];
  const iv = d.classIntervals(rows);
  assert.equal(iv.get("3").seconds, 4);
  assert.equal(iv.get("5").seconds, 7);
  assert.equal(iv.get("4").laps, 1);
  assert.equal(iv.has("1"), false);
});

test("batalla: delante y detrás dentro de la clase", () => {
  const rows = [row(1, 1, 0), row(2, 2, 3), row(3, 1, 4), row(4, 1, 9)];
  const b = d.battleFor(rows, "3");
  assert.equal(b.ahead.carNumber, "1");
  assert.equal(b.ahead.gap, 4);
  assert.equal(b.behind.carNumber, "4");
  assert.equal(b.behind.gap, 5);
  assert.deepEqual(d.battleFor(rows, "1").ahead, null);
  assert.deepEqual(d.battleFor(rows, null), { ahead: null, behind: null });
});

test("tendencia del hueco", () => {
  const s = [{ t: 0, gap: 2.0 }, { t: 2, gap: 1.8 }];
  assert.equal(d.gapTrend(s, 4, 1.5), "closing");
  assert.equal(d.gapTrend(s, 4, 2.6), "opening");
  assert.equal(d.gapTrend(s, 4, 2.05), "flat");
  assert.equal(d.gapTrend([], 4, 2), "flat");
  assert.equal(d.gapTrend(s, 4, null), "flat");
});

test("ajustes: estado + URL; la URL manda y se validan los valores", () => {
  const base = st.resolveSettings(null, null);
  assert.equal(base.design, "tv");
  assert.equal(base.palette, "cyan");
  const s = st.resolveSettings({ replayDesign: "ribbon", replayPalette: "f1", replayPhaseS: 15 }, new URLSearchParams("palette=green&gap=interval&guides=1"));
  assert.equal(s.design, "ribbon");
  assert.equal(s.palette, "green");
  assert.equal(s.gapMode, "interval");
  assert.equal(s.guides, true);
  assert.equal(s.phaseS, 15);
  const bad = st.resolveSettings({ replayDesign: "x", replayPalette: "y" }, new URLSearchParams("phase=9999&acento=zzz"));
  assert.equal(bad.design, "tv");
  assert.equal(bad.phaseS, 60);
  assert.equal(bad.custom.acento, "#ec4899");
});

test("paletas: todas definen las variables y el color propio calcula texto legible", () => {
  for (const id of ["cyan", "f1", "green", "orange", "mono", "custom"]) {
    const v = st.paletteVars(id, { fondo: "#0b0f19", acento: "#ffff00", acento2: "#000000" });
    for (const k of ["--bc-ink", "--bc-ink-2", "--bc-cyan", "--bc-dark-on-cyan", "--bc-violet", "--bc-on-b", "--bc-mute"]) assert.ok(v[k], `${id} ${k}`);
  }
  const c = st.paletteVars("custom", { fondo: "#0b0f19", acento: "#ffff00", acento2: "#000000" });
  assert.equal(c["--bc-dark-on-cyan"], "#111111");
  assert.equal(c["--bc-on-b"], "#ffffff");
  assert.equal(st.readableOn("nope"), "#ffffff");
});
