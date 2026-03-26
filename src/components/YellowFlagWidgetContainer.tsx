// YellowFlagWidgetContainer.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { YellowFlagWidget } from "./YellowFlagWidget";
import { loadWidgetPosition } from "../utils/position";
import { saveJsonToStorage } from "../utils/storage";
import type { IfuelState } from "../useIfuelWebSocket";
import { useOverlayState } from "../contexts/useOverlayState";
import type { YellowWarning } from "../types/yellow";

const POS_KEY_YELLOW = "ifuel-pos-yellow";

type Props = {
  state: IfuelState | null;
  isConnected: boolean;
  variant?: "free" | "pitboard";
};

export const YellowFlagWidgetContainer: React.FC<Props> = ({
  state,
  isConnected,
  variant = "free",
}) => {
  const overlayState = useOverlayState();

  const yellowVisible = overlayState.yellowVisible ?? true;
  const widgetsLocked = overlayState.widgetsLocked ?? true;
  const yellowScale = overlayState.yellowScale ?? 1;

  const [position, setPosition] = useState(() =>
    loadWidgetPosition(POS_KEY_YELLOW, { x: 900, y: 100 }),
  );

  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const isPitboard = variant === "pitboard";

  useEffect(() => {
    if (isPitboard) return;

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
  }, [isPitboard]);

  useEffect(() => {
    if (isPitboard) return;
    saveJsonToStorage(POS_KEY_YELLOW, position);
  }, [position, isPitboard]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isPitboard) return;
      if (widgetsLocked) return;
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("input")) return;

      draggingRef.current = true;
      dragOffsetRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [isPitboard, widgetsLocked, position.x, position.y],
  );

  if (!yellowVisible) return null;

  const warning = (state?.yellowWarning ?? null) as YellowWarning | null;
  const classColorIndexById = state?.classColorIndexById;
  const hasState = !!state;

  const isActiveYellow = !!warning && warning.active;
  const isDebris = isActiveYellow && warning?.type === "debris";

  const pitboardFlagClass =
    !isPitboard || !isActiveYellow
      ? ""
      : isDebris
        ? "pitboard-flagbar--debris"
        : "pitboard-flagbar--yellow";

  return (
    <div
      className={
        isPitboard
          ? ["yellow-widget-container", "pitboard-full", pitboardFlagClass]
              .filter(Boolean)
              .join(" ")
          : "yellow-widget-container"
      }
      style={
        isPitboard
          ? undefined
          : {
              left: position.x,
              top: position.y,
              transform: `scale(${yellowScale ?? 1})`,
            }
      }
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
