import React from "react";
import { FuelWidgetContainer } from "./components/FuelWidgetContainer";
import { RelativeWidgetContainer } from "./components/StandingBattleWidgetContainer";
import { YellowFlagWidgetContainer } from "./components/YellowFlagWidgetContainer";
import { PitClearAirWidgetContainer } from "./components/PitClearAirWidgetContainer";
import { WidgetVisibilityProvider } from "./contexts/WidgetVisibilityProvider";
import { useIfuelWebSocket } from "./useIfuelWebSocket";
import { RaceStandingsWidgetContainer } from "./components/RaceStandingsWidgetContainer";
import { useApplyPitBoardLayout } from "./contexts/useApplyPitBoardLayout";

const App: React.FC = () => {
  const { state, isConnected, sendMessage, serverStatus } = useIfuelWebSocket(
    "ws://localhost:7071/ifuel",
  );

  useApplyPitBoardLayout();

  let label: string;

  if (serverStatus === "connected") {
    // WS ok pero aún sin datos de sesión
    label = state ? "SERVER ON" : "WAITING FOR SESSION";
  } else if (serverStatus === "connecting") {
    label = "SERVER CONNECTING";
  } else {
    label = "SERVER OFF";
  }

  return (
    <WidgetVisibilityProvider>
      <div className="app-root">
        <div className={`server-status server-status--${serverStatus}`}>
          {label}
        </div>

        <FuelWidgetContainer
          state={state}
          isConnected={isConnected}
          sendMessage={sendMessage}
        />
        <RelativeWidgetContainer state={state} isConnected={isConnected} />
        <YellowFlagWidgetContainer state={state} isConnected={isConnected} />
        <RaceStandingsWidgetContainer wsUrl="ws://localhost:7071/ifuel" />
        <PitClearAirWidgetContainer
          pitClearAir={state?.pitClearAir}
          isConnected={isConnected}
          lapNumber={state?.lapNumber ?? null}
          earliestPitLap={state?.earliestPitLap ?? null}
        />
      </div>
    </WidgetVisibilityProvider>
  );
};

export default App;
