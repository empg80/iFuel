import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStaticHandler } from "../staticServer.mjs";

test("staticServer: sirve ficheros, 404 y no sale de la raíz", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ifuel-static-"));
  fs.writeFileSync(path.join(dir, "index.html"), "<p>hola</p>");
  fs.writeFileSync(path.join(path.dirname(dir), "secreto-ifuel.txt"), "no");
  const srv = http.createServer(createStaticHandler(dir));
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const { port } = srv.address();
  const get = (p, method = "GET") => new Promise((resolve) => {
    const req = http.request({ host: "127.0.0.1", port, path: p, method }, (res) => { let b = ""; res.on("data", (d) => (b += d)); res.on("end", () => resolve({ s: res.statusCode, b, t: res.headers["content-type"] })); });
    req.end();
  });
  try {
    const r = await get("/");
    assert.equal(r.s, 200); assert.match(r.t, /text\/html/); assert.equal(r.b, "<p>hola</p>");
    assert.equal((await get("/nada.js")).s, 404);
    assert.notEqual((await get("/..%2fsecreto-ifuel.txt")).s, 200);
    assert.notEqual((await get("/../secreto-ifuel.txt")).s, 200);
    assert.equal((await get("/", "POST")).s, 405);
  } finally { srv.close(); }
});

test("staticServer: rechaza Host no permitido (DNS rebinding) y añade cabeceras de seguridad", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ifuel-static-"));
  fs.writeFileSync(path.join(dir, "index.html"), "<p>hola</p>");
  const srv = http.createServer(createStaticHandler(dir, { allowedHosts: new Set(["127.0.0.1:7071"]) }));
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const { port } = srv.address();
  const get = (host) => new Promise((resolve) => {
    const req = http.request({ host: "127.0.0.1", port, path: "/", headers: { Host: host } }, (res) => { res.resume(); res.on("end", () => resolve(res)); });
    req.end();
  });
  try {
    const bad = await get("evil.example.com:7071");
    assert.equal(bad.statusCode, 403);
    const ok = await get("127.0.0.1:7071");
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.headers["x-content-type-options"], "nosniff");
    assert.match(ok.headers["content-security-policy"], /frame-ancestors 'none'/);
    assert.equal(ok.headers["referrer-policy"], "no-referrer");
  } finally { srv.close(); }
});
