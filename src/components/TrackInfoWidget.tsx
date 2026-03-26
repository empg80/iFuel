// components/TrackInfoWidget.tsx
import React from "react";

type TrackInfoProps = {
  logoUrl?: string | null;
  trackName?: string; // opcional por si llega vacío
  trackLength?: string; // idem
  airTemp: number | null;
  trackTemp: number | null;
  windSpeed: number | null;
  windDirection: string | null;
  rainChance: number | null;
};

export const TrackInfoWidget: React.FC<TrackInfoProps> = ({
  logoUrl,
  trackName = "",
  trackLength = "",
  airTemp,
  trackTemp,
  windSpeed,
  windDirection,
  rainChance,
}) => {
  const formatTemp = (t: number | null) =>
    t == null ? "--°C" : `${t.toFixed(1)}°C`;

  const formatWind = (s: number | null, dir: string | null) => {
    if (s == null && !dir) return "--";
    if (s == null) return dir ?? "--";
    const base = `${s.toFixed(1)} km/h`;
    return dir ? `${base} ${dir}` : base;
  };

  const formatRain = (p: number | null) =>
    p == null ? "--%" : `${Math.round(p)}%`;

  return (
    <div className="replay-track-card">
      <div className="replay-track-header">
        <div className="replay-track-logo-slot">
          {logoUrl ? <img src={logoUrl} alt={trackName} /> : null}
        </div>
        <div className="replay-track-title">
          <span className="replay-track-name">{trackName}</span>
          <span className="replay-track-length">{trackLength}</span>
        </div>
      </div>

      <div className="replay-track-body">
        <div className="replay-track-grid">
          <div className="replay-track-item">
            <div className="replay-track-icon">🌡</div>
            <div className="replay-track-label-block">
              <span className="replay-track-label">AIR</span>
              <span className="replay-track-value">{formatTemp(airTemp)}</span>
            </div>
          </div>

          <div className="replay-track-item">
            <div className="replay-track-icon">🔥</div>
            <div className="replay-track-label-block">
              <span className="replay-track-label">TRACK</span>
              <span className="replay-track-value">
                {formatTemp(trackTemp)}
              </span>
            </div>
          </div>

          <div className="replay-track-item">
            <div className="replay-track-icon">🌬</div>
            <div className="replay-track-label-block">
              <span className="replay-track-label">WIND</span>
              <span className="replay-track-value">
                {formatWind(windSpeed, windDirection)}
              </span>
            </div>
          </div>

          <div className="replay-track-item">
            <div className="replay-track-icon">🌧</div>
            <div className="replay-track-label-block">
              <span className="replay-track-label">RAIN</span>
              <span className="replay-track-value">
                {formatRain(rainChance)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
