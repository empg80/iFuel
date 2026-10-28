// electron/main.cjs
const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  Tray,
  Notification,
  globalShortcut,
  screen,
  shell,
  nativeImage,
} = require("electron");
const fs = require("fs");
const path = require("path");
const util = require("util");
const { pathToFileURL } = require("url");
const overlayWindow = require("./overlayWindow.cjs");
const betaReport = require("./betaReport.cjs");

// Salida de emergencia: `iFuel.exe --windowed` (o IFUEL_WINDOWED=1) arranca como ventana normal
const forceWindowed =
  process.argv.includes("--windowed") || process.env.IFUEL_WINDOWED === "1";

let mainWindow = null;
let telemetryModule = null;
let telemetryServerRunning = false;
let telemetryHandle = null; // { stop, startRecording, ... } devuelto por startTelemetryServer
let tray = null;
let windowIsOverlay = false; // la ventana principal se creó como overlay
let recordingFile = null; // grabación de diagnóstico en curso
let topmostTimer = null;
let quitting = false;

// NUEVO: a nivel global, no dentro de createWindow
let replayWindow = null;

const isDev = !app.isPackaged; // dev vs producción [web:17]

// Versión beta (0.x.y-beta.N): graba la sesión sola y genera un informe .zip al cerrar
const isBetaBuild = betaReport.isBeta(app.getVersion());
const runStartedAt = Date.now();

// Log en archivo (userData/logs/ifuel.log): la app instalada no tiene consola visible
function setupFileLogging() {
  try {
    const logPath = path.join(app.getPath("userData"), "logs", "ifuel.log");
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    try {
      if (fs.statSync(logPath).size > 2 * 1024 * 1024) fs.renameSync(logPath, logPath + ".old");
    } catch {
      /* no existe todavía */
    }
    for (const level of ["log", "info", "warn", "error"]) {
      const original = console[level].bind(console);
      console[level] = (...args) => {
        original(...args);
        try {
          const text = args
            .map((a) => (a instanceof Error ? a.stack || a.message : typeof a === "string" ? a : util.inspect(a)))
            .join(" ");
          fs.appendFileSync(logPath, `${new Date().toISOString()} [${level}] ${text}\n`);
        } catch {
          /* el log nunca debe romper la app */
        }
      };
    }
    process.on("uncaughtException", (err) => console.error("uncaughtException:", err));
    process.on("unhandledRejection", (err) => console.error("unhandledRejection:", err));
    console.log(
      `[iFuel] Inicio v${app.getVersion()} (${app.isPackaged ? "instalada" : "desarrollo"}), ` +
        `Electron ${process.versions.electron}, ${process.platform} ${process.arch}, ` +
        `modo ventana forzado: ${forceWindowed}`,
    );
  } catch {
    /* sin log */
  }
}
setupFileLogging();

// Endurece un BrowserWindow: sin ventanas nuevas y sin navegar fuera de la propia app
function hardenWebContents(win) {
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, url) => {
    const startUrl = process.env.ELECTRON_START_URL;
    const allowed = startUrl ? url.startsWith(startUrl) : url.startsWith("file://");
    if (!allowed) event.preventDefault();
  });
}

function createReplayWindow() {
  if (replayWindow) return;

  replayWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: false,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      devTools: isDev,
      backgroundThrottling: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  hardenWebContents(replayWindow);

  const startUrl = process.env.ELECTRON_START_URL;

  if (startUrl) {
    replayWindow.loadURL(startUrl + "#/replay");
  } else {
    replayWindow.loadFile(
      path.join(__dirname, "../dist/index.html"),
      { hash: "replay" }
    );
  }

  replayWindow.on("closed", () => {
    replayWindow = null;
  });
}

function setReplayVisible(visible) {
  overlayState.replayVisible = visible;
  saveOverlayState();

  if (visible) {
    if (!replayWindow) {
      createReplayWindow();
    } else {
      replayWindow.show();
    }
  } else if (replayWindow) {
    replayWindow.hide();
  }

  sendOverlayState();
}



const overlayStatePath = path.join(app.getPath("userData"), "overlay-state.json");

