// electron/preload.cjs
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ifuelOverlay", {
  onOverlayStateChanged(callback) {
    const listener = (_event, state) => {
      callback(state);
    };

    ipcRenderer.on("overlay-state-changed", listener);

    // devolvemos función para desuscribir
    return () => {
      ipcRenderer.removeListener("overlay-state-changed", listener);
    };
  },
});

