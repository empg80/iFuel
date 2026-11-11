import React from "react";
import type { PitboardAlert } from "../../utils/pitboardAlert";
import type { Weather } from "../../types/weather";

const W_LABEL: Record<Weather["state"], string> = { dry: "Seco", risk: "Riesgo de lluvia", raining: "Lluvia", drying: "Secándose", wet: "Mojada" };
const W_ICON: Record<Weather["state"], string> = { dry: "☀", risk: "☁", raining: "🌧", drying: "💧", wet: "💧" };

function flagLabel(flags: number | undefined): { txt: string; cls: string } {
  const f = flags ?? 0;
  if (f & 0x1) return { txt: "Cuadros", cls: "" };
  if (f & 0x10) return { txt: "Roja", cls: "pb-bad" };
  if (f & (0x8 | 0x4000 | 0x8000)) return { txt: "Amarilla", cls: "pb-warn" };
  if (f & 0x2) return { txt: "Blanca", cls: "" };
  return { txt: "Verde", cls: "pb-good" };
}

type Props = {
  alert: PitboardAlert;
  weather?: Weather | null;
  rainChance?: number | null;
  trackTemp?: number | null;
  airTemp?: number | null;
  sessionFlags?: number;
};

export const AlertStrip: React.FC<Props> = ({ alert, weather, rainChance, trackTemp, airTemp, sessionFlags }) => {
  const flag = flagLabel(sessionFlags);
  return (
    <div className={`pb-alert pb-alert--${alert?.tone ?? "idle"}`}>
      <span className="pb-alert__tag">{alert?.tag ?? "OK"}</span>
      <span className="pb-alert__msg">{alert?.msg ?? "Sin avisos"}</span>
      <span className="pb-alert__sp" />
      {weather && (
        <span className="pb-chip">{W_ICON[weather.state]} <b>{W_LABEL[weather.state]}</b>{rainChance ? ` ${Math.round(rainChance)}%` : ""}</span>
      )}
      <span className="pb-chip">🏁 <b className={flag.cls}>{flag.txt}</b></span>
      {(trackTemp != null || airTemp != null) && (
        <span className="pb-chip">Pista <b>{trackTemp != null ? `${Math.round(trackTemp)}°` : "–"}</b> · Aire <b>{airTemp != null ? `${Math.round(airTemp)}°` : "–"}</b></span>
      )}
    </div>
  );
};
