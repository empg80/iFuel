import { test } from "node:test";
import assert from "node:assert/strict";
import { calloutFor } from "../src/spotter/logic.ts";

test("libre -> izquierda / derecha / ambos", () => {
  assert.deepEqual(calloutFor(1, 2), { text: "Izquierda", side: "left", kind: "occupied" });
  assert.deepEqual(calloutFor(1, 3), { text: "Derecha", side: "right", kind: "occupied" });
  assert.equal(calloutFor(2, 4).text, "Tres anchos");
  assert.equal(calloutFor(1, 5).text, "Dos a la izquierda");
});
test("ocupado -> libre avisa 'Libre'; libre -> libre no dice nada", () => {
  assert.equal(calloutFor(2, 1).text, "Libre");
  assert.equal(calloutFor(1, 1), null);
  assert.equal(calloutFor(null, 1), null);
});
test("no repite ni avisa de mejoras parciales", () => {
  assert.equal(calloutFor(2, 2), null);
  assert.equal(calloutFor(5, 2), null);
  assert.equal(calloutFor(4, 3), null);
  assert.equal(calloutFor(1, 0), null);
});
