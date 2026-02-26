// src/components/YellowFlagWidgetContainer.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useIfuelWebSocket } from "../useIfuelWebSocket";
import { YellowFlagWidget } from "./YellowFlagWidget";
import { useWidgetVisibility } from "../contexts/useWidgetVisibility";
import { WidgetToggle } from "./WidgetToggle";

const WS_URL = "ws://localhost:7071/ifuel";
const POS_KEY_YELLOW = "ifuel-pos-yellow";

export const YellowFlagWidgetContainer: React.FC = () => {
  const { visibility } = useWidgetVisibility();
  const { state, isConnected } = useIfuelWebSocket(WS_URL);

  // posición y lock, igual que los otros (persistente)
  const [position, setPosition] = useState(() => {
    try {
      const raw = localStorage.getItem(POS_KEY_YELLOW);
      if (!raw) return { x: 900, y: 100 };
      const parsed = JSON.parse(raw) as { x: number; y: number };
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        return parsed;
      }
      return { x: 900, y: 100 };
    } catch {
      return { x: 900, y: 100 };
    }
  });
  const [locked, setLocked] = useState(false);
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // drag global
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

  // persistir posición
  useEffect(() => {
    try {
      localStorage.setItem(POS_KEY_YELLOW, JSON.stringify(position));
    } catch (e) {
      console.error("Error guardando posición yellow:", e);
    }
  }, [position]);

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

  // MODO OCULTO: mini barra con toggle para poder reactivarlo
  if (!visibility.yellowFlag) {
    return (
      <div
        style={{
          position: "absolute",
          left: position.x,
          top: position.y,
        }}
        onMouseDown={handleMouseDown}
      >
        <WidgetToggle widget="yellowFlag" label="Yellow Flag" />
        <div
          style={{
            background: "#050505",
            color: "#f5f5f5",
            padding: "4px 8px",
            borderRadius: 4,
            boxShadow: "0 0 12px rgba(0,0,0,0.8)",
            fontSize: 11,
            minWidth: 100,
          }}
        >
          YELLOW HIDDEN
        </div>
      </div>
    );
  }

  // SIN DATOS DE WS
  if (!isConnected || !state) {
    return (
      <div
        style={{
          position: "absolute",
          left: position.x,
          top: position.y,
        }}
        onMouseDown={handleMouseDown}
      >
        <WidgetToggle widget="yellowFlag" label="Yellow Flag" />

        {/* Indicador WS + lock */}
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
          YELL {isConnected ? "ON" : "OFF"}
        </div>

        <div style={{ position: "absolute", top: -20, right: 0 }}>
          <button
            onClick={() => setLocked((v) => !v)}
            style={{
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
        </div>

        <div
          style={{
            background: "#050505",
            color: "#f5f5f5",
            padding: "4px 8px",
            borderRadius: 4,
            boxShadow: "0 0 12px rgba(0,0,0,0.8)",
            fontSize: 10,
          }}
        >
          ESPERANDO DATOS DE IRACING…
        </div>
      </div>
    );
  }

  const warning = state.yellowWarning ?? null;
  const classColorIndexById = state.classColorIndexById;

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
      }}
      onMouseDown={handleMouseDown}
    >
      <WidgetToggle widget="yellowFlag" label="Yellow Flag" />

      {/* Indicador WS + lock */}
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
        YELL {isConnected ? "ON" : "OFF"}
      </div>

      <div style={{ position: "absolute", top: -20, right: 0 }}>
        <button
          onClick={() => setLocked((v) => !v)}
          style={{
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
      </div>

      <YellowFlagWidget
        warning={warning ?? null}
        classColorIndexById={classColorIndexById}
      />
    </div>
  );
};
