import React, { useState, useRef, useEffect, useCallback } from "react";
import { useIfuelWebSocket } from "../useIfuelWebSocket";
import { useWidgetVisibility } from "../contexts/useWidgetVisibility";
import { PitClearAirWidget } from "./PitClearAirWidget";

const WS_URL = "ws://localhost:7071/ifuel";
const POS_KEY_PITCLEAR = "ifuel-pos-pitclear";

export const PitClearAirWidgetContainer: React.FC = () => {
  const {
    pitClearAir,
    widgetsLocked,
    pitClearScale,
  } = useWidgetVisibility();
  const { state, isConnected } = useIfuelWebSocket(WS_URL);

  const [position, setPosition] = useState(() => {
    try {
      const raw = localStorage.getItem(POS_KEY_PITCLEAR);
      if (!raw) return { x: 300, y: 100 };
      const parsed = JSON.parse(raw) as { x: number; y: number };
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        return parsed;
      }
      return { x: 300, y: 100 };
    } catch {
      return { x: 300, y: 100 };
    }
  });

  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    try {
      localStorage.setItem(POS_KEY_PITCLEAR, JSON.stringify(position));
    } catch (e) {
      console.error("Error guardando posición pitclear:", e);
    }
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
        position: "relative",
        left: position.x,
        top: position.y,
        transform: `scale(${pitClearScale ?? 1})`,
        transformOrigin: "top left",
      }}
      onMouseDown={handleMouseDown}
    >
      <PitClearAirWidget data={state?.pitClearAir ?? null} />

      <div
        style={{
          position: "absolute",
          top: -20,
          left: 0,
          padding: "2px 6px",
          borderRadius: 4,
          fontSize: 10,
          background: isConnected
            ? "rgba(0, 128, 0, 0.7)"
            : "rgba(128, 0, 0, 0.7)",
          color: "#fff",
        }}
      >
        PIT CLEAR {isConnected ? "ON" : "OFF"}
      </div>
    </div>
  );
};
