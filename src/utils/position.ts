import { saveJsonToStorage } from "./storage";

export type WidgetPosition = { x: number; y: number };

// Versión del sistema de posiciones. Hasta la beta.4 los widgets se colocaban con position: relative
// dentro de un contenedor centrado, así que lo guardado eran desplazamientos respecto al centro
// (a menudo negativos y enormes). Desde la beta.5 son coordenadas de la ventana: lo antiguo
// dejaba los widgets fuera de pantalla, por eso se descarta una sola vez.
const LAYOUT_VERSION_KEY = "ifuel-pos-version";
const LAYOUT_VERSION = "2";
const POS_PREFIX = "ifuel-pos-";

function migratePositionsOnce() {
  try {
    if (localStorage.getItem(LAYOUT_VERSION_KEY) === LAYOUT_VERSION) return;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(POS_PREFIX) && key !== LAYOUT_VERSION_KEY) localStorage.removeItem(key);
    }
    localStorage.setItem(LAYOUT_VERSION_KEY, LAYOUT_VERSION);
  } catch {
    // sin almacenamiento: se usan las posiciones por defecto
  }
}
migratePositionsOnce();

const MIN_VISIBLE_X = 80; // al menos esta parte del widget debe quedar dentro de la ventana
const MIN_VISIBLE_Y = 40;

/** Mantiene el widget dentro de la ventana (cambios de monitor/resolución, valores antiguos). */
export function clampPosition(
  pos: WidgetPosition,
  viewport: { width: number; height: number } = { width: window.innerWidth, height: window.innerHeight },
): WidgetPosition {
  const maxX = Math.max(0, viewport.width - MIN_VISIBLE_X);
  const maxY = Math.max(0, viewport.height - MIN_VISIBLE_Y);
  return {
    x: Math.min(Math.max(0, pos.x), maxX),
    y: Math.min(Math.max(0, pos.y), maxY),
  };
}

// Posiciones que se mostraron recortadas porque la ventana era más pequeña que la guardada (p. ej. ventana
// normal de pitboard/replay frente al overlay a pantalla completa). No se vuelven a guardar tal cual:
// lo guardado solo cambia cuando el usuario arrastra el widget.
const clampedOnLoad = new Map<string, WidgetPosition>();

export function loadWidgetPosition(key: string, fallback: WidgetPosition): WidgetPosition {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as WidgetPosition;
    if (typeof parsed.x === "number" && typeof parsed.y === "number" && Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
      const shown = clampPosition(parsed);
      if (shown.x !== parsed.x || shown.y !== parsed.y) clampedOnLoad.set(key, shown);
      else clampedOnLoad.delete(key);
      return shown;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/** Guarda la posición de un widget salvo que sea la versión recortada que solo se mostró al cargar. */
export function persistPosition(key: string, pos: WidgetPosition): void {
  const shown = clampedOnLoad.get(key);
  if (shown && shown.x === pos.x && shown.y === pos.y) return;
  clampedOnLoad.delete(key);
  saveJsonToStorage(key, pos);
}
