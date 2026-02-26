import React, { useState, useRef, useEffect, useCallback } from "react";
import { RelativeWidget } from "./StandingBattleWidget";
import { useIfuelWebSocket } from "../useIfuelWebSocket";
import { useWidgetVisibility } from "../contexts/useWidgetVisibility";

const WS_URL = "ws://localhost:7071/ifuel";
const POS_KEY_RELATIVE = "ifuel-pos-relative";

export const RelativeWidgetContainer: React.FC = () => {
  const { visibility, widgetsLocked } = useWidgetVisibility();

  const [position, setPosition] = useState(() => {
    try {
      const raw = localStorage.getItem(POS_KEY_RELATIVE);
      if (!raw) return { x: 500, y: 100 };
      const parsed = JSON.parse(raw) as { x: number; y: number };
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        return parsed;
      }
      return { x: 500, y: 100 };
    } catch {
      return { x: 500, y: 100 };
    }
  });

  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const { state, isConnected } = useIfuelWebSocket(WS_URL, {});

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
    try {
      localStorage.setItem(POS_KEY_RELATIVE, JSON.stringify(position));
    } catch (e) {
      console.error("Error guardando posición relative:", e);
    }
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

  if (!visibility.standingBattle) {
    return null;
  }

  return (
    <div
      style={{
        position: "relative",
        left: position.x,
        top: position.y,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* WS indicator */}
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
        <div
          style={{
            background: "#050505",
            color: "#f5f5f5",
            padding: "8px 12px",
            borderRadius: 4,
            boxShadow: "0 0 12px rgba(0,0,0,0.8)",
            fontSize: 12,
          }}
        >
          ESPERANDO DATOS DE IRACING…
        </div>
      )}
    </div>
  );
};
