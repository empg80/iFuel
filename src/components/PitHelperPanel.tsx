import React from "react";
import type { PitHelper } from "../types/pitHelper";

type Props = { helper: PitHelper | null | undefined; variant?: "free" | "pitboard" };

/** Calle de boxes: velocidad vs límite, limitador y distancia a tu box. Solo aparece dentro del pit lane. */
export const PitHelperPanel: React.FC<Props> = ({ helper, variant = "free" }) => {
  if (!helper) return null;
  const { speedKph, limitKph, limiterOn, boxDistM, status } = helper;
  const dist =
    boxDistM == null ? null : boxDistM > 3 ? `${Math.round(boxDistM)} m` : boxDistM < -3 ? "Box pasado" : "¡AQUÍ!";
  const msg = status === "speeding" ? "REDUCE VELOCIDAD" : status === "no-limiter" ? "LIMITADOR" : "Velocidad OK";
  return (
    <div className={`pit-helper pit-helper--${variant} pit-helper--${status}`}>
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