const DEFAULT_OVERLAY_STATE = {
  fuelVisible: true,
  standingBattleVisible: true,
  yellowVisible: true,
  pitClearAirVisible: true,
  standingsVisible: true,
  widgetsLocked: true,
  fuelSettingsVisible: false,
  replayVisible: false, // ventana de broadcast apagada por defecto

  fuelScale: 1,
  relativeScale: 1,
  pitClearScale: 1,
  yellowScale: 1,
  standingsScale: 1,
  layoutMode: "free",

  fuelDetail: "compact", // "compact" (datos clave) | "full" (todos los datos) en el widget de combustible
  overlayMode: true, // ventana transparente, siempre encima y click-through (solo layout "free")
  overlayDisplayId: null, // monitor donde se dibuja el overlay (null = principal)
};

function validateOverlayState(candidate) {
  if (typeof candidate !== "object" || candidate === null) return false;

  const boolKeys = [
    "fuelVisible",
    "standingBattleVisible",
    "yellowVisible",
    "pitClearAirVisible",
    "standingsVisible",
    "widgetsLocked",
    "fuelSettingsVisible",
    "replayVisible",
    "overlayMode",
  ];
  const numberKeys = [
    "fuelScale",
    "relativeScale",
    "pitClearScale",
    "yellowScale",
    "standingsScale",
  ];

  for (const key of boolKeys) {
    if (typeof candidate[key] !== "boolean") return false;
  }
  for (const key of numberKeys) {
    const v = candidate[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0.5 || v > 3) {
      return false;
    }
  }

  if (
    candidate.fuelDetail != null &&
    !["compact", "full"].includes(candidate.fuelDetail)
  ) {
    return false;
  }

  if (
    candidate.overlayDisplayId != null &&
    !Number.isInteger(candidate.overlayDisplayId)
  ) {
    return false;
  }

  if (
    candidate.layoutMode &&
    !["free", "pitboard", "replay"].includes(candidate.layoutMode)
  ) {
    return false;
  }

  return true;
}


function loadOverlayState() {
  try {
    const raw = fs.readFileSync(overlayStatePath, { encoding: "utf8" });
    const parsed = JSON.parse(raw);
    // Se completa con los valores por defecto: un JSON guardado por una versión
    // anterior (sin claves nuevas) ya no resetea todos los ajustes.
    const merged = { ...DEFAULT_OVERLAY_STATE, ...parsed };
    if (!validateOverlayState(merged)) throw new Error("Invalid overlay state");
    return merged;
  } catch {
    return null;
  }
}

function saveOverlayState() {
  try {
    if (!validateOverlayState(overlayState)) {
      console.error("Refusing to save invalid overlayState");
      return;
    }
    fs.writeFileSync(
      overlayStatePath,
      JSON.stringify(overlayState, null, 2),
      { encoding: "utf8" },
    );
  } catch (err) {
    console.error("Error saving overlayState:", err);
  }
}

let overlayState = loadOverlayState() || { ...DEFAULT_OVERLAY_STATE };

async function startTelemetryServerInElectron() {
  if (telemetryServerRunning) return;
  try {
    const baseDir = isDev
      ? path.join(__dirname, "..")                  // proyecto local
      : path.join(__dirname, "..", "..");           // resources/ en la app instalada

    const serverPath = path.join(
      baseDir,
      "iFuel-telemetry-node",
      "telemetry-server.mjs",
    );

    const serverUrl = pathToFileURL(serverPath).href;
    telemetryModule = await import(serverUrl);

    if (typeof telemetryModule.startTelemetryServer === "function") {
      telemetryHandle = await telemetryModule.startTelemetryServer({
        host: "127.0.0.1",
        port: 7071,
        dataDir: app.getPath("userData"), // donde se guarda classColorMap.json
        dev: isDev, // en producción no se admite el origen de Vite
      });
      telemetryServerRunning = true;
      console.log("[iFuel] Telemetry server arrancado en 127.0.0.1:7071");
    } else {
      console.error(
        "startTelemetryServer no encontrado en telemetry-server.mjs",
      );
    }
  } catch (err) {
    console.error(
      "Error arrancando telemetry-server dentro de Electron:",
      err,
    );
    telemetryServerRunning = false;
  }
}

async function stopTelemetryServerInElectron() {
  const handle = telemetryHandle;
  telemetryHandle = null;
  telemetryServerRunning = false;
  recordingFile = null;
  if (handle && typeof handle.stop === "function") {
    try {
      await handle.stop();
    } catch (err) {
      console.error("Error parando telemetry-server:", err);
    }
  }
}

// (opcional/futuro) IPC seguro para leer/actualizar estado desde el renderer
ipcMain.handle("overlay:get-state", () => {
  return overlayState;
});

