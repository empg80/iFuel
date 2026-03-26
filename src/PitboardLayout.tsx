// src/PitboardLayout.tsx
import React from "react";
import type { IfuelState } from "./useIfuelWebSocket";
import { YellowFlagWidgetContainer } from "./components/YellowFlagWidgetContainer";
import { RaceStandingsWidgetContainer } from "./components/RaceStandingsWidgetContainer";
import { RelativeWidgetContainer } from "./components/StandingBattleWidgetContainer";
import { PitClearAirWidgetContainer } from "./components/PitClearAirWidgetContainer";
import { FuelWidgetContainer } from "./components/FuelWidgetContainer";

type PitboardLayoutProps = {
  state: IfuelState | null;
  isConnected: boolean;
  sendMessage: (msg: unknown) => void;
};

export const PitboardLayout: React.FC<PitboardLayoutProps> = ({
  state,
  isConnected,
  sendMessage,
}) => (
  <div className="pitboard-layout">
    <div className="pitboard-yellow pitboard-flagbar pitboard-widget">
      <YellowFlagWidgetContainer
        variant="pitboard"
        state={state}
        isConnected={isConnected}
      />
    </div>
    <div className="pitboard-standings pitboard-widget">
      <RaceStandingsWidgetContainer
        variant="pitboard"
        wsUrl="ws://127.0.0.1:7071/ifuel"
      />
    </div>
    <div className="pitboard-relative pitboard-widget">
      <RelativeWidgetContainer
        variant="pitboard"
        state={state}
        isConnected={isConnected}
      />
    </div>
    <div className="pitboard-pit pitboard-widget">
      <PitClearAirWidgetContainer
        variant="pitboard"
        pitClearAir={state?.pitClearAir ?? null}
        isConnected={isConnected}
        lapNumber={state?.lapNumber ?? null}
        earliestPitLap={state?.earliestPitLap ?? null}
      />
    </div>
    <div className="pitboard-fuel pitboard-widget">
      <FuelWidgetContainer
        variant="pitboard"
        state={state}
        isConnected={isConnected}
        sendMessage={sendMessage}
      />
    </div>
  </div>
);
