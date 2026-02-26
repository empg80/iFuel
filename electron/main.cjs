// electron/main.cjs
const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

let mainWindow = null;

// estado global del overlay
let overlayState = {
  fuelVisible: true,
  standingBattleVisible: true,
  yellowVisible: true,
  pitClearAirVisible: true,
  widgetsLocked: true,
};

function sendOverlayState() {
  if (!mainWindow) return;
  mainWindow.webContents.send("overlay-state-changed", overlayState);
}

function createMenu() {
  const template = [
    {
      label: "Overlay",
      submenu: [
        {
          label: "Show Fuel",
          type: "checkbox",
          checked: overlayState.fuelVisible,
          click: (item) => {
            overlayState.fuelVisible = item.checked;
            sendOverlayState();
          },
        },
        {
          label: "Show Relative / Standing",
          type: "checkbox",
          checked: overlayState.standingBattleVisible,
          click: (item) => {
            overlayState.standingBattleVisible = item.checked;
            sendOverlayState();
          },
        },
        {
          label: "Show Yellow Flag",
          type: "checkbox",
          checked: overlayState.yellowVisible,
          click: (item) => {
            overlayState.yellowVisible = item.checked;
            sendOverlayState();
          },
        },
        {
          label: "Show Pit Clear Air (beta)",
          type: "checkbox",
          checked: overlayState.pitClearAirVisible,
          click: (item) => {
            overlayState.pitClearAirVisible = item.checked;
            sendOverlayState();
          },
        },
        { type: "separator" },
        {
          label: "Lock widgets",
          type: "checkbox",
          checked: overlayState.widgetsLocked,
          click: (item) => {
            overlayState.widgetsLocked = item.checked;
            sendOverlayState();
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
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

  // enviar estado inicial al cargar
  mainWindow.webContents.on("did-finish-load", () => {
    sendOverlayState();
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
