import React, { useCallback, useEffect, useRef, useState } from "react";
import { loadWidgetPosition, clampPosition } from "../utils/position";
import { saveJsonToStorage } from "../utils/storage";
import { useOverlayState } from "../contexts/useOverlayState";
import type { PitHelper } from "../types/pitHelper";

type Props = { helper: PitHelper | null | undefined; variant?: "free" | "pitboard" };

/** Calle de boxes: velocidad vs límite, limitador y distancia a tu box. Solo aparece dentro del pit lane. */
export const PitHelperPanel: React.FC<Props> = ({ helper, variant = "free" }) => {
  const overlay = useOverlayState();
  const locked = overlay.widgetsLocked ?? true;
  const free = variant === "free";
  const [pos, setPos] = useState(() => loadWidgetPosition("ifuel-pos-pithelper", { x: 760, y: 14 }));
  const dragging = useRef(false);
  const off = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (!free) return;
    const mv = (e: MouseEvent) => { if (dragging.current) setPos(clampPosition({ x: e.clientX - off.current.x, y: e.clientY - off.current.y })); };
    const up = () => { dragging.current = false; };
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [free]);
  useEffect(() => { if (free) saveJsonToStorage("ifuel-pos-pithelper", pos); }, [pos, free]);
  const down = useCallback((e: React.MouseEvent) => {
    if (!free || locked) return;
    dragging.current = true;
    off.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [free, locked, pos.x, pos.y]);
  const style = free ? { left: pos.x, top: pos.y, transform: "none" } : undefined;
  // Desbloqueado y fuera del pit lane: se muestra un marcador para poder colocarlo
  if (!helper) {
    if (!free || locked) return null;
    return <div className="pit-helper pit-helper--free pit-helper--ghost" style={style} onMouseDown={down}>Calle de boxes (arrastra para mover)</div>;
  }
  const { speedKph, limitKph, limiterOn, boxDistM, status } = helper;
  const dist =
    boxDistM == null ? null : boxDistM > 3 ? `${Math.round(boxDistM)} m` : boxDistM < -3 ? "Box pasado" : "¡AQUÍ!";
  const msg = status === "speeding" ? "REDUCE VELOCIDAD" : status === "no-limiter" ? "LIMITADOR" : "Velocidad OK";
  return (
    <div className={`pit-helper pit-helper--${variant} pit-helper--${status}`} style={style} onMouseDown={down}>
      <div className="pit-helper__msg">{msg}</div>
      <div className="pit-helper__row">
        <div className="pit-helper__speed">
          <b>{Math.round(speedKph)}</b>
          <small>km/h{limitKph ? ` / ${Math.round(limitKph)}` : ""}</small>
        </div>
        <div className={`pit-helper__lim${limiterOn ? " is-on" : ""}`}>LIM {limiterOn ? "ON" : "OFF"}</div>
        {dist && (
          <div className="pit-helper__box">
            <small>Tu box</small>
            <b>{dist}</b>
          </div>
        )}
      </div>
    </div>
  );
};
