import { useCallback, useEffect, useRef, useState } from "react";
import { loadWidgetPosition, clampPosition, persistPosition } from "../utils/position";
import { useOverlayState } from "../contexts/useOverlayState";

/**
 * Posición arrastrable y persistente para widgets que solo salen por evento (pit helper, tráfico rápido).
 * `ghost` es true cuando los widgets están desbloqueados y el usuario quiere ver también los widgets de evento para colocarlos.
 */
export function useDraggableWidget(storageKey: string, fallback: { x: number; y: number }, enabled: boolean) {
  const overlay = useOverlayState();
  const locked = overlay.widgetsLocked ?? true;
  const ghost = enabled && !locked && (overlay.showAllWidgets ?? true);
  const [pos, setPos] = useState(() => loadWidgetPosition(storageKey, fallback));
  const dragging = useRef(false);
  const off = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (!enabled) return;
    const mv = (e: MouseEvent) => { if (dragging.current) setPos(clampPosition({ x: e.clientX - off.current.x, y: e.clientY - off.current.y })); };
    const up = () => { dragging.current = false; };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [enabled]);
  useEffect(() => { if (enabled) persistPosition(storageKey, pos); }, [pos, enabled, storageKey]);
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!enabled || locked) return;
    dragging.current = true;
    off.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [enabled, locked, pos.x, pos.y]);
  const style = enabled ? { left: pos.x, top: pos.y, transform: "none" } : undefined;
  return { style, onMouseDown, ghost, locked };
}
