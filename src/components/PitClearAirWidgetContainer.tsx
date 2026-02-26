import React, { useState, useRef, useEffect, useCallback } from "react";
import { useIfuelWebSocket } from "../useIfuelWebSocket";
import { useWidgetVisibility } from "../contexts/useWidgetVisibility";
import { PitClearAirWidget } from "./PitClearAirWidget";
import { loadWidgetPosition } from "../utils/position";
import { saveJsonToStorage } from "../utils/storage";

const WS_URL = "ws://localhost:7071/ifuel";
const POS_KEY_PITCLEAR = "ifuel-pos-pitclear";

export const PitClearAirWidgetContainer: React.FC = () => {
  const { pitClearAir, widgetsLocked, pitClearScale } = useWidgetVisibility();
  const { state, isConnected } = useIfuelWebSocket(WS_URL);

  const [position, setPosition] = useState(() =>
    loadWidgetPosition(POS_KEY_PITCLEAR, { x: 300, y: 100 }),
  );

  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    saveJsonToStorage(POS_KEY_PITCLEAR, position);
  }, [position]);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      setPosition({
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      });
    }

    function handleMouseUp() {
      if (draggingRef.current) draggingRef.current = false;
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

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

  if (!pitClearAir) {
    return null;
  }

  return (
    <div
      className="pitclear-widget-container"
      style={{
        left: position.x,
        top: position.y,
        transform: `scale(${pitClearScale ?? 1})`,
      }}
      onMouseDown={handleMouseDown}
    >
      <PitClearAirWidget data={state?.pitClearAir ?? null} />

      <div
        className={`pitclear-widget-status ${
          isConnected
            ? "pitclear-widget-status--connected"
            : "pitclear-widget-status--disconnected"
        }`}
      >
        PIT CLEAR {isConnected ? "ON" : "OFF"}
      </div>
    </div>
  );
};