ipcMain.handle("overlay:update-partial", (_event, partial) => {
  if (typeof partial !== "object" || partial === null) {
    throw new Error("Invalid overlay update");
  }

const allowedKeys = new Set([
  "fuelVisible",
  "standingBattleVisible",
  "yellowVisible",
  "pitClearAirVisible",
  "standingsVisible",
  "widgetsLocked",
  "fuelSettingsVisible",
  "fuelScale",
  "relativeScale",
  "pitClearScale",
  "yellowScale",
  "standingsScale",
  "layoutMode",
  "replayVisible",
  "overlayMode",
  "overlayDisplayId",
  "fuelDetail",
]);



  // Se valida una copia: antes se modificaba el estado y, si la validación fallaba,
  // el valor inválido se quedaba en memoria.
  const next = { ...overlayState };
  for (const key of Object.keys(partial)) {
    if (!allowedKeys.has(key)) continue;
    next[key] = partial[key];
  }

  if (!validateOverlayState(next)) {
    throw new Error("Invalid overlay state after update");
  }
  overlayState = next;

  saveOverlayState();
  sendOverlayState();
  return overlayState;
});

// Ajusta la ventana al estado actual (overlay <-> ventana normal, monitor, click-through)
// Devuelve true si tuvo que recrear la ventana.
function syncWindowMode() {
  if (!mainWindow) return false;
  const wantOverlay = overlayWindow.shouldUseOverlay(overlayState, { forceWindowed });
  if (wantOverlay !== windowIsOverlay) {
    recreateMainWindow();
    return true;
  }
  if (windowIsOverlay) {
    const display = overlayWindow.pickDisplay(screen, overlayState.overlayDisplayId);
    overlayWindow.applyOverlayBehavior(mainWindow, {
      locked: overlayState.widgetsLocked,
      bounds: display.bounds,
    });
  }
  return false;
}

function sendOverlayState() {
  if (!mainWindow) return;
  if (syncWindowMode()) return; // la ventana nueva envía el estado al terminar de cargar
  mainWindow.webContents.send("overlay-state-changed", {
    ...overlayState,
    overlayActive: windowIsOverlay,
  });
  refreshTray();
}

const SCALE_OPTIONS = [0.75, 1, 1.25, 1.5];

// Submenú de tamaño (75–150 %) para una de las claves *Scale del estado del overlay
function scaleMenu(label, key) {
  return {
    label,
    submenu: SCALE_OPTIONS.map((value) => ({
      label: `${Math.round(value * 100)}%`,
      type: "radio",
      checked: overlayState[key] === value,
      click: () => {
        overlayState[key] = value;
        saveOverlayState();
        sendOverlayState();
      },
    })),
  };
}

