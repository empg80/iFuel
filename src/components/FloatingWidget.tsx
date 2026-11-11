import React, { useCallback, useEffect, useRef, useState } from "react";
import { useOverlayState } from "../contexts/useOverlayState";
import { clampPosition, loadWidgetPosition } from "../utils/position";
import { saveJsonToStorage } from "../utils/storage";

type Props = {
  id: string; // clave de posición: ifuel-pos-<id>
  visible: boolean;
  scale: number;
  defaultPos: { x: number; y: number };
  children: React.ReactNode;
};

/** Contenedor genérico del layout libre: arrastrable con los widgets desbloqueados, con tamaño ajustable. */
export const FloatingWidget: React.FC<Props> = ({ id, visible, scale, defaultPos, children }) => {
  const key = `ifuel-pos-${id}`;
  const { widgetsLocked = true } = useOverlayState();
  const [position, setPosition] = useState(() => loadWidgetPosition(key, defaultPos));
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => { saveJsonToStorage(key, position); }, [key, position]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPosition(clampPosition({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y }));
    };
    const up = () => { dragging.current = false; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  const onDown = useCallback((e: React.MouseEvent) => {
    if (widgetsLocked) return;
    dragging.current = true;
    offset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }, [widgetsLocked, position.x, position.y]);

  if (!visible) return null;
  return (
    <div
      className="pb-scope floating-widget"
      style={{ position: "absolute", left: position.x, top: position.y, transform: `scale(${scale})`, transformOrigin: "top left" }}
      onMouseDown={onDown}
    >
      {children}
    </div>
  );
};
