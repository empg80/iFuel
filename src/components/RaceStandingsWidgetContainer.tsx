import React, { useState, useRef, useEffect, useCallback } from "react";
import { useIfuelWebSocket } from "../useIfuelWebSocket";
// import { useWidgetVisibility } from "../contexts/useWidgetVisibility";
import { RaceStandingsWidget } from "./RaceStandingsWidget";
import { useOverlayState } from "../contexts/useOverlayState"; // NUEVO

const POS_KEY_STANDINGS = "ifuel-pos-standings";

type Props = {
  wsUrl: string;
};

export const RaceStandingsWidgetContainer: React.FC<Props> = ({ wsUrl }) => {
  const { state, raceStandingsRows, isConnected } = useIfuelWebSocket(wsUrl);

  const overlayState = useOverlayState(); // NUEVO
  const standingsVisible = overlayState.standingsVisible ?? true;
  const widgetsLocked = overlayState.widgetsLocked ?? true;
  const standingsScale = overlayState.standingsScale ?? 1;

  // const {
  //   standings: standingsVisible,
  //   widgetsLocked,
  //   standingsScale,
  // } = useWidgetVisibility();

  const [position, setPosition] = useState(() => {
    const stored = localStorage.getItem(POS_KEY_STANDINGS);
    if (stored) {
      try {
        return JSON.parse(stored) as { x: number; y: number };
      } catch {
        // fall through
      }
    }
    return { x: 500, y: 120 };
  });

  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    localStorage.setItem(POS_KEY_STANDINGS, JSON.stringify(position));
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

  // ocultar según visibilidad
  if (!standingsVisible) return null;

  const myCarNumber =
    state?.relativeAhead?.carNum != null
      ? String(state.relativeAhead.carNum)
      : "";

  const classColorIndexById = state?.classColorIndexById ?? {};

  return (
    <div
      className="pitclear-widget-container"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      <div style={{ transform: `scale(${standingsScale ?? 1})` }}>
        <RaceStandingsWidget
          rows={raceStandingsRows}
          myCarNumber={myCarNumber}
          classColorIndexById={classColorIndexById}
        />

        <div
          className={`pitclear-widget-status ${
            isConnected
              ? "pitclear-widget-status--connected"
              : "pitclear-widget-status--disconnected"
          }`}
        >
          STANDINGS {isConnected ? "ON" : "OFF"}
        </div>
      </div>
    </div>
  );
};
