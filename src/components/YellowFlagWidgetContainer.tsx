import React, { useState, useRef, useEffect, useCallback } from "react";
import { YellowFlagWidget } from "./YellowFlagWidget";
import { useWidgetVisibility } from "../contexts/useWidgetVisibility";
import { loadWidgetPosition } from "../utils/position";
import { saveJsonToStorage } from "../utils/storage";
import type { IfuelState } from "../useIfuelWebSocket";

const POS_KEY_YELLOW = "ifuel-pos-yellow";

type Props = {
  state: IfuelState | null;
  isConnected: boolean;
};

export const YellowFlagWidgetContainer: React.FC<Props> = ({
  state,
  isConnected,
}) => {
  const { yellow, widgetsLocked, yellowScale } = useWidgetVisibility();

  const [position, setPosition] = useState(() =>
    loadWidgetPosition(POS_KEY_YELLOW, { x: 900, y: 100 }),
  );

  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      setPosition({
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      });
    }

    function handleMouseUp() {
      if (draggingRef.current) {
        draggingRef.current = false;
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    saveJsonToStorage(POS_KEY_YELLOW, position);
  }, [position]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (widgetsLocked) return;
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("input")) return;

      draggingRef.current = true;
      dragOffsetRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [widgetsLocked, position.x, position.y],
  );

  if (!yellow) return null;

  const warning = state?.yellowWarning ?? null;
  const classColorIndexById = state?.classColorIndexById;
  const hasState = !!state;

  return (
    <div
      className="yellow-widget-container"
      style={{
        left: position.x,
        top: position.y,
        transform: `scale(${yellowScale ?? 1})`,
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`yellow-widget-status ${
          isConnected
            ? "yellow-widget-status--connected"
            : "yellow-widget-status--disconnected"
        }`}
      >
        YELL {isConnected ? "ON" : "OFF"}
      </div>

      {hasState ? (
        <YellowFlagWidget
          warning={warning}
          classColorIndexById={classColorIndexById}
        />
      ) : (
        <div className="fuel-widget">
          <div className="label">ESPERANDO DATOS DE IRACING…</div>
        </div>
      )}
    </div>
  );
};
