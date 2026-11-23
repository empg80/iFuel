import React from "react";
import { useDraggableWidget } from "../hooks/useDraggableWidget";
import type { PitHelper } from "../types/pitHelper";

type Props = { helper: PitHelper | null | undefined; variant?: "free" | "pitboard" };

/** Calle de boxes: velocidad vs límite, limitador y distancia a tu box. Solo aparece dentro del pit lane. */
export const PitHelperPanel: React.FC<Props> = ({ helper, variant = "free" }) => {
  const free = variant === "free";
  const { style, onMouseDown: down, ghost } = useDraggableWidget("ifuel-pos-pithelper", { x: 760, y: 14 }, free);
  // Desbloqueado y fuera del pit lane: se muestra un marcador para poder colocarlo
  if (!helper) {
    if (!ghost) return null;
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
