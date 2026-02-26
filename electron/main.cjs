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
  fuelSettingsVisible: false,

  // escalas
  fuelScale: 1,
  relativeScale: 1,
  pitClearScale: 1,
  yellowScale: 1,
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
                sendOverlayState();
              },
            },
            {
              label: "100%",
              type: "radio",
              checked: overlayState.relativeScale === 1,
              click: () => {
                overlayState.relativeScale = 1;
                sendOverlayState();
              },
            },
            {
              label: "125%",
              type: "radio",
              checked: overlayState.relativeScale === 1.25,
              click: () => {
                overlayState.relativeScale = 1.25;
                sendOverlayState();
              },
            },
            {
              label: "150%",
              type: "radio",
              checked: overlayState.relativeScale === 1.5,
              click: () => {
                overlayState.relativeScale = 1.5;
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
                sendOverlayState();
              },
            },
            {
              label: "100%",
              type: "radio",
              checked: overlayState.fuelScale === 1,
              click: () => {
                overlayState.fuelScale = 1;
                sendOverlayState();
              },
            },
            {
              label: "125%",
              type: "radio",
              checked: overlayState.fuelScale === 1.25,
              click: () => {
                overlayState.fuelScale = 1.25;
                sendOverlayState();
              },
            },
            {
              label: "150%",
              type: "radio",
              checked: overlayState.fuelScale === 1.5,
              click: () => {
                overlayState.fuelScale = 1.5;
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
                sendOverlayState();
              },
            },
            {
              label: "100%",
              type: "radio",
              checked: overlayState.yellowScale === 1,
              click: () => {
                overlayState.yellowScale = 1;
                sendOverlayState();
              },
            },
            {
              label: "125%",
              type: "radio",
              checked: overlayState.yellowScale === 1.25,
              click: () => {
                overlayState.yellowScale = 1.25;
                sendOverlayState();
              },
            },
            {
              label: "150%",
              type: "radio",
              checked: overlayState.yellowScale === 1.5,
              click: () => {
                overlayState.yellowScale = 1.5;
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
                sendOverlayState();
              },
            },
            {
              label: "100%",
              type: "radio",
              checked: overlayState.pitClearScale === 1,
              click: () => {
                overlayState.pitClearScale = 1;
                sendOverlayState();
              },
            },
            {
              label: "125%",
              type: "radio",
              checked: overlayState.pitClearScale === 1.25,
              click: () => {
                overlayState.pitClearScale = 1.25;
                sendOverlayState();
              },
            },
            {
              label: "150%",
              type: "radio",
              checked: overlayState.pitClearScale === 1.5,
              click: () => {
                overlayState.pitClearScale = 1.5;
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
