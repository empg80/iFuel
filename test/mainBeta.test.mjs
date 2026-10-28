// Cableado de electron/main.cjs en una versión beta, con Electron simulado:
// graba sola y al cerrar genera el informe .zip. Usa el servidor de telemetría real (sin iRacing: no hay SDK).
// No sustituye a la prueba en Windows.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Module from "node:module";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
process.env.IFUEL_BETA_AUTOSAVE_MS = "300"; // autoguardado rapido para el test

function loadMain({ version }) {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "ifuel-ud-"));
  const docs = fs.mkdtempSync(path.join(os.tmpdir(), "ifuel-docs-"));
  const calls = { recording: 0, snapshots: 0, stopped: 0, revealed: [], quit: 0, notifications: [] };
  const handlers = {};
  let ready;
  const readyPromise = new Promise((r) => (ready = r));
  const fn = () => () => {};
  const win = () => ({
    on() {}, once() {}, isVisible: () => true, hide() {}, show() {}, showInactive() {}, isDestroyed: () => false,
    setIgnoreMouseEvents() {}, setAlwaysOnTop() {}, setBounds() {}, setFocusable() {}, setVisibleOnAllWorkspaces() {},
    getBounds: () => ({ x: 0, y: 0, width: 1920, height: 1080 }), moveTop() {}, setSkipTaskbar() {}, close() {}, destroy() {}, loadFile() {}, loadURL() {},
    webContents: { on() {}, once() {}, send() {}, setWindowOpenHandler() {}, closeDevTools() {}, openDevTools() {}, isDestroyed: () => false },
  });
  const electron = {
    app: {
      isPackaged: false, getVersion: () => version,
      getPath: (k) => (k === "documents" ? docs : userData),
      requestSingleInstanceLock: () => true, quit: () => { calls.quit++; },
      whenReady: () => readyPromise,
      on: (ev, cb) => { handlers[ev] = cb; }, setAppUserModelId() {}, disableHardwareAcceleration() {},
    },
    BrowserWindow: Object.assign(function () { return win(); }, { getAllWindows: () => [] }),
    Menu: { buildFromTemplate: (t) => t, setApplicationMenu() {} },
    Tray: function () { return { setToolTip() {}, setContextMenu() {}, on() {}, destroy() {} }; },
    Notification: Object.assign(function (o) { calls.notifications.push(o); return { show() {} }; }, { isSupported: () => true }),
    nativeImage: { createFromPath: () => ({ isEmpty: () => false }) },
    ipcMain: { handle() {}, on() {} },
    globalShortcut: { register: () => true, unregisterAll() {} },
    screen: {
      getPrimaryDisplay: () => ({ id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, scaleFactor: 1 }),
      getAllDisplays: () => [{ id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, scaleFactor: 1 }],
      on() {},
    },
    shell: { showItemInFolder: (f) => calls.revealed.push(f), openPath: async () => "" },
  };
  const origLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "electron") return electron;
    return origLoad.call(this, request, parent, isMain);
  };
  const mainPath = require.resolve("../electron/main.cjs");
  delete require.cache[mainPath];
  return { electron, calls, handlers, ready, userData, docs, mainPath, restore: () => { Module._load = origLoad; } };
}

async function runAndQuit(version) {
  const ctx = loadMain({ version });
  try {
    require(ctx.mainPath);
    ctx.ready();
    await new Promise((r) => setTimeout(r, 1500));
    const reportsDir = path.join(ctx.docs, "iFuel-beta");
    ctx.autosaveBeforeQuit = fs.existsSync(path.join(reportsDir, "ifuel-beta-AUTOSAVE.zip"));
    const recorded = fs.existsSync(path.join(ctx.userData, "diagnostics")) &&
      fs.readdirSync(path.join(ctx.userData, "diagnostics")).some((f) => f.endsWith(".jsonl.gz"));
    ctx.handlers["before-quit"]({ preventDefault() {} });
    await new Promise((r) => setTimeout(r, 1500));
    return { ctx, recorded };
  } finally { ctx.restore(); }
}

test("beta: graba sola y al cerrar genera el informe .zip con grabacion y log", async () => {
  const { ctx, recorded } = await runAndQuit("0.1.0-beta.1");
  assert.ok(recorded, "se ha creado la grabacion al arrancar");
  assert.equal(ctx.calls.revealed.length, 1, "se muestra el informe en el explorador");
  const zip = ctx.calls.revealed[0];
  assert.ok(zip.startsWith(path.join(ctx.docs, "iFuel-beta")) && fs.existsSync(zip));
  const names = execFileSync("python3", ["-c", "import zipfile,sys;print(' '.join(zipfile.ZipFile(sys.argv[1]).namelist()))", zip]).toString();
  assert.match(names, /diagnostics\/ifuel-.*\.jsonl\.gz/);
  assert.match(names, /logs\/ifuel\.log/);
  assert.match(names, /NOTAS\.txt/);
  assert.match(names, /resumen\.json/);
  assert.ok(ctx.calls.notifications.some((n) => /BETA/.test(n.title)), "avisa de que la prueba esta grabando");
  assert.equal(ctx.calls.quit, 1);
  // copia de seguridad: existe mientras la app corre y desaparece al generar el informe final
  assert.ok(ctx.autosaveBeforeQuit, "autoguardado presente durante la sesion");
  assert.equal(fs.existsSync(path.join(ctx.docs, "iFuel-beta", "ifuel-beta-AUTOSAVE.zip")), false);
  assert.equal(fs.readdirSync(path.join(ctx.docs, "iFuel-beta")).filter((f) => f.endsWith(".tmp")).length, 0);
  const log = fs.readFileSync(path.join(ctx.userData, "logs", "ifuel.log"), "utf8");
  assert.match(log, /Cierre: iniciado/);
  assert.match(log, /Cierre: informe final/);
  assert.match(log, /Cierre: terminado/);
});

test("version estable: no graba ni genera informe", async () => {
  const { ctx, recorded } = await runAndQuit("1.0.0");
  assert.equal(recorded, false);
  assert.equal(ctx.calls.revealed.length, 0);
});
