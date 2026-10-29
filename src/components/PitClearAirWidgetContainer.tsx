import React, { useState, useRef, useEffect, useCallback } from "react";
import { PitClearAirWidget } from "./PitClearAirWidget";
import { loadWidgetPosition, clampPosition } from "../utils/position";
import { saveJsonToStorage } from "../utils/storage";
import type { PitClearAirData } from "../types/pit";
import { useOverlayState } from "../contexts/useOverlayState";

const POS_KEY_PITCLEAR = "ifuel-pos-pitclear";

type Props = {
  pitClearAir: PitClearAirData | undefined;
  isConnected: boolean;
  lapNumber: number | null | undefined;
  earliestPitLap: number | null | undefined;
  variant?: "free" | "pitboard";
};

export const PitClearAirWidgetContainer: React.FC<Props> = ({
  pitClearAir,
  isConnected,
  lapNumber,
  earliestPitLap,
  variant = "free",
}) => {
  const overlayState = useOverlayState();

  const pitClearVisible = overlayState.pitClearAirVisible ?? true;
  const widgetsLocked = overlayState.widgetsLocked ?? true;
  const pitClearScale = overlayState.pitClearScale ?? 1;

  const [position, setPosition] = useState(() =>
    loadWidgetPosition(POS_KEY_PITCLEAR, { x: 900, y: 40 }),
  );

  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const isPitboard = variant === "pitboard";

  useEffect(() => {
    if (isPitboard) return;
    saveJsonToStorage(POS_KEY_PITCLEAR, position);
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

  if (!pitClearVisible) return null;

  // La ventana la calcula el servidor con el combustible real; si aún no hay datos, el rango estimado antiguo
  let pitWindowStartLap: number | null = pitClearAir?.windowStartLap ?? null;
  let pitWindowEndLap: number | null = pitClearAir?.windowEndLap ?? null;

  if (pitWindowStartLap == null && earliestPitLap && earliestPitLap > 0) {
    const centerLap = Math.round(earliestPitLap);
    pitWindowStartLap = Math.max(1, centerLap - 5);
    pitWindowEndLap = centerLap + 5;
  }

  return (
    <div
      className={
        isPitboard
          ? "pitclear-widget-container pitboard-full"
          : "pitclear-widget-container"
      }
      style={
        isPitboard
          ? undefined
          : {
              left: position.x,
              top: position.y,
              transform: `scale(${pitClearScale ?? 1})`,
            }
      }
      onMouseDown={handleMouseDown}
    >
      <PitClearAirWidget
        data={pitClearAir}
        lapNumber={lapNumber ?? null}
        pitWindowStartLap={pitWindowStartLap}
        pitWindowEndLap={pitWindowEndLap}
      />

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
