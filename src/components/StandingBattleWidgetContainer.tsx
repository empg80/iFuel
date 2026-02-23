import React, { useState, useRef, useEffect, useCallback } from "react";
import { RelativeWidget } from "./StandingBattleWidget";
import { useIfuelWebSocket } from "../useIfuelWebSocket";

const WS_URL = "ws://localhost:7071/ifuel";

export const RelativeWidgetContainer: React.FC = () => {
  const [position, setPosition] = useState({ x: 500, y: 100 });
  const [locked, setLocked] = useState(false);
  const [visible, setVisible] = useState(true);

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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (locked) return;
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("input")) return;
      draggingRef.current = true;
      dragOffsetRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [locked, position.x, position.y],
  );

  if (!visible) return null;

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
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* WS indicator + controls */}
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

      <div style={{ position: "absolute", top: -20, right: 0 }}>
        <button
          onClick={() => setLocked((v) => !v)}
          style={{
            marginRight: 4,
            padding: "2px 6px",
            fontSize: 10,
            borderRadius: 4,
            cursor: "pointer",
            background: locked ? "#c33" : "#333",
            color: "#fff",
            border: "1px solid #666",
          }}
        >
          {locked ? "🔒" : "🔓"}
        </button>

        <button
          onClick={() => setVisible(false)}
          style={{
            padding: "2px 6px",
            fontSize: 10,
            borderRadius: 4,
          }}
        >
          ✕
        </button>
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
