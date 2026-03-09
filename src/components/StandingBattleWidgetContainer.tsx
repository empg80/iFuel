import React, { useState, useRef, useEffect, useCallback } from "react";
import { RelativeWidget } from "./StandingBattleWidget";
// import { useWidgetVisibility } from "../contexts/useWidgetVisibility";
import { loadWidgetPosition } from "../utils/position";
import { saveJsonToStorage } from "../utils/storage";
import type { IfuelState } from "../useIfuelWebSocket";
import { useOverlayState } from "../contexts/useOverlayState"; // NUEVO

const POS_KEY_RELATIVE = "ifuel-pos-relative";

type Props = {
  state: IfuelState | null;
  isConnected: boolean;
};

export const RelativeWidgetContainer: React.FC<Props> = ({
  state,
  isConnected,
}) => {
  const overlayState = useOverlayState(); // NUEVO

  const standingBattleVisible = overlayState.standingBattleVisible ?? true;
  const widgetsLocked = overlayState.widgetsLocked ?? true;
  const relativeScale = overlayState.relativeScale ?? 1;

  // const { standingBattle, widgetsLocked, relativeScale } =
  //   useWidgetVisibility();

  const [position, setPosition] = useState(() =>
    loadWidgetPosition(POS_KEY_RELATIVE, { x: 500, y: 100 }),
  );

  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    saveJsonToStorage(POS_KEY_RELATIVE, position);
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

  if (!standingBattleVisible) return null;

  const ahead = state?.relativeAhead ?? null;
  const behind = state?.relativeBehind ?? null;
  const myPos = state?.relativeMyPosition ?? null;
  const onTrackAhead = state?.onTrackAhead ?? null;
  const onTrackBehind = state?.onTrackBehind ?? null;
  const classColorIndexById = state?.classColorIndexById;

  const hasRelative =
    myPos != null ||
    ahead != null ||
    behind != null ||
    onTrackAhead != null ||
    onTrackBehind != null;

  return (
    <div
      className="relative-widget-container"
      style={{
        left: position.x,
        top: position.y,
        transform: `scale(${relativeScale ?? 1})`,
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`relative-widget-status ${
          isConnected
            ? "relative-widget-status--connected"
            : "relative-widget-status--disconnected"
        }`}
      >
        STND {isConnected ? "ON" : "OFF"}
      </div>

      {state && hasRelative ? (
        <RelativeWidget
          ahead={ahead}
          behind={behind}
          myPosition={myPos}
          myLastLap={state.lapTime}
          myBestLap={state.myBestLapTime ?? null}
          onTrackAhead={onTrackAhead}
          onTrackBehind={onTrackBehind}
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
