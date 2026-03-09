// electron/main.cjs
const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

let mainWindow = null;
let telemetryModule = null;
let telemetryServerRunning = false;

const isDev = !app.isPackaged; // dev vs producción [web:17]

const overlayStatePath = path.join(app.getPath("userData"), "overlay-state.json");

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
    if (typeof candidate[key] !== "number") return false;
  }
  if (!["free", "pitboard"].includes(candidate.layoutMode)) return false;

  return true;
}

function loadOverlayState() {
  try {
    const raw = fs.readFileSync(overlayStatePath, { encoding: "utf8" });
    const parsed = JSON.parse(raw);
    if (!validateOverlayState(parsed)) throw new Error("Invalid overlay state");
    return parsed;
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

// estado global del overlay
let overlayState =
  loadOverlayState() || {
    fuelVisible: true,
    standingBattleVisible: true,
    yellowVisible: true,
    pitClearAirVisible: true,
    standingsVisible: true,
    widgetsLocked: true,
    fuelSettingsVisible: false,

    // escalas
    fuelScale: 1,
    relativeScale: 1,
    pitClearScale: 1,
    yellowScale: 1,
    standingsScale: 1,
    layoutMode: "free",
  };

async function startTelemetryServerInElectron() {
  if (telemetryServerRunning) return;
  try {
    const serverPath = path.join(
      __dirname,
      "..",
      "..",
      "iFuel-telemetry-node",
      "telemetry-server.mjs",
    );

    const serverUrl = pathToFileURL(serverPath).href;
    telemetryModule = await import(serverUrl);

    if (typeof telemetryModule.startTelemetryServer === "function") {
      telemetryModule.startTelemetryServer({
        host: "127.0.0.1",
        port: 7071,
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
  ]);

  for (const key of Object.keys(partial)) {
    if (!allowedKeys.has(key)) continue;
    overlayState[key] = partial[key];
  }

  if (!validateOverlayState(overlayState)) {
    throw new Error("Invalid overlay state after update");
  }

  saveOverlayState();
  sendOverlayState();
  return overlayState;
});

function sendOverlayState() {
  if (!mainWindow) return;
  mainWindow.webContents.send("overlay-state-changed", overlayState);
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
            overlayState.widgetsLocked = true; // forzar bloqueo
            saveOverlayState();
            sendOverlayState();
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
        {
          label: "Standing / Relative size",
          submenu: [
            {
              label: "75%",
              type: "radio",
              checked: overlayState.relativeScale === 0.75,
              click: () => {
                overlayState.relativeScale = 0.75;
                saveOverlayState();
                sendOverlayState();
              },
            },
            {
              label: "100%",
              type: "radio",
              checked: overlayState.relativeScale === 1,
              click: () => {
                overlayState.relativeScale = 1;
                saveOverlayState();
                sendOverlayState();
              },
            },
            {
              label: "125%",
              type: "radio",
              checked: overlayState.relativeScale === 1.25,
              click: () => {
                overlayState.relativeScale = 1.25;
                saveOverlayState();
                sendOverlayState();
              },
            },
            {
              label: "150%",
              type: "radio",
              checked: overlayState.relativeScale === 1.5,
              click: () => {
                overlayState.relativeScale = 1.5;
                saveOverlayState();
                sendOverlayState();
              },
            },
          ],
        },

        // Escala Fuel
        {
          label: "Fuel size",
          submenu: [
            {
              label: "75%",
              type: "radio",
              checked: overlayState.fuelScale === 0.75,
              click: () => {
                overlayState.fuelScale = 0.75;
                saveOverlayState();
                sendOverlayState();
              },
            },
            {
              label: "100%",
              type: "radio",
              checked: overlayState.fuelScale === 1,
              click: () => {
                overlayState.fuelScale = 1;
                saveOverlayState();
                sendOverlayState();
              },
            },
            {
              label: "125%",
              type: "radio",
              checked: overlayState.fuelScale === 1.25,
              click: () => {
                overlayState.fuelScale = 1.25;
                saveOverlayState();
                sendOverlayState();
              },
            },
            {
              label: "150%",
              type: "radio",
              checked: overlayState.fuelScale === 1.5,
              click: () => {
                overlayState.fuelScale = 1.5;
                saveOverlayState();
                sendOverlayState();
              },
            },
          ],
        },

        // Escala Yellow
        {
          label: "Yellow size",
          submenu: [
            {
              label: "75%",
              type: "radio",
              checked: overlayState.yellowScale === 0.75,
              click: () => {
                overlayState.yellowScale = 0.75;
                saveOverlayState();
                sendOverlayState();
              },
            },
            {
              label: "100%",
              type: "radio",
              checked: overlayState.yellowScale === 1,
              click: () => {
                overlayState.yellowScale = 1;
                saveOverlayState();
                sendOverlayState();
              },
            },
            {
              label: "125%",
              type: "radio",
              checked: overlayState.yellowScale === 1.25,
              click: () => {
                overlayState.yellowScale = 1.25;
                saveOverlayState();
                sendOverlayState();
              },
            },
            {
              label: "150%",
              type: "radio",
              checked: overlayState.yellowScale === 1.5,
              click: () => {
                overlayState.yellowScale = 1.5;
                saveOverlayState();
                sendOverlayState();
              },
            },
          ],
        },

        // Escala Standings
        {
          label: "Standings size",
          submenu: [
            {
              label: "75%",
              type: "radio",
              checked: overlayState.standingsScale === 0.75,
              click: () => {
                overlayState.standingsScale = 0.75;
                saveOverlayState();
                sendOverlayState();
              },
            },
            {
              label: "100%",
              type: "radio",
              checked: overlayState.standingsScale === 1,
              click: () => {
                overlayState.standingsScale = 1;
                saveOverlayState();
                sendOverlayState();
              },
            },
            {
              label: "125%",
              type: "radio",
              checked: overlayState.standingsScale === 1.25,
              click: () => {
                overlayState.standingsScale = 1.25;
                saveOverlayState();
                sendOverlayState();
              },
            },
            {
              label: "150%",
              type: "radio",
              checked: overlayState.standingsScale === 1.5,
              click: () => {
                overlayState.standingsScale = 1.5;
                saveOverlayState();
                sendOverlayState();
              },
            },
          ],
        },

        // Escala Pit Clear
        {
          label: "Pit Clear size",
          submenu: [
            {
              label: "75%",
              type: "radio",
              checked: overlayState.pitClearScale === 0.75,
              click: () => {
                overlayState.pitClearScale = 0.75;
                saveOverlayState();
                sendOverlayState();
              },
            },
            {
              label: "100%",
              type: "radio",
              checked: overlayState.pitClearScale === 1,
              click: () => {
                overlayState.pitClearScale = 1;
                saveOverlayState();
                sendOverlayState();
              },
            },
            {
              label: "125%",
              type: "radio",
              checked: overlayState.pitClearScale === 1.25,
              click: () => {
                overlayState.pitClearScale = 1.25;
                saveOverlayState();
                sendOverlayState();
              },
            },
            {
              label: "150%",
              type: "radio",
              checked: overlayState.pitClearScale === 1.5,
              click: () => {
                overlayState.pitClearScale = 1.5;
                saveOverlayState();
                sendOverlayState();
              },
            },
          ],
        },

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
            telemetryServerRunning = false;
            // idealmente también exponer un stopTelemetryServer en el módulo
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
    icon: path.join(__dirname, "..", "..", "build", "icon.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      devTools: isDev, // DevTools sólo en desarrollo [web:17][web:19]
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

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

  // cinturón extra: si alguien consigue abrir DevTools en producción, cerrarlos
  if (!isDev) {
    mainWindow.webContents.on("devtools-opened", () => {
      mainWindow.webContents.closeDevTools();
    });
  }
}

app.whenReady().then(async () => {
  await startTelemetryServerInElectron();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
