import { test } from "node:test";
import assert from "node:assert/strict";
import { qualifyGridRanks } from "../gridOrder.mjs";

test("gridOrder: usa QualifyResultsInfo, luego la sesión de clasificación, y null si no hay", () => {
  const a = qualifyGridRanks({ QualifyResultsInfo: { Results: [{ Position: 1, CarIdx: 7 }, { Position: 0, CarIdx: 3 }] } });
  assert.equal(a.get(3), 0); assert.equal(a.get(7), 1);
  const b = qualifyGridRanks({ SessionInfo: { Sessions: [{ SessionType: "Qualify", ResultsPositions: [{ Position: 2, CarIdx: 9 }, { Position: 1, CarIdx: 4 }] }, { SessionType: "Race" }] } });
  assert.equal(b.get(4), 0); assert.equal(b.get(9), 1);
  assert.equal(qualifyGridRanks({}), null);
  assert.equal(qualifyGridRanks({ QualifyResultsInfo: { Results: [] } }), null);
});
