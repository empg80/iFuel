import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { probeSimRunning } from "../telemetry-server.mjs";

const serve = (body, delayMs = 0) =>
  new Promise((resolve) => {
    const srv = http.createServer((req, res) => setTimeout(() => res.end(body), delayMs));
    srv.listen(0, "127.0.0.1", () => resolve({ srv, url: `http://127.0.0.1:${srv.address().port}/x` }));
  });

test("sondeo del sim: true si el servicio responde running:1", async () => {
  const { srv, url } = await serve("SimStatus:\n running:1\n");
  try { assert.equal(await probeSimRunning({ url }), true); } finally { srv.close(); }
});

test("sondeo del sim: false si responde running:0", async () => {
  const { srv, url } = await serve("SimStatus:\n running:0\n");
  try { assert.equal(await probeSimRunning({ url }), false); } finally { srv.close(); }
});

test("sondeo del sim: false y SIN ruido ni excepciones si no hay nadie escuchando", async () => {
  const { srv, url } = await serve("x");
  await new Promise((r) => srv.close(r)); // puerto cerrado -> ECONNREFUSED
  const logged = []; const orig = console.error; console.error = (...a) => logged.push(a);
  try { assert.equal(await probeSimRunning({ url }), false); } finally { console.error = orig; }
  assert.deepEqual(logged, []);
});

test("sondeo del sim: false si el servicio se cuelga (timeout)", async () => {
  const { srv, url } = await serve("running:1", 1500);
  try { assert.equal(await probeSimRunning({ url, timeoutMs: 200 }), false); } finally { srv.closeAllConnections?.(); srv.close(); }
});
