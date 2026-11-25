import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./_tsLoad.mjs";

const { shortDriverName } = await loadTs("../src/utils/driverName.ts");

test("formato N. Apellido", () => {
  assert.equal(shortDriverName("Marc Ferrer"), "M. Ferrer");
  assert.equal(shortDriverName("daniele De Gioia"), "D. De Gioia");
  assert.equal(shortDriverName("Cristiano Queiroz3"), "C. Queiroz");
  assert.equal(shortDriverName("Kike"), "Kike");
  assert.equal(shortDriverName("  "), "");
  assert.equal(shortDriverName(null), "");
  assert.equal(shortDriverName("Álvaro Beltrán"), "Á. Beltrán");
});
