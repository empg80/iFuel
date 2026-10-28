import { test } from "node:test";
import assert from "node:assert/strict";

// localStorage mínimo antes de importar el módulo (la migración se ejecuta al cargarlo)
const store = new Map([
  ["ifuel-pos-standings", JSON.stringify({ x: -2300, y: -600 })],
  ["ifuel-pos-relative", JSON.stringify({ x: -1900, y: 40 })],
  ["otra-cosa", "1"],
]);
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  get length() { return store.size; },
  key: (i) => [...store.keys()][i] ?? null,
};
Object.defineProperty(globalThis.localStorage, Symbol.iterator, { value: undefined });
globalThis.window = { innerWidth: 5120, innerHeight: 1440 };
// Object.keys(localStorage) necesita propiedades propias: las espejamos
const realSet = globalThis.localStorage.setItem;
for (const k of store.keys()) globalThis.localStorage[k] = store.get(k);

const { loadWidgetPosition, clampPosition } = await import("../src/utils/position.ts");

test("las posiciones de versiones anteriores (desplazamientos negativos) se descartan una vez", () => {
  assert.deepEqual(loadWidgetPosition("ifuel-pos-standings", { x: 440, y: 40 }), { x: 440, y: 40 });
  assert.deepEqual(loadWidgetPosition("ifuel-pos-relative", { x: 1, y: 2 }), { x: 1, y: 2 });
  assert.equal(store.get("ifuel-pos-version"), "2");
  assert.equal(store.get("otra-cosa"), "1", "no toca otras claves");
});

test("una posición guardada válida se respeta y una fuera de la ventana se acota", () => {
  store.set("ifuel-pos-fuel", JSON.stringify({ x: 300, y: 200 }));
  assert.deepEqual(loadWidgetPosition("ifuel-pos-fuel", { x: 0, y: 0 }), { x: 300, y: 200 });
  store.set("ifuel-pos-fuel", JSON.stringify({ x: 99999, y: -50 }));
  assert.deepEqual(loadWidgetPosition("ifuel-pos-fuel", { x: 0, y: 0 }), { x: 5040, y: 0 });
  assert.deepEqual(clampPosition({ x: 100, y: 5000 }, { width: 1000, height: 600 }), { x: 100, y: 560 });
});