function buildMenuTemplate() {
  const primaryDisplay = screen.getPrimaryDisplay();
  return [
    {
      label: "Layout",
      submenu: [
        {
          label: "Free",
          type: "radio",
          checked: overlayState.layoutMode === "free",
          click: () => {
            overlayState.layoutMode = "free";
            saveOverlayState();
            sendOverlayState();
          },
        },
        {
          label: "PitBoard",
          type: "radio",
          checked: overlayState.layoutMode === "pitboard",
          click: () => {
            overlayState.layoutMode = "pitboard";
            overlayState.widgetsLocked = true;
            saveOverlayState();
            sendOverlayState();
          },
        },
        {
          label: "Replay / Broadcast", 
          type: "radio",
          checked: overlayState.layoutMode === "replay",
          click: () => {
            overlayState.layoutMode = "replay";
            setReplayVisible(true);       // abre/enseña la ventana
          },
        },
      ],
    },
    {
      label: "Overlay",
      submenu: [
        {
          label: "Show Fuel",
          type: "checkbox",
          checked: overlayState.fuelVisible,
          click: (item) => {
            overlayState.fuelVisible = item.checked;
            saveOverlayState();
            sendOverlayState();
          },
        },
        {
          label: "Show Relative / Standing",
          type: "checkbox",
          checked: overlayState.standingBattleVisible,
          click: (item) => {
            overlayState.standingBattleVisible = item.checked;
            saveOverlayState();
            sendOverlayState();
          },
        },
        {
          label: "Show Standings",
          type: "checkbox",
          checked: overlayState.standingsVisible,
          click: (item) => {
            overlayState.standingsVisible = item.checked;
            saveOverlayState();
            sendOverlayState();
          },
        },
        {
          label: "Show Yellow Flag",
          type: "checkbox",
          checked: overlayState.yellowVisible,
          click: (item) => {
            overlayState.yellowVisible = item.checked;
            saveOverlayState();
            sendOverlayState();
          },
        },
        {
          label: "Show Pit Clear Air (beta)",
          type: "checkbox",
          checked: overlayState.pitClearAirVisible,
          click: (item) => {
            overlayState.pitClearAirVisible = item.checked;
            saveOverlayState();
            sendOverlayState();
          },
        },
        { type: "separator" },
        {
          label: "Overlay over simulator (transparent, always on top)",
          type: "checkbox",
          checked: overlayState.overlayMode,
          click: () => toggleOverlayMode(),
        },
        {
          label: "Overlay display",
          submenu: screen.getAllDisplays().map((d, i) => ({
            label: `Display ${i + 1} (${d.bounds.width}x${d.bounds.height})${d.id === primaryDisplay.id ? " - primary" : ""}`,
            type: "radio",
            checked: (overlayState.overlayDisplayId ?? primaryDisplay.id) === d.id,
            click: () => {
              overlayState.overlayDisplayId = d.id;
              saveOverlayState();
              sendOverlayState();
            },
          })),
        },
        {
          label: "Reset widget positions",
          click: () => {
            // Borra las posiciones guardadas y recarga: los widgets vuelven a su sitio por defecto
            if (!mainWindow) return;
            mainWindow.webContents
              .executeJavaScript(
                "Object.keys(localStorage).filter(k => k.startsWith('ifuel-pos-') && k !== 'ifuel-pos-version').forEach(k => localStorage.removeItem(k)); location.reload();",
              )
              .catch((err) => console.warn("[iFuel] No se pudieron reiniciar las posiciones:", err));
          },
        },
        {
          label: "Lock widgets (click-through)  Ctrl+Shift+L",
          type: "checkbox",
          checked: overlayState.widgetsLocked,
          click: (item) => {
            if (overlayState.layoutMode === "pitboard") {
              overlayState.widgetsLocked = true;
              item.checked = true;
            } else {
              overlayState.widgetsLocked = item.checked;
            }
            saveOverlayState();
            sendOverlayState();
          },
        },

        { type: "separator" },

        // Escala Relative / Standing
        scaleMenu("Standing / Relative size", "relativeScale"),

        // Escala Fuel
        scaleMenu("Fuel size", "fuelScale"),
        {
          label: "Fuel detail",
          submenu: [
            ["compact", "Compact (key data)"],
            ["full", "Full (all data)"],
          ].map(([mode, label]) => ({
            label,
            type: "radio",
            checked: overlayState.fuelDetail === mode,
            click: () => {
              overlayState.fuelDetail = mode;
              saveOverlayState();
              sendOverlayState();
            },
          })),
        },

        // Escala Yellow
        scaleMenu("Yellow size", "yellowScale"),

        // Escala Standings
        scaleMenu("Standings size", "standingsScale"),

        // Escala Pit Clear
        scaleMenu("Pit Clear size", "pitClearScale"),

        { type: "separator" },
        {
          label: "Reload widgets",
          role: "reload",
        },
      ],
    },
    {
      label: "Fuel",
      submenu: [
        {
          label: "Show settings panel",
          type: "checkbox",
          checked: overlayState.fuelSettingsVisible,
          click: (item) => {
            overlayState.fuelSettingsVisible = item.checked;
            saveOverlayState();
            sendOverlayState();
          },
        },
      ],
    },
    {
      label: "Server",
      submenu: [
        {
          label: "Restart telemetry server",
          click: async () => {
            await stopTelemetryServerInElectron();
            await startTelemetryServerInElectron();
          },
        },
      ],
    },
    {
      label: "Diagnostics",
      submenu: [
        recordingFile
          ? { label: "Stop recording session", click: () => stopRecording() }
          : { label: "Start recording session", click: () => startRecording() },
        { label: "Save SDK snapshot", click: () => saveSnapshot() },
        { type: "separator" },
        {
          label: "Open data folder (logs, recordings)",
          click: () => shell.openPath(app.getPath("userData")),
        },
      ],
    },
    ...(isBetaBuild
      ? [
          {
            label: "BETA test",
            submenu: [
              { label: "Open test guide", click: () => openTestGuide() },
              { label: "Generate report now (zip)", click: () => generateBetaReport({ reveal: true }) },
              { label: "Open reports folder", click: () => shell.openPath(betaReportsDir()) },
            ],
          },
        ]
      : []),
  ];
}

function createMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenuTemplate()));
}

function recreateMainWindow() {
  const old = mainWindow;
  mainWindow = null; // así el 'closed' de la ventana vieja no cuenta como "última ventana cerrada"
  createWindow();
  if (old && !old.isDestroyed()) old.destroy();
}

function toggleLock() {
  if (overlayState.layoutMode === "pitboard") return;
  overlayState.widgetsLocked = !overlayState.widgetsLocked;
  saveOverlayState();
  sendOverlayState();
}

function toggleOverlayMode() {
  overlayState.overlayMode = !overlayState.overlayMode;
  saveOverlayState();
  sendOverlayState();
}

function toggleVisible() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) mainWindow.hide();
  else if (windowIsOverlay) mainWindow.showInactive();
  else mainWindow.show();
}

// --- Bandeja del sistema: en modo overlay no hay barra de título ni menú, y en click-through
// no se puede pulsar nada; la bandeja y los atajos son la forma de controlar la app.
function trayIconPath() {
  return isDev
    ? path.join(__dirname, "..", "build", "icon.ico")
    : path.join(process.resourcesPath, "icon.ico");
}

function buildTrayTemplate() {
  return [
    {
      label: "Lock widgets (click-through)  Ctrl+Shift+L",
      type: "checkbox",
      checked: overlayState.widgetsLocked,
      click: () => toggleLock(),
    },
    { label: "Show / hide overlay  Ctrl+Shift+H", click: () => toggleVisible() },
    {
      label: "Overlay over simulator",
      type: "checkbox",
      checked: overlayState.overlayMode,
      click: () => toggleOverlayMode(),
    },
    { type: "separator" },
    ...buildMenuTemplate().map((item) => ({ label: item.label, submenu: item.submenu })),
    { type: "separator" },
    { label: "Quit iFuel", click: () => app.quit() },
  ];
}

function refreshTray() {
  if (!tray) return;
  try {
    tray.setContextMenu(Menu.buildFromTemplate(buildTrayTemplate()));
  } catch (err) {
    console.error("No se pudo actualizar el menú de la bandeja:", err);
  }
}

function createTray() {
  if (tray) return;
  try {
    const image = nativeImage.createFromPath(trayIconPath());
    if (image.isEmpty()) console.warn("[iFuel] Icono de bandeja no encontrado:", trayIconPath());
    tray = new Tray(image);
    tray.setToolTip("iFuel");
    tray.on("double-click", () => toggleVisible());
    refreshTray();
  } catch (err) {
    console.error("No se pudo crear el icono de la bandeja:", err);
  }
}

function registerShortcuts() {
  const bindings = [
    ["CommandOrControl+Shift+L", toggleLock],
    ["CommandOrControl+Shift+H", toggleVisible],
  ];
  for (const [accelerator, handler] of bindings) {
    if (!globalShortcut.register(accelerator, handler)) {
      console.warn(`[iFuel] No se pudo registrar el atajo ${accelerator} (¿lo usa otra aplicación?)`);
    }
  }
}

// --- Diagnóstico: grabación de la sesión y volcado de datos crudos del SDK
const diagnosticsDir = () => path.join(app.getPath("userData"), "diagnostics");

function notify(title, body) {
  console.log(`[iFuel] ${title}: ${body}`);
  try {
    if (Notification.isSupported()) new Notification({ title, body }).show();
  } catch {
    /* sin notificaciones */
  }
}

function startRecording() {
  if (!telemetryHandle) return notify("iFuel", "El servidor de telemetría no está en marcha");
  try {
    recordingFile = telemetryHandle.startRecording(diagnosticsDir());
    notify("iFuel: grabando sesión", path.basename(recordingFile));
  } catch (err) {
    console.error("No se pudo iniciar la grabación:", err);
  }
  createMenu();
  refreshTray();
}

async function stopRecording() {
  try {
    const file = telemetryHandle ? await telemetryHandle.stopRecording() : null;
    if (file) notify("iFuel: grabación guardada", file);
  } catch (err) {
    console.error("No se pudo cerrar la grabación:", err);
  }
  recordingFile = null;
  createMenu();
  refreshTray();
}

