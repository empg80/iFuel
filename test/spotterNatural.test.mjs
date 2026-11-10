import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { matchClips } from "../src/spotter/clipMatch.ts";

// natural.ts importa los manifiestos como JSON: en node los cargamos vía import attributes si hace falta.
const m = JSON.parse(readFileSync(new URL("../src/spotter/voices/claude.json", import.meta.url)));
const toClips = (t) => matchClips(t, m);

test("frases por defecto se pueden montar con clips", () => {
  for (const t of ["Izquierda", "Derecha", "Tres en línea", "Libre", "Debris", "Última vuelta", "Bandera a cuadros"]) {
    const c = toClips(t);
    assert.ok(c && c.length > 0, t);
  }
});
test("número de coche y clase", () => {
  const c = toClips("Clase rápida por detrás, número 24");
  assert.ok(c && c.length >= 2);
  assert.ok(toClips("GT3 por detrás"));
});
test("texto no grabado devuelve null (fallback a voz del sistema)", () => {
  assert.equal(toClips("frase totalmente inventada zzz"), null);
});
test("manifest apunta a archivos", () => {
  assert.ok(Object.keys(m.chunks).length > 10);
});
