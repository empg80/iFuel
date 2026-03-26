// src/components/ReplayOverlayApp.tsx
import React from "react";
import { useIfuelWebSocket } from "../useIfuelWebSocket";
import { ReplayTowerWidget } from "./ReplayTowerWidget";
import { DriverFocusWidgetContainer } from "./DriverFocusWidgetContainer";
import { TrackInfoWidgetContainer } from "./TrackInfoWidgetContainer";

export const ReplayOverlayApp: React.FC = () => {
  const { state, isConnected, raceStandingsRows } = useIfuelWebSocket(
    "ws://127.0.0.1:7071/ifuel",
  );

  if (!isConnected || !state) return null;

  const cameraDriver = state.cameraDriver ?? null;

  return (
    <div className="replay-root">
      <TrackInfoWidgetContainer state={state} />

      <ReplayTowerWidget
        state={state}
        rows={raceStandingsRows}
        seriesName="iFuel Replay"
      />
      <DriverFocusWidgetContainer
        rows={raceStandingsRows}
        cameraDriver={cameraDriver}
      />
    </div>
  );
};
