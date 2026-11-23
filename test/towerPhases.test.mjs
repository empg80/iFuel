import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import ts from "typescript";

const src = fs.readFileSync(new URL("../src/utils/towerPhases.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));

const row = (position, classId, gap, lapsDown = 0) => ({ position, classId, carNumber: String(position), driverName: "x", gapToLeader: gap, lapsDown });

test("clase única: una sola fase", () => {
  assert.deepEqual(m.buildPhases([row(1, 1, 0), row(2, 1, 3)]).map((p) => p.key), ["all"]);
});

test("varias clases: General + una por clase ordenadas por su mejor posición", () => {
  const ph = m.buildPhases([row(1, 7, 0), row(2, 5, 2), row(3, 7, 4), row(4, 9, 6)]);
  assert.deepEqual(ph.map((p) => p.key), ["all", "c7", "c5", "c9"]);
});

test("fase de clase: posición y hueco dentro de la categoría", () => {
  const rows = [row(1, 7, 0), row(2, 5, 10), row(3, 7, 14), row(4, 5, 30, 1)];
  const r = m.phaseRows(rows, { key: "c5", classId: 5 });
  assert.deepEqual(r.map((x) => [x.shownPos, x.gapText]), [[1, "Líder"], [2, "L1"]]);
  const r7 = m.phaseRows(rows, { key: "c7", classId: 7 });
  assert.equal(r7[1].gapText, "+14.0");
});

test("la fase de la categoría del coche en pantalla dura 1,5 veces más", () => {
  assert.equal(m.phaseDurationMs(10, { key: "c5", classId: 5 }, 5), 15000);
  assert.equal(m.phaseDurationMs(10, { key: "c7", classId: 7 }, 5), 10000);
  assert.equal(m.phaseDurationMs(1, { key: "all", classId: null }, null), 3000);
});
