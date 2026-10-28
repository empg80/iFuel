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

export function loadWidgetPosition(key: string, fallback: WidgetPosition): WidgetPosition {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as WidgetPosition;
    if (typeof parsed.x === "number" && typeof parsed.y === "number" && Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
      return clampPosition(parsed);
    }
    return fallback;
  } catch {
    return fallback;
  }
}
