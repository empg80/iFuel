import React, { useState, useRef, useEffect, useCallback } from "react";
import type { IfuelState } from "../useIfuelWebSocket";
import type { StandingsRow } from "../types/standings";
import { RaceStandingsWidget } from "./RaceStandingsWidget";
import { useOverlayState } from "../contexts/useOverlayState";
import { loadWidgetPosition, clampPosition } from "../utils/position";
import { saveJsonToStorage } from "../utils/storage";

const POS_KEY_STANDINGS = "ifuel-pos-standings";

// Recibe los datos del hook de App (una sola conexión WebSocket y un solo cálculo para toda la ventana)
type Props = {
  state: IfuelState | null;
  raceStandingsRows: StandingsRow[];
  isConnected: boolean;
  variant?: "free" | "pitboard";
};

export const RaceStandingsWidgetContainer: React.FC<Props> = ({
  state,
  raceStandingsRows,
  isConnected,
  variant = "free",
}) => {

  const overlayState = useOverlayState();
  const standingsVisible = overlayState.standingsVisible ?? true;
  const widgetsLocked = overlayState.widgetsLocked ?? true;
  const standingsScale = overlayState.standingsScale ?? 1;

  const [position, setPosition] = useState(() =>
    loadWidgetPosition(POS_KEY_STANDINGS, { x: 440, y: 40 }),
  );

  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const isPitboard = variant === "pitboard";

  useEffect(() => {
    if (isPitboard) return;
    saveJsonToStorage(POS_KEY_STANDINGS, position);
  }, [position, isPitboard]);

  useEffect(() => {
    if (isPitboard) return;

    function handleMouseMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      setPosition(
        clampPosition({
          x: e.clientX - dragOffsetRef.current.x,
          y: e.clientY - dragOffsetRef.current.y,
        }),
      );
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
  }, [isPitboard]);

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

  if (!standingsVisible) return null;

  // antes usabas relativeAhead.carNum
  const myCarNumber =
    state?.cameraCarNumber != null ? String(state.cameraCarNumber) : "";

  const classColorIndexById = state?.classColorIndexById ?? {};

  return (
    <div
      className={
        isPitboard
          ? "standings-widget-container pitboard-full"
          : "standings-widget-container"
      }
      style={
        isPitboard
          ? undefined
          : {
              left: position.x,
              top: position.y,
            }
      }
      onMouseDown={handleMouseDown}
    >
      <div
        style={
          isPitboard
            ? undefined
            : { transform: `scale(${standingsScale ?? 1})` }
        }
      >
        <RaceStandingsWidget
          rows={raceStandingsRows}
          myCarNumber={myCarNumber}
          classColorIndexById={classColorIndexById}
          classNames={state?.classNames}
        />

        <div
          className={`standings-widget-status ${
            isConnected
              ? "standings-widget-status--connected"
              : "standings-widget-status--disconnected"
          }`}
        >
          STANDINGS {isConnected ? "ON" : "OFF"}
        </div>
      </div>
    </div>
  );
};
