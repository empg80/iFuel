import React from "react";
import type { IfuelState } from "../useIfuelWebSocket";
import { useDraggableWidget } from "../hooks/useDraggableWidget";

type Props = { state: IfuelState | null; variant?: "free" | "pitboard" };

/** M1: aviso de clase más rápida que te alcanza por detrás (color de su clase). */
export const FastTrafficBanner: React.FC<Props> = ({ state, variant = "free" }) => {
  const t = state?.fastTraffic;
  const { style, onMouseDown, ghost } = useDraggableWidget("ifuel-pos-fasttraffic", { x: 760, y: 70 }, variant === "free");
  if (!t) {
    if (!ghost) return null;
    return <div className="fast-traffic fast-traffic--free fast-traffic--ghost" style={style} onMouseDown={onMouseDown}>Tráfico rápido (arrastra para mover)</div>;
  }
  if (variant === "free" && (t.lapping || t.blueFlag)) return null; // la bandera azul sale en el widget de banderas
  const idx = (state?.classColorIndexById?.[t.classId ?? -1] ?? 0) % 6;
  const name = t.classId != null ? state?.classNames?.[t.classId] : null;
  const secs = Math.max(1, Math.round(t.catchInSeconds));
  const blue = !!(t.lapping || t.blueFlag);
  return (
    <div className={`fast-traffic fast-traffic--${variant}`} onMouseDown={onMouseDown} style={{ ...style, borderColor: blue ? "#3b82f6" : `var(--class-${idx})` }}>
      <span className="fast-traffic__dot" style={{ background: blue ? "#3b82f6" : `var(--class-${idx})` }} />
      <span className="fast-traffic__label">{blue ? "BANDERA AZUL" : name ? name.toUpperCase() : "CLASE RÁPIDA"}{t.carNum != null ? ` #${t.carNum}` : ""}</span>
      <span className="fast-traffic__time">{t.blueFlag && t.carNum == null ? "déjale pasar" : `te alcanza en ${secs} s${t.count > 1 ? ` (+${t.count - 1})` : ""}`}</span>
    </div>
  );
};
