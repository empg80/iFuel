import React, { useState, useRef, useEffect, useCallback } from "react";
import { useWidgetVisibility } from "../contexts/useWidgetVisibility";
import { PitClearAirWidget } from "./PitClearAirWidget";
import { loadWidgetPosition } from "../utils/position";
import { saveJsonToStorage } from "../utils/storage";
import type { PitClearAirData } from "../types/pit";

const POS_KEY_PITCLEAR = "ifuel-pos-pitclear";

type Props = {
  pitClearAir: PitClearAirData | undefined;
  isConnected: boolean;
};

export const PitClearAirWidgetContainer: React.FC<Props> = ({
  pitClearAir,
  isConnected,
}) => {
  const {
    pitClearAir: pitClearVisible,
    widgetsLocked,
    pitClearScale,
  } = useWidgetVisibility();

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

  // respetar toggle de visibilidad
  if (!pitClearVisible) return null;

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
      <PitClearAirWidget data={pitClearAir} />

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
