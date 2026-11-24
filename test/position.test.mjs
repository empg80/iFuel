import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./_tsLoad.mjs";

// localStorage y window simulados antes de cargar el módulo
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
};
Object.defineProperty(globalThis.localStorage, "length", { get: () => store.size });
globalThis.window = { innerWidth: 3440, innerHeight: 1440 };
const m = await loadTs("../src/utils/position.ts");
// la migración inicial borra posiciones; se fija la versión antes de guardar nada
store.set("ifuel-pos-version", "2");

test("posición recortada por una ventana pequeña no se sobrescribe al guardar", () => {
  store.set("ifuel-pos-fuel", JSON.stringify({ x: 3000, y: 1200 }));
  globalThis.window.innerWidth = 800; globalThis.window.innerHeight = 600;
  const shown = m.loadWidgetPosition("ifuel-pos-fuel", { x: 40, y: 40 });
  assert.deepEqual(shown, { x: 720, y: 560 }); // recortada solo para mostrarla
  m.persistPosition("ifuel-pos-fuel", shown); // el efecto de guardado de la carga inicial
  assert.deepEqual(JSON.parse(store.get("ifuel-pos-fuel")), { x: 3000, y: 1200 }); // intacta
});

test("al arrastrar el widget sí se guarda la nueva posición", () => {
  m.persistPosition("ifuel-pos-fuel", { x: 100, y: 100 });
  assert.deepEqual(JSON.parse(store.get("ifuel-pos-fuel")), { x: 100, y: 100 });
});

test("posición dentro de la ventana: se guarda con normalidad", () => {
  store.set("ifuel-pos-relative", JSON.stringify({ x: 50, y: 60 }));
  const shown = m.loadWidgetPosition("ifuel-pos-relative", { x: 0, y: 0 });
  m.persistPosition("ifuel-pos-relative", shown);
  assert.deepEqual(JSON.parse(store.get("ifuel-pos-relative")), { x: 50, y: 60 });
});
