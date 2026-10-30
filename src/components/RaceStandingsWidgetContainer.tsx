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
  // En directo "yo" es el coche del jugador (aunque la cámara apunte a otro); en replay, la cámara
  const myCarNumber = state?.isReplayPlaying
    ? String(state?.cameraCarNumber ?? "")
    : String(state?.playerCarNumber ?? state?.cameraCarNumber ?? "");

  const clock = (() => {
    const laps = state?.sessionLapsRemainEx ?? null;
    const t = state?.sessionTimeRemain ?? null;
    if (laps != null && laps > 0 && laps < 10000) {
      return { time: String(laps), cap: laps === 1 ? "LAP LEFT" : "LAPS LEFT", low: laps <= 2 };
    }
    if (t != null && t > 0 && t < 86400 * 7) {
      const h = Math.floor(t / 3600);
      const m = Math.floor((t % 3600) / 60);
      const sec = Math.floor(t % 60);
      const pad = (n: number) => String(n).padStart(2, "0");
      return { time: h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`, cap: "TIME LEFT", low: t < 300 };
    }
    return null;
  })();

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
          clock={clock}
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