function saveSnapshot() {
  if (!telemetryHandle) return notify("iFuel", "El servidor de telemetría no está en marcha");
  try {
    notify("iFuel: volcado del SDK guardado", telemetryHandle.saveSnapshot(diagnosticsDir()));
  } catch (err) {
    console.error("No se pudo guardar el volcado del SDK:", err);
  }
}

// --- Beta: grabación automática, volcados periódicos del SDK e informe .zip al cerrar
const betaReportsDir = () => path.join(app.getPath("documents"), "iFuel-beta");
let betaTimer = null;
let betaSnapshotsTaken = 0;
let betaConnectedAt = null;
let betaLastSnapshotAt = 0;
let betaAutosaveTimer = null;
const betaAutosaveMs = Number(process.env.IFUEL_BETA_AUTOSAVE_MS) || 3 * 60_000;
const BETA_AUTOSAVE_NAME = "ifuel-beta-AUTOSAVE.zip";

function startBetaSession() {
  if (!isBetaBuild || !telemetryHandle) return;
  startRecording();
  console.log(`[iFuel] Informes beta en: ${betaReportsDir()}`);
  notify(
    `iFuel BETA ${app.getVersion()}: grabando la prueba`,
    `Al cerrar (bandeja → Quit iFuel) se genera el informe en ${betaReportsDir()}`,
  );
  // Copia de seguridad: si la app se cierra a la fuerza (administrador de tareas, cuelgue) queda el último informe
  betaAutosaveTimer = setInterval(() => {
    try {
      telemetryHandle?.flushRecording?.();
      generateBetaReport({ name: BETA_AUTOSAVE_NAME });
    } catch (err) {
      console.error("[iFuel] Autoguardado del informe beta fallido:", err);
    }
  }, betaAutosaveMs);
  betaTimer = setInterval(() => {
    try {
      if (!telemetryHandle?.isSdkConnected?.()) return;
      const now = Date.now();
      betaConnectedAt ??= now;
      // primer volcado 30 s después de recibir datos; luego uno cada 10 minutos
      const due = betaSnapshotsTaken === 0 ? now - betaConnectedAt > 30_000 : now - betaLastSnapshotAt > 10 * 60_000;
      if (due && betaSnapshotsTaken < 8) {
        telemetryHandle.saveSnapshot(diagnosticsDir());
        betaSnapshotsTaken++;
        betaLastSnapshotAt = now;
      }
    } catch (err) {
      console.error("[iFuel] Volcado automático del SDK fallido:", err);
    }
  }, 5000);
}

function openTestGuide() {
  const guide = isDev
    ? path.join(__dirname, "..", "docs", "PRUEBA-BETA.txt")
    : path.join(process.resourcesPath, "PRUEBA-BETA.txt");
  shell.openPath(guide).then((err) => {
    if (err) console.error("No se pudo abrir la guía:", err);
  });
}

// Reúne logs, grabación, volcados y configuración en un .zip. Devuelve la ruta (o null si falla).
function generateBetaReport({ reveal = false, name = null } = {}) {
  try {
    const { zipPath, included } = betaReport.buildReport({
      userData: app.getPath("userData"),
      outDir: betaReportsDir(),
      fileName: name,
      since: runStartedAt - 1000,
      summary: {
        app: `iFuel ${app.getVersion()}`,
        electron: process.versions.electron,
        sistema: `${process.platform} ${process.arch} ${require("os").release()}`,
        inicio: new Date(runStartedAt).toISOString(),
        duracionMin: Math.round((Date.now() - runStartedAt) / 600) / 100,
        volcadosAutomaticos: betaSnapshotsTaken,
        modoVentanaForzado: forceWindowed,
        overlay: { ...overlayState },
        monitores: screen.getAllDisplays().map((d) => ({ id: d.id, bounds: d.bounds, scale: d.scaleFactor })),
      },
    });
    console.log(`[iFuel] Informe beta: ${zipPath} (${included.length} archivos)`);
    if (reveal) shell.showItemInFolder(zipPath);
    return zipPath;
  } catch (err) {
    console.error("No se pudo generar el informe beta:", err);
    return null;
  }
}

