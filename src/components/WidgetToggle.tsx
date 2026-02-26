// src/components/WidgetToggle.tsx
import React from "react";
import { useWidgetVisibility } from "../contexts/useWidgetVisibility";

interface Props {
  widget: "fuel" | "standingBattle" | "yellowFlag" | "pitClearAir"; // ← NUEVO
  label?: string;
}

export const WidgetToggle: React.FC<Props> = ({ widget, label }) => {
  const { visibility, toggleWidget } = useWidgetVisibility();

  return (
    <button
      onClick={() => toggleWidget(widget)}
      style={{
        position: "absolute",
        top: -8,
        right: -8,
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: visibility[widget] ? "#4caf50" : "#f44336",
        color: "white",
        border: "none",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        zIndex: 10,
        transition: "all 0.2s ease",
      }}
      title={`Toggle ${label || widget}`}
    >
      {visibility[widget] ? "✓" : "✕"}
    </button>
  );
};
