import { test } from "node:test";
import assert from "node:assert/strict";
import { filterStandings } from "../src/utils/standingsFilter.ts";

const mk = (n, classOf) => Array.from({ length: n }, (_, i) => ({ position: i + 1, carNumber: String(i + 1), classId: classOf(i) }));

test("una clase con pocos coches se muestra entera", () => {
  const items = filterStandings(mk(8, () => 1), "3");
  assert.equal(items.length, 8);
  assert.ok(items.every((x) => x.kind === "row"));
});

test("si estás entre los 10 primeros solo salen los 10 primeros de la clase", () => {
  const items = filterStandings(mk(30, () => 1), "4");
  assert.equal(items.filter((x) => x.kind === "row").length, 10);
  assert.equal(items.some((x) => x.kind === "gap"), false);
});

test("fuera del top 10 salen los 3 de delante, tú y los 3 de detrás, con huecos marcados", () => {
  const items = filterStandings(mk(40, () => 1), "20");
  const rows = items.filter((x) => x.kind === "row").map((x) => Number(x.row.carNumber));
  assert.deepEqual(rows, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 17, 18, 19, 20, 21, 22, 23]);
  const gaps = items.filter((x) => x.kind === "gap");
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].hidden, 6);
});

test("multiclase: top 10 de cada clase y vecinos de tu propia clase", () => {
  // 40 coches: posiciones impares clase 1, pares clase 2; yo soy el 36 (clase 2, 18º de su clase)
  const rows = mk(40, (i) => (i % 2 === 0 ? 1 : 2));
  const items = filterStandings(rows, "36");
  const shown = items.filter((x) => x.kind === "row").map((x) => Number(x.row.carNumber));
  const top = Array.from({ length: 20 }, (_, i) => i + 1); // 10 primeros de cada clase = posiciones 1..20
  const neighbours = [30, 32, 34, 36, 38, 40]; // 3 por delante, yo y los de detrás (solo quedan 2 detrás... hasta el final)
  assert.deepEqual(shown, [...top, ...neighbours]);
});

test("sin coche propio (espectador) solo el top por clase", () => {
  const items = filterStandings(mk(30, () => 1), null);
  assert.equal(items.filter((x) => x.kind === "row").length, 10);
});
