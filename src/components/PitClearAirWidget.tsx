import type { PitClearAirData } from "../types/pit";

type PitClearAirWidgetProps = {
  data: PitClearAirData;
};

export const PitClearAirWidget = ({ data }: PitClearAirWidgetProps) => {
  if (!data || !data.suggestedLap) {
    return (
      <div className="fuel-widget">
        <div className="label">PIT CLEAR AIR</div>
        <div className="value">Waiting for window…</div>
      </div>
    );
  }

  return (
    <div className="fuel-widget pit-clear-air-widget">
      <div className="label">PIT CLEAR AIR</div>
      <div className="value fuel-main">Lap {data.suggestedLap}</div>

      <div className="pit-clear-air-widget__options">
        {data.options.map((o) => (
          <div key={o.lap} className="value pit-clear-air-widget__option">
            Lap {o.lap}: {o.trafficScore} cars ±3s
          </div>
        ))}
      </div>
    </div>
  );
};
