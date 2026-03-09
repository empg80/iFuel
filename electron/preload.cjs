// electron/preload.cjs
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ifuelOverlay", {
  /**
   * Suscribe un callback a los cambios de estado del overlay.
   * Devuelve una función para desuscribirse.
   */
  onOverlayStateChanged(callback) {
    if (typeof callback !== "function") return () => {};

    const listener = (_event, state) => {
      // Sólo pasamos el payload, nunca el event con sender
      callback(state);
    };

    ipcRenderer.on("overlay-state-changed", listener);

    // devolvemos función para desuscribir
    return () => {
      ipcRenderer.removeListener("overlay-state-changed", listener);
    };
  },

  /**
   * Opcional: obtener el estado completo actual desde React
   * (usa ipcMain.handle('overlay:get-state') en main.cjs).
   */
  getState: () => ipcRenderer.invoke("overlay:get-state"),

  /**
   * Opcional: aplicar un patch parcial al estado desde React
   * (usa ipcMain.handle('overlay:update-partial') en main.cjs).
   * Se asume validación fuerte en main.
   */
  updateState(partial) {
    if (typeof partial !== "object" || partial === null) {
      throw new Error("Invalid overlay update payload");
    }
    return ipcRenderer.invoke("overlay:update-partial", partial);
  },
});
