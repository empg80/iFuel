import { test } from "node:test";
import assert from "node:assert/strict";
import { safeTelemetryVariable } from "../telemetry-server.mjs";

// Imita el SDK real: pedir por nombre/índice una variable inexistente "cuelga" el proceso
function nativeLikeSdk(vars) {
  const names = Object.keys(vars);
  const calls = { crashed: false };
  return {
    calls,
    _sdk: { getTelemetryVariableIndex: (n) => names.indexOf(n) }, // -1 si no existe, como el C++
    getTelemetryVariable: (arg) => {
      const name = typeof arg === "number" ? names[arg] : arg;
      if (name === undefined || !(name in vars)) { calls.crashed = true; return null; }
      return vars[name];
    },
  };
}

test("una variable que el coche no tiene no llega a leerse (antes cerraba el proceso)", () => {
  const sdk = nativeLikeSdk({ FuelLevel: { value: [10] } });
  assert.equal(safeTelemetryVariable(sdk, "dcTractionControl2"), null);
  assert.equal(sdk.calls.crashed, false);
});

test("una variable que sí existe se lee por índice", () => {
  const sdk = nativeLikeSdk({ A: { value: [1] }, FuelLevel: { value: [10] } });
  assert.deepEqual(safeTelemetryVariable(sdk, "FuelLevel"), { value: [10] });
});

test("sin acceso al índice (SDK simulado) lee por nombre", () => {
  const sdk = { getTelemetryVariable: (n) => ({ value: [n] }) };
  assert.deepEqual(safeTelemetryVariable(sdk, "X"), { value: ["X"] });
});
