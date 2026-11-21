import test from "node:test";
import assert from "node:assert/strict";
import { estimateRivalStops } from "../rivalStops.mjs";

const base = { myCarNumber: "1", myClassId: 10, myStintLaps: 20, lapsToWindowStart: 3, lapsToWindowEnd: 6 };

test("un rival con el mismo stint que el tuyo y 17 vueltas de stint para en ~3 vueltas", () => {
  const rows = [
    { carNumber: "1", classId: 10, position: 3, stintLapCount: 15, completedStints: [], inPit: false },
    { carNumber: "7", classId: 10, position: 2, stintLapCount: 17, completedStints: [], inPit: false },
    { carNumber: "9", classId: 10, position: 5, stintLapCount: 2, completedStints: [], inPit: false },
  ];
  const r = estimateRivalStops({ ...base, rows });
  assert.deepEqual(r.inWindow.map((x) => x.carNumber), ["7"]);
  assert.equal(r.inWindow[0].lapsToStop, 3);
  assert.equal(r.inWindow[0].known, false);
});

test("usa el stint anterior del propio coche si ya ha parado y la mediana de la clase para el resto", () => {
  const rows = [
    { carNumber: "1", classId: 10, position: 3, stintLapCount: 5, completedStints: [18], inPit: false },
    { carNumber: "7", classId: 10, position: 2, stintLapCount: 14, completedStints: [18], inPit: false },
    { carNumber: "8", classId: 10, position: 4, stintLapCount: 15, completedStints: [], inPit: false },
  ];
  const r = estimateRivalStops({ ...base, rows });
  assert.equal(r.stintLapsByClass["10"], 18);
  assert.deepEqual(r.inWindow.map((x) => [x.carNumber, x.lapsToStop, x.known]), [["8", 3, false], ["7", 4, true]]);
});

test("ignora al propio coche, a los que ya están en boxes y a los sin dato; sin ventana devuelve null", () => {
  const rows = [
    { carNumber: "1", classId: 10, position: 3, stintLapCount: 15, completedStints: [], inPit: false },
    { carNumber: "2", classId: 10, position: 1, stintLapCount: 17, completedStints: [], inPit: true },
    { carNumber: "3", classId: 99, position: 4, stintLapCount: 17, completedStints: [], inPit: false },
  ];
  assert.deepEqual(estimateRivalStops({ ...base, rows }).inWindow, []);
  assert.equal(estimateRivalStops({ ...base, rows, lapsToWindowStart: null }), null);
});
