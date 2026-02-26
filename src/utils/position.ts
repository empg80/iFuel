export type WidgetPosition = { x: number; y: number };

export function loadWidgetPosition(key: string, fallback: WidgetPosition): WidgetPosition {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as WidgetPosition;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return parsed;
    }
    return fallback;
  } catch {
    return fallback;
  }
}
