import React from "react";

type PitClearAirOption = {
  lap: number;
  trafficScore: number;
};

export type PitClearAirData = {
  suggestedLap: number | null;
  options: PitClearAirOption[];
} | null;

export const PitClearAirWidget: React.FC<{ data: PitClearAirData }> = ({ data }) => {
  if (!data || !data.suggestedLap) {
    return (
      <div className="fuel-widget">
        <div className="label">PIT CLEAR AIR</div>
        <div className="value">Waiting for window…</div>
      </div>
    );
  }

  return (
    <div className="fuel-widget">
      <div className="label">PIT CLEAR AIR</div>
      <div className="value fuel-main">Lap {data.suggestedLap}</div>

      <div style={{ marginTop: 6 }}>
        {data.options.map((o) => (
          <div key={o.lap} className="value" style={{ fontSize: 12, fontWeight: 400 }}>
            Lap {o.lap}: {o.trafficScore} cars ±3s
          </div>
        ))}
      </div>
    </div>
  );
};
