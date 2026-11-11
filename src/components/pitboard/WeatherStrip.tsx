import React from "react";
import type { Weather } from "../../types/weather";

const LABEL: Record<Weather["state"], string> = {
  dry: "Seco", risk: "Riesgo de lluvia", raining: "LLUEVE", drying: "Pista mojada · secándose", wet: "Pista mojada",
};
const ICON: Record<Weather["state"], string> = { dry: "☀", risk: "☁", raining: "🌧", drying: "💧", wet: "💧" };
const SKIES = ["Despejado", "Poco nuboso", "Nuboso", "Cubierto"];
const COMPASS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

export const WeatherStrip: React.FC<{ weather: Weather | null | undefined; rainChance?: number | null; trackTemp?: number | null; airTemp?: number | null }> = ({ weather, rainChance, trackTemp, airTemp }) => {
  if (!weather) return null;
  const wetPct = Math.round(((Math.min(7, Math.max(1, weather.wetness)) - 1) / 6) * 100);
  const wind = weather.windKph != null ? `${Math.round(weather.windKph)} km/h${weather.windDir != null ? " " + COMPASS[Math.round(((weather.windDir * 180) / Math.PI) / 45 + 8) % 8] : ""}` : null;
  return (
    <div className={`pb-panel pb-weather pb-weather--${weather.state}`}>
      <span className="pb-weather__icon">{ICON[weather.state]}</span>
      <div className="pb-weather__main">
        <b>{LABEL[weather.state]}</b>
        <span>{SKIES[Math.min(3, Math.max(0, Math.round(weather.skies)))]}{rainChance ? ` · prob. ${Math.round(rainChance)}%` : ""}</span>
      </div>
      <div className="pb-weather__side">
        <span>Pista mojada {wetPct}%</span>
        <span>{trackTemp != null ? `Pista ${Math.round(trackTemp)}°` : ""}{airTemp != null ? ` · Aire ${Math.round(airTemp)}°` : ""}{wind ? ` · ${wind}` : ""}</span>
      </div>
    </div>
  );
};
