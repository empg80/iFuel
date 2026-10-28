import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { WebSocket } from "ws";
import { startTelemetryServer, TELEMETRY_VARS } from "../telemetry-server.mjs";
import { createFakeSdk } from "./helpers/fake-sdk.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let nextPort = 7190;

async function boot(sdkOverrides = {}, serverOptions = {}) {
  const port = ++nextPort;
  const sdk = createFakeSdk(sdkOverrides);
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ifuel-test-"));
  const handle = await startTelemetryServer({
    host: "127.0.0.1", port, dataDir, dev: false,
    createSdk: async () => sdk,
    isSimRunning: async () => sdk.state.running,
    simClosedCheckMs: 300,
    ...serverOptions,
  });
  const url = `ws://127.0.0.1:${port}/ifuel`;
  const messages = [];
  const ws = new WebSocket(url);
  ws.on("message", (d) => messages.push(JSON.parse(d.toString())));
  await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
  const waitFor = async (pred, ms = 4000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const hit = messages.find(pred);
      if (hit) return hit;
      await sleep(50);
    }
    return null;
  };
  const close = async () => { ws.close(); await handle.stop(); };
  return { sdk, handle, ws, url, port, dataDir, messages, waitFor, close };
}

test("payload: capacidad real del deposito, sesion y campos para validar vueltas", async () => {
  const s = await boot();
  try {
    const m = await s.waitFor(() => true);
    assert.ok(m, "llega algun mensaje");
    assert.equal(m.fuelMax, 50); // 100 L x 0.5 (DriverCarMaxFuelPct)
    assert.equal(m.sessionKey, "111:0");
    for (const k of ["onPitRoad", "isInGarage", "isReplayPlaying", "lapDistPct", "sessionFlags"]) {
      assert.ok(k in m, `falta ${k}`);
    }
    assert.equal(m.isReplayPlaying, false);
  } finally { await s.close(); }
});

test("lee solo las variables necesarias por nombre (sin construir getTelemetry() completo)", async () => {
  const s = await boot();
  try {
    await s.waitFor(() => true);
    assert.equal(s.sdk.state.getTelemetryCalls, 0);
    const unknown = [...s.sdk.state.variableRequests].filter((n) => !TELEMETRY_VARS.includes(n));
    assert.deepEqual(unknown, []);
  } finally { await s.close(); }
});

test("el YAML de sesion se parsea una vez por version, no en cada tick", async () => {
  const s = await boot();
  try {
    await s.waitFor(() => true); await sleep(900);
    assert.ok(s.messages.length >= 3);
    assert.equal(s.sdk.state.sessionDataCalls, 1);
    s.sdk.state.sessionVersion = 2; await sleep(600);
    assert.equal(s.sdk.state.sessionDataCalls, 2);
  } finally { await s.close(); }
});

test("una excepcion en un tick no detiene el bucle", async () => {
  const s = await boot();
  const origErr = console.error; const logged = []; console.error = (...a) => logged.push(a.join(" "));
  try {
    await s.waitFor(() => true);
    const before = s.messages.length;
    s.sdk.state.throwOnTick = s.sdk.state.tick + 1;
    await sleep(1200);
    assert.ok(s.messages.length > before, "siguen llegando mensajes");
    assert.ok(logged.some((l) => l.includes("Error en el ciclo")), "se registra el error");
  } finally { console.error = origErr; await s.close(); }
});

test("amarilla: el incidente es el coche PARADO, no el coche mas cercano por delante", async () => {
  // jugador (idx 2) en 0.50; coche 0 en 0.55 en movimiento (a ~200 m); coche 3 parado en 0.60 (~400 m)
  const s = await boot({ flags: 0x4000 /* caution */ });
  try {
    const m = await s.waitFor((x) => x.yellowWarning?.type === "incident", 5000);
    assert.ok(m, "se detecta un incidente");
    assert.equal(m.yellowWarning.carNum, "13", "coche parado (idx 3, numero 13)");
    assert.ok(m.yellowWarning.distanceMeters > 150 && m.yellowWarning.distanceMeters < 450);
    assert.ok(m.yellowWarning.timeSeconds > 0, "ahora se calcula el tiempo hasta el incidente (antes siempre null)");
  } finally { await s.close(); }
});

test("amarilla sin ningun coche parado: no se inventa un incidente", async () => {
  const s = await boot({ flags: 0x4000, carSpeed: [60, 60, 60, 60] });
  try {
    const m = await s.waitFor((x) => x.yellowWarning?.active === true, 5000);
    assert.ok(m);
    assert.notEqual(m.yellowWarning.type, "incident");
  } finally { await s.close(); }
});

test("rechaza mensajes grandes y origenes no permitidos (Vite solo en dev)", async () => {
  const s = await boot();
  try {
    const big = new WebSocket(s.url);
    await new Promise((r) => big.once("open", r));
    const code = await new Promise((r) => { big.on("close", r); big.send("x".repeat(20 * 1024)); });
    assert.equal(code, 1009);

    for (const origin of ["http://evil.example", "http://localhost:5173"]) {
      const res = await new Promise((r) => {
        const w = new WebSocket(s.url, { headers: { Origin: origin } });
        w.on("open", () => r("open")); w.on("error", () => r("rechazado"));
      });
      assert.equal(res, "rechazado", origin);
    }
    const ok = await new Promise((r) => {
      const w = new WebSocket(s.url, { headers: { Origin: "file://" } });
      w.on("open", () => { w.close(); r("open"); }); w.on("error", () => r("rechazado"));
    });
    assert.equal(ok, "open", "file:// (la app empaquetada) si se admite");
  } finally { await s.close(); }
});

