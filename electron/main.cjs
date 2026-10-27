// electron/main.cjs
const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

let mainWindow = null;
let telemetryModule = null;
let telemetryServerRunning = false;
let telemetryHandle = null; // { stop } devuelto por startTelemetryServer

// NUEVO: a nivel global, no dentro de createWindow
let replayWindow = null;

const isDev = !app.isPackaged; // dev vs producción [web:17]

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

function sendOverlayState() {
  if (!mainWindow) return;
  mainWindow.webContents.send("overlay-state-changed", overlayState);
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

function createMenu() {
  const template = [
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
          label: "Lock widgets",
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
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: true,
    transparent: false,
    backgroundColor: "#202020",
    alwaysOnTop: false,
    resizable: true,
    icon: isDev ? path.join(__dirname, "..", "build", "icon.ico") : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      devTools: isDev, // DevTools sólo en desarrollo
      backgroundThrottling: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  hardenWebContents(mainWindow);
  createMenu();

  const startUrl = process.env.ELECTRON_START_URL;

  if (startUrl) {
    mainWindow.loadURL(startUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.on("did-finish-load", () => {
    sendOverlayState();
  });

  // ABRIR DEVTOOLS AUTOMÁTICAMENTE EN DESARROLLO
// if (isDev && mainWindow) {
//   mainWindow.webContents.openDevTools({ mode: "detach" });
// }

  // cinturón extra: si alguien consigue abrir DevTools en producción, cerrarlos
  if (!isDev) {
    mainWindow.webContents.on("devtools-opened", () => {
      mainWindow.webContents.closeDevTools();
    });
  }
}

// Una sola instancia: una segunda intentaría abrir el mismo puerto 7071
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    await startTelemetryServerInElectron();
    createWindow();
  });
}

app.on("before-quit", () => {
  stopTelemetryServerInElectron();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
