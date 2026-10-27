// Evita el fallo silencioso de leer una variable que el SDK no tiene (como pasó con CarIdxSpeed):
// 1) toda `telemetry.X` del servidor está en TELEMETRY_VARS; 2) todas existen en el SDK instalado.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { TELEMETRY_VARS } from "../telemetry-server.mjs";

const serverSrc = fs.readFileSync(new URL("../telemetry-server.mjs", import.meta.url), "utf8");
const typesUrl = new URL("../node_modules/@irsdk-node/types/dist/types/telemetry.gen.d.ts", import.meta.url);

test("todas las variables que lee el servidor están en TELEMETRY_VARS", () => {
  const used = new Set([...serverSrc.matchAll(/\btelemetry\.([A-Za-z][A-Za-z0-9_]*)/g)].map((m) => m[1]));
  const missing = [...used].filter((n) => !TELEMETRY_VARS.includes(n));
  assert.deepEqual(missing, [], `Falta en TELEMETRY_VARS: ${missing.join(", ")}`);
});

test("TELEMETRY_VARS no tiene nombres duplicados ni sobrantes", () => {
  assert.equal(new Set(TELEMETRY_VARS).size, TELEMETRY_VARS.length);
  const used = new Set([...serverSrc.matchAll(/\btelemetry\.([A-Za-z][A-Za-z0-9_]*)/g)].map((m) => m[1]));
  const extra = TELEMETRY_VARS.filter((n) => !used.has(n));
  assert.deepEqual(extra, [], `Sobran en TELEMETRY_VARS: ${extra.join(", ")}`);
});

test("cada variable existe en la versión instalada del SDK (@irsdk-node/types)", { skip: !fs.existsSync(typesUrl) && "sin @irsdk-node/types instalado" }, () => {
  const types = fs.readFileSync(typesUrl, "utf8");
  const unknown = TELEMETRY_VARS.filter((n) => !new RegExp(`^\\s+${n}: TelemetryVariable`, "m").test(types));
  assert.deepEqual(unknown, [], `No existen en el SDK: ${unknown.join(", ")}`);
});
