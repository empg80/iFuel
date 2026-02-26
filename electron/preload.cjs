// electron/preload.cjs
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ifuelOverlay", {
  onOverlayStateChanged(callback) {
    ipcRenderer.on("overlay-state-changed", (_event, state) => {
      callback(state);
    });
  },
});
