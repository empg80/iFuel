import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { shouldUseOverlay, pickDisplay, buildMainWindowOptions, applyOverlayBehavior, keepOnTop } =
  createRequire(import.meta.url)("../electron/overlayWindow.cjs");

const bounds = { x: 1920, y: 0, width: 2560, height: 1440 };

test("overlay solo con layout free, salvo que el usuario lo desactive o se fuerce el modo ventana", () => {
  assert.equal(shouldUseOverlay({ layoutMode: "free", overlayMode: true }), true);
  assert.equal(shouldUseOverlay({ overlayMode: true }), true, "sin layoutMode se asume free");
  assert.equal(shouldUseOverlay({ layoutMode: "free", overlayMode: false }), false);
  assert.equal(shouldUseOverlay({ layoutMode: "pitboard", overlayMode: true }), false);
  assert.equal(shouldUseOverlay({ layoutMode: "replay", overlayMode: true }), false);
  assert.equal(shouldUseOverlay({ layoutMode: "free", overlayMode: true }, { forceWindowed: true }), false);
});

test("pickDisplay devuelve el monitor elegido o el principal si ya no existe", () => {
  const screen = {
    getAllDisplays: () => [{ id: 1 }, { id: 7 }],
    getPrimaryDisplay: () => ({ id: 1 }),
  };
  assert.equal(pickDisplay(screen, 7).id, 7);
  assert.equal(pickDisplay(screen, 99).id, 1, "monitor desconectado -> principal");
  assert.equal(pickDisplay(screen, null).id, 1);
});

test("opciones de overlay: transparente, sin marco, encima, sin foco, sin barra de tareas y oculta al crearse", () => {
  const o = buildMainWindowOptions({ overlay: true, bounds, isDev: false, preloadPath: "p.cjs", iconPath: undefined });
  assert.deepEqual([o.x, o.y, o.width, o.height], [1920, 0, 2560, 1440]);
  assert.equal(o.frame, false);
  assert.equal(o.transparent, true);
  assert.equal(o.backgroundColor, "#00000000");
  assert.equal(o.alwaysOnTop, true);
  assert.equal(o.focusable, false, "no debe robar el foco al simulador");
  assert.equal(o.skipTaskbar, true);
  assert.equal(o.show, false, "se muestra con showInactive()");
  assert.equal(o.hasShadow, false);
  assert.equal(o.resizable, false);
});

test("opciones de ventana normal: con marco, opaca y sin forzar encima", () => {
  const o = buildMainWindowOptions({ overlay: false, bounds, isDev: true, preloadPath: "p.cjs" });
  assert.equal(o.frame, true);
  assert.equal(o.transparent, false);
  assert.equal(o.alwaysOnTop, false);
  assert.equal(o.focusable, undefined);
});

test("seguridad: ambas modalidades mantienen aislamiento, sandbox y sin nodeIntegration", () => {
  for (const overlay of [true, false]) {
    const w = buildMainWindowOptions({ overlay, bounds, isDev: false, preloadPath: "p.cjs" }).webPreferences;
    assert.equal(w.contextIsolation, true);
    assert.equal(w.sandbox, true);
    assert.equal(w.nodeIntegration, false);
    assert.equal(w.devTools, false, "DevTools solo en desarrollo");
    assert.equal(w.backgroundThrottling, false);
  }
});

const fakeWin = (over = {}) => {
  const calls = [];
  const win = {
    calls, destroyed: false, visible: true,
    bounds: { x: 0, y: 0, width: 100, height: 100 },
    isDestroyed() { return this.destroyed; },
    isVisible() { return this.visible; },
    getBounds() { return this.bounds; },
    setBounds(b) { calls.push(["setBounds", b]); this.bounds = b; },
    setAlwaysOnTop(...a) { calls.push(["setAlwaysOnTop", ...a]); },
    setFocusable(v) { calls.push(["setFocusable", v]); },
    setIgnoreMouseEvents(...a) { calls.push(["setIgnoreMouseEvents", ...a]); },
    moveTop() { calls.push(["moveTop"]); },
    ...over,
  };
  return win;
};

test("bloqueado = click-through (los clics atraviesan hasta el juego)", () => {
  const w = fakeWin();
  applyOverlayBehavior(w, { locked: true, bounds });
  assert.deepEqual(w.calls.find((c) => c[0] === "setIgnoreMouseEvents"), ["setIgnoreMouseEvents", true, { forward: true }]);
  assert.deepEqual(w.calls.find((c) => c[0] === "setAlwaysOnTop"), ["setAlwaysOnTop", true, "screen-saver"]);
  assert.deepEqual(w.calls.find((c) => c[0] === "setFocusable"), ["setFocusable", false]);
});

test("desbloqueado = modo edición: la ventana captura el ratón", () => {
  const w = fakeWin();
  applyOverlayBehavior(w, { locked: false, bounds });
  assert.deepEqual(w.calls.find((c) => c[0] === "setIgnoreMouseEvents"), ["setIgnoreMouseEvents", false, { forward: true }]);
});

test("solo recoloca la ventana si los límites cambian (idempotente)", () => {
  const w = fakeWin();
  applyOverlayBehavior(w, { locked: true, bounds });
  applyOverlayBehavior(w, { locked: true, bounds });
  assert.equal(w.calls.filter((c) => c[0] === "setBounds").length, 1);
});

test("una ventana destruida o ausente no provoca errores", () => {
  assert.doesNotThrow(() => applyOverlayBehavior(null, { locked: true }));
  assert.doesNotThrow(() => applyOverlayBehavior(fakeWin({ destroyed: true }), { locked: true, bounds }));
  assert.doesNotThrow(() => keepOnTop(fakeWin({ destroyed: true })));
});

test("keepOnTop reafirma 'encima' solo si la ventana está visible", () => {
  const visible = fakeWin(); keepOnTop(visible);
  assert.ok(visible.calls.some((c) => c[0] === "moveTop"));
  const hidden = fakeWin({ visible: false }); keepOnTop(hidden);
  assert.deepEqual(hidden.calls, []);
});
