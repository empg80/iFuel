// components/TrackInfoWidgetContainer.tsx
import React from "react";
import { TrackInfoWidget } from "./TrackInfoWidget";
import type { IfuelState } from "../useIfuelWebSocket";

type Props = {
  state: IfuelState | null;
};

export const TrackInfoWidgetContainer: React.FC<Props> = ({ state }) => {
  if (!state) return null;

  const trackName = state.trackName ?? "";
  const trackLength = state.trackLength ?? "";
  const windSpeed = state.windSpeed ?? null;
  const windDirection = state.windDirection ?? null;
  const rainChance = state.rainChance ?? null;

  return (
    <TrackInfoWidget
      logoUrl={null}
      trackName={trackName}
      trackLength={trackLength}
      airTemp={state.airTemp}
      trackTemp={state.trackTemp}
      windSpeed={windSpeed}
      windDirection={windDirection}
      rainChance={rainChance}
    />
  );
};
