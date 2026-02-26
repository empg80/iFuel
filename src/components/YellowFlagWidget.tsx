// src/components/YellowFlagWidget.tsx
import React, { useMemo } from "react";

type YellowWarning = {
  active: boolean;
  distanceMeters: number | null;
  timeSeconds: number | null;
  carNum: number | string | null;
  classId: number | null;
  classPosition: number | null;
  type?: "incident" | "debris" | null;
} | null;

type Props = {
  warning: YellowWarning;
  classColorIndexById?: Record<number, number>;
};

const CLASS_COLORS = [
  { bg: "#ffd000", text: "#000000" },
  { bg: "#ff8800", text: "#000000" },
  { bg: "#ff4444", text: "#ffffff" },
  { bg: "#00c000", text: "#000000" },
  { bg: "#0066ff", text: "#ffffff" },
  { bg: "#aa00ff", text: "#ffffff" },
];

export const YellowFlagWidget: React.FC<Props> = ({
  warning,
  classColorIndexById,
}) => {
  const w = warning;

  const isActiveYellow = !!w && w.active;
  const isDebris = isActiveYellow && w.type === "debris";

  const classStyle = useMemo(() => {
    if (!isActiveYellow || !w || !w.classId || !classColorIndexById) {
      // badge en verde cuando no hay amarilla
      return { bg: "#2e7d32", text: "#ffffff" };
    }
    const idx = classColorIndexById[w.classId] ?? 0;
    const color = CLASS_COLORS[idx % CLASS_COLORS.length];
    return color;
  }, [isActiveYellow, w, classColorIndexById]);

  const distanceStr =
    isActiveYellow && w && w.distanceMeters != null
      ? `${Math.round(w.distanceMeters)} m`
      : "-- m";

  const timeStr =
    isActiveYellow && w && w.timeSeconds != null
      ? `${w.timeSeconds.toFixed(1)} s`
      : "--.- s";

  const title = isActiveYellow
    ? isDebris
      ? "DEBRIS / SURFACE"
      : "YELLOW FLAG"
    : "GREEN FLAG";

  const statusLine = isActiveYellow
    ? `Ahead: ${distanceStr} / ${timeStr}`
    : "Track clear";

  const iconBackground = !isActiveYellow
    ? "#00c853" // verde
    : isDebris
    ? "repeating-linear-gradient(45deg, #ffd000 0 6px, #ffd000 6px 10px, #b00000 10px 14px)"
    : "#ffd000";

  const iconText = isActiveYellow ? "⚑" : "✓";

  return (
    <div
      className="fuel-widget yellow-flag-widget"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontSize: 12,
      }}
    >
      {/* Icono / bloque */}
      <div
        style={{
          width: 32,
          height: 24,
          borderRadius: 6,
          background: iconBackground,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 4,
          border: "1px solid rgba(0,0,0,0.35)",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: "#000" }}>
          {iconText}
        </span>
      </div>

      {/* Texto principal */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div className="label">{title}</div>
        <div className="value" style={{ fontSize: 13, fontWeight: 500 }}>
          {statusLine}
        </div>

        {isActiveYellow && w && (
          <div style={{ fontSize: 11, marginTop: 2 }}>
            Incident car:{" "}
            {w.classPosition != null ? `P${w.classPosition} ` : ""}
            {w.carNum != null ? `#${w.carNum}` : "N/A"}
          </div>
        )}
      </div>

      {/* Badge de clase: solo si hay amarilla */}
      {isActiveYellow && w && (
        <div
          style={{
            marginLeft: 8,
            width: 28,
            height: 20,
            borderRadius: 4,
            background: classStyle.bg,
            color: classStyle.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {w.classPosition != null ? `P${w.classPosition}` : "P?"}
        </div>
      )}
    </div>
  );
};

