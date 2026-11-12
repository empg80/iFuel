// electron/overlayWindow.cjs
//
// Decisiones de ventana para el modo overlay (transparente, siempre encima, click-through).
// Son funciones sin estado y sin depender del ciclo de vida de Electron para poder probarlas
// con simuladores (ver test/overlayWindow.test.mjs).

/**
 * ¿La ventana principal debe ser un overlay sobre el simulador?
 * Solo con el layout "free": PitBoard y Replay/Broadcast son pantallas completas pensadas
 * para una ventana normal (segundo monitor, tablet u OBS), no para ir encima del juego.
 */
function shouldUseOverlay(state, { forceWindowed = false } = {}) {
  if (forceWindowed) return false;
  return state.overlayMode !== false && (state.layoutMode ?? "free") === "free";
}

/** Pantalla elegida por el usuario; si ya no existe (monitor desconectado), la principal. */
function pickDisplay(screen, displayId) {
  const displays = screen.getAllDisplays();
  return displays.find((d) => d.id === displayId) ?? screen.getPrimaryDisplay();
}

/**
 * Posición/tamaño guardados de la ventana normal (pitboard en el monitor secundario).
 * Devuelve los bounds si siguen cayendo en algún monitor conectado; si no (monitor desconectado), null.
 */
function pickWindowBounds(saved, displays) {
  if (!saved || ![saved.x, saved.y, saved.width, saved.height].every(Number.isFinite)) return null;
  if (saved.width < 300 || saved.height < 200) return null;
  const visible = displays.some((d) => {
    const b = d.workArea ?? d.bounds;
    const w = Math.min(saved.x + saved.width, b.x + b.width) - Math.max(saved.x, b.x);
    const h = Math.min(saved.y + saved.height, b.y + b.height) - Math.max(saved.y, b.y);
    return w >= 200 && h >= 100; // al menos una parte razonable dentro del monitor
  });
  return visible ? { x: saved.x, y: saved.y, width: saved.width, height: saved.height } : null;
}

/** Opciones del BrowserWindow principal, en modo overlay o en modo ventana normal. */
function buildMainWindowOptions({ overlay, bounds, isDev, preloadPath, iconPath, windowBounds = null }) {
  const webPreferences = {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
    devTools: isDev, // DevTools sólo en desarrollo
    backgroundThrottling: false, // que el overlay no se congele cuando el juego tiene el foco
    autoplayPolicy: "no-user-gesture-required", // el spotter suena sin que nadie haya hecho clic
    preload: preloadPath,
  };

  if (!overlay) {
    return {
      ...(windowBounds ?? { width: 800, height: 600 }),
      frame: true,
      transparent: false,
      backgroundColor: "#202020",
      alwaysOnTop: false,
      resizable: true,
      icon: iconPath,
      webPreferences,
    };
  }

  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    focusable: false, // nunca roba el foco al simulador (WS_EX_NOACTIVATE en Windows)
    skipTaskbar: true, // se controla desde el icono de la bandeja y los atajos
    show: false, // se muestra con showInactive() para no activar la ventana
    icon: iconPath,
    webPreferences,
  };
}

/**
 * Aplica el comportamiento de overlay a una ventana ya creada:
 * - bloqueada  -> click-through: todos los clics atraviesan hasta el juego;
 * - desbloqueada -> modo edición: la ventana captura el ratón para arrastrar los widgets.
 * Es idempotente: se puede llamar cada vez que cambia el estado.
 */
function applyOverlayBehavior(win, { locked, bounds }) {
  if (!win || win.isDestroyed()) return;

  if (bounds) {
    const current = win.getBounds();
    if (
      current.x !== bounds.x ||
      current.y !== bounds.y ||
      current.width !== bounds.width ||
      current.height !== bounds.height
    ) {
      win.setBounds(bounds);
    }
  }

  win.setAlwaysOnTop(true, "screen-saver"); // nivel más alto: por encima de ventanas a pantalla completa
  win.setFocusable(false);
  // forward: true sigue enviando mousemove a la página aunque los clics se ignoren
  win.setIgnoreMouseEvents(!!locked, { forward: true });
}

/** Reafirma "siempre encima": el juego u otra ventana pueden haberla tapado. */
function keepOnTop(win) {
  if (!win || win.isDestroyed() || !win.isVisible()) return;
  win.setAlwaysOnTop(true, "screen-saver");
  win.moveTop();
}

module.exports = {
  shouldUseOverlay,
  pickDisplay,
  pickWindowBounds,
  buildMainWindowOptions,
  applyOverlayBehavior,
  keepOnTop,
};