test("si iRacing se cierra se libera el SDK y al reabrirlo se reconecta solo", async () => {
  const s = await boot();
  try {
    await s.waitFor(() => true);
    s.sdk.state.running = false;
    await sleep(2500);
    assert.ok(s.sdk.state.stopCalls >= 1, "SDK liberado");
    const n = s.messages.length;
    s.sdk.state.running = true;
    await sleep(7500);
    assert.ok(s.messages.length > n, "vuelven los datos sin reiniciar nada");
  } finally { await s.close(); }
});

test("stop() libera el puerto: se puede reiniciar sin EADDRINUSE y el class map va a dataDir", async () => {
  const s = await boot();
  await s.waitFor(() => true);
  const { port, dataDir } = s;
  await s.close();
  const sdk2 = createFakeSdk();
  const h2 = await startTelemetryServer({ host: "127.0.0.1", port, dataDir, dev: false,
    createSdk: async () => sdk2, isSimRunning: async () => true });
  await sleep(400);
  await h2.stop();
  assert.ok(fs.existsSync(path.join(dataDir, "classColorMap.json")));
});

test("grabación: guarda un payload por línea en .jsonl.gz, incluso sin clientes conectados", async () => {
  const s = await boot();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ifuel-rec-"));
  try {
    s.ws.close(); await sleep(200); // sin ningún cliente WebSocket
    const file = s.handle.startRecording(dir);
    assert.ok(file.endsWith(".jsonl.gz"));
    await sleep(1300);
    assert.equal(await s.handle.stopRecording(), file);
    const lines = zlib.gunzipSync(fs.readFileSync(file)).toString("utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.ok(lines[0]._meta?.startedAt, "primera línea con metadatos");
    assert.ok(lines.length >= 4, `varios payloads (${lines.length} líneas)`);
    assert.equal(lines[1].sessionKey, "111:0");
    assert.equal(await s.handle.stopRecording(), null, "parar dos veces no falla");
  } finally { await s.handle.stop(); }
});

test("volcado del SDK: capacidad, unidades y variables crudas, sin nombres de pilotos", async () => {
  const s = await boot();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ifuel-snap-"));
  try {
    await s.waitFor(() => true);
    const file = s.handle.saveSnapshot(dir);
    const raw = fs.readFileSync(file, "utf8");
    const snap = JSON.parse(raw);
    assert.equal(snap.driverInfo.DriverCarFuelMaxLtr, 100);
    assert.equal(snap.driverInfo.DriverCarMaxFuelPct, 0.5);
    assert.equal(snap.weekendInfo.TrackName, "test");
    assert.deepEqual(snap.telemetry.FuelLevel, [40]);
    assert.equal(snap.telemetry.PitSvFuel, null, "variable ausente en el fake -> null, no rompe");
    assert.ok(!/D0|D1|UserName|CarNumber/.test(raw), "no se vuelcan nombres ni números de pilotos");
  } finally { await s.close(); }
});

test("relative en pista: el gap usa CarIdxEstTime cuando esta disponible", async () => {
  // jugador (idx 2) en 0.50 con EstTime 45 s; coche 0 en 0.55 con EstTime 52 s (por % seran ~4.5 s, por EstTime 7 s)
  const s = await boot({ carSpeed: [0, 0, 0, 0], estTimes: [52, 30, 45, 55] });
  try {
    const m = await s.waitFor((x) => x.relativeOnTrack?.ahead?.gapSeconds != null, 5000);
    assert.ok(m);
    assert.ok(Math.abs(m.relativeOnTrack.ahead.gapSeconds - 7) < 0.01, `gap=${m.relativeOnTrack.ahead.gapSeconds}`);
  } finally { await s.close(); }
});

test("relative en pista: sin CarIdxEstTime se mantiene el calculo por porcentaje", async () => {
  const s = await boot({ carSpeed: [0, 0, 0, 0] });
  try {
    const m = await s.waitFor((x) => x.relativeOnTrack?.ahead?.gapSeconds != null, 5000);
    assert.ok(m);
    assert.ok(Math.abs(m.relativeOnTrack.ahead.gapSeconds - 4.55) < 0.2, `gap=${m.relativeOnTrack.ahead.gapSeconds}`);
  } finally { await s.close(); }
});

test("standings: hueco al lider con el tiempo de vuelta del LIDER y sin huecos negativos", async () => {
  // P1 = coche 0 en 0.55 (ultima vuelta 89 s); coche 2 (jugador) a 0.05; coche 1 a 0.25; coche 3 esta por delante del P1 en pista
  const s = await boot({ carSpeed: [0, 0, 0, 0] });
  try {
    const m = await s.waitFor((x) => Array.isArray(x.standings) && x.standings.length >= 4, 5000);
    assert.ok(m);
    const byNum = Object.fromEntries(m.standings.map((r) => [r.carNumber, r]));
    assert.equal(byNum["10"].gapToLeaderSeconds, 0);
    assert.ok(Math.abs(byNum["12"].gapToLeaderSeconds - 0.05 * 89) < 0.01, `gap=${byNum["12"].gapToLeaderSeconds}`);
    assert.ok(Math.abs(byNum["11"].gapToLeaderSeconds - 0.25 * 89) < 0.01);
    assert.equal(byNum["13"].gapToLeaderSeconds, null);
    assert.equal(byNum["12"].lapsDown, 0);
  } finally { await s.close(); }
});
