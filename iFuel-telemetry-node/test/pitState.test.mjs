import { test } from "node:test";
import assert from "node:assert/strict";
import { updatePitAndStintState as upd, getOrCreatePitState as get, resetPitAndStintState as reset } from "../pitState.mjs";

test("salir del box al empezar no cuenta como parada; una parada real sí y reinicia el stint", () => {
  reset();
  upd({ sessionTime: 0, carIdxOnPitRoad: [true], carIdxLapCompleted: [0] });
  upd({ sessionTime: 10, carIdxOnPitRoad: [false], carIdxLapCompleted: [0] });
  assert.equal(get(0).pitStops, 0);
  assert.equal(get(0).stintStartLapCompleted, 0);

  upd({ sessionTime: 900, carIdxOnPitRoad: [true], carIdxLapCompleted: [10] });
  upd({ sessionTime: 930, carIdxOnPitRoad: [false], carIdxLapCompleted: [10] });
  assert.equal(get(0).pitStops, 1);
  assert.equal(get(0).lastPitDurationSeconds, 30);
  assert.equal(get(0).stintStartLapCompleted, 10);
});

test("reset limpia el estado de todos los coches", () => {
  reset();
  upd({ sessionTime: 0, carIdxOnPitRoad: [false], carIdxLapCompleted: [5] });
  assert.equal(get(0).stintStartLapCompleted, 5);
  reset();
  upd({ sessionTime: 0, carIdxOnPitRoad: [false], carIdxLapCompleted: [7] });
  assert.equal(get(0).stintStartLapCompleted, 7);
});