function createWindow() {
  const overlay = overlayWindow.shouldUseOverlay(overlayState, { forceWindowed });
  const display = overlayWindow.pickDisplay(screen, overlayState.overlayDisplayId);

  const win = new BrowserWindow(
    overlayWindow.buildMainWindowOptions({
      overlay,
      bounds: display.bounds,
      isDev,
      preloadPath: path.join(__dirname, "preload.cjs"),
      iconPath: isDev ? path.join(__dirname, "..", "build", "icon.ico") : undefined,
    }),
  );
  mainWindow = win;
  windowIsOverlay = overlay;

  hardenWebContents(win);
  createMenu();

  const startUrl = process.env.ELECTRON_START_URL;
  if (startUrl) {
    win.loadURL(startUrl);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  if (overlay) {
    // Se muestra sin activarla (showInactive) para no sacar el foco al simulador.
    let revealed = false;
    const reveal = () => {
      if (revealed || win.isDestroyed()) return;
      revealed = true;
      overlayWindow.applyOverlayBehavior(win, {
        locked: overlayState.widgetsLocked,
        bounds: display.bounds,
      });
      win.showInactive();
    };
    win.once("ready-to-show", reveal);
    win.webContents.once("did-fail-load", reveal); // que no se quede invisible si la página falla
    setTimeout(reveal, 5000);
  }

  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });

  win.webContents.on("did-finish-load", () => {
    sendOverlayState();
  });

  if (isDev && process.env.IFUEL_DEVTOOLS === "1") {
    win.webContents.openDevTools({ mode: "detach" });
  }

  // cinturón extra: si alguien consigue abrir DevTools en producción, cerrarlos
  if (!isDev) {
    win.webContents.on("devtools-opened", () => {
      win.webContents.closeDevTools();
    });
  }
}

// Una sola instancia: una segunda intentaría abrir el mismo puerto 7071
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (windowIsOverlay) {
      mainWindow.showInactive();
    } else {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    await startTelemetryServerInElectron();
    createWindow();
    createTray();
    registerShortcuts();
    startBetaSession();

    // Reafirma "siempre encima" y reacomoda el overlay si cambian los monitores
    topmostTimer = setInterval(() => {
      if (windowIsOverlay) overlayWindow.keepOnTop(mainWindow);
    }, 3000);
    for (const event of ["display-added", "display-removed", "display-metrics-changed"]) {
      screen.on(event, () => {
        syncWindowMode();
        createMenu();
        refreshTray();
      });
    }
  });
}

// Se espera a que el servidor cierre (y finalice la grabación gzip) antes de salir
app.on("before-quit", (event) => {
  if (quitting) return;
  quitting = true;
  event.preventDefault();
  console.log("[iFuel] Cierre: iniciado");
  if (topmostTimer) clearInterval(topmostTimer);
  if (betaTimer) clearInterval(betaTimer);
  if (betaAutosaveTimer) clearInterval(betaAutosaveTimer);
  if (isBetaBuild) {
    // volcado final con la sesión aún viva, antes de parar el servidor
    try {
      if (telemetryHandle?.isSdkConnected?.()) telemetryHandle.saveSnapshot(diagnosticsDir());
      telemetryHandle?.flushRecording?.();
    } catch (err) {
      console.error("Volcado final del SDK fallido:", err);
    }
  }
  // Si parar el servidor se cuelga, no se queda la app sin cerrar ni sin informe
  const STOP_TIMEOUT_MS = 8000;
  let timedOut = false;
  Promise.race([
    stopTelemetryServerInElectron(),
    new Promise((resolve) => setTimeout(() => { timedOut = true; resolve(); }, STOP_TIMEOUT_MS)),
  ])
    .catch((err) => console.error("[iFuel] Cierre: error parando el servidor:", err))
    .finally(() => {
      if (timedOut) console.error(`[iFuel] Cierre: el servidor no paró en ${STOP_TIMEOUT_MS} ms; se continúa`);
      else console.log("[iFuel] Cierre: servidor parado");
      if (isBetaBuild) {
        // el servidor ya cerró la grabación gzip: ahora sí, el informe definitivo
        const zip = generateBetaReport({ reveal: true });
        if (zip) {
          console.log(`[iFuel] Cierre: informe final ${zip}`);
          try {
            fs.rmSync(path.join(betaReportsDir(), BETA_AUTOSAVE_NAME), { force: true });
          } catch {
            /* ignorar */
          }
        } else {
          // el final falló: que al menos se vea el último autoguardado
          const auto = path.join(betaReportsDir(), BETA_AUTOSAVE_NAME);
          if (fs.existsSync(auto)) shell.showItemInFolder(auto);
        }
      }
      console.log("[iFuel] Cierre: terminado");
      app.quit();
    });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (tray) tray.destroy();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
