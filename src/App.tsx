import React from "react";
import { FuelWidgetContainer } from "./components/FuelWidgetContainer";
import { RelativeWidgetContainer } from "./components/StandingBattleWidgetContainer";
import { YellowFlagWidgetContainer } from "./components/YellowFlagWidgetContainer";
import { PitClearAirWidgetContainer } from "./components/PitClearAirWidgetContainer";
import { WidgetVisibilityProvider } from "./contexts/WidgetVisibilityProvider";
import { useIfuelWebSocket } from "./useIfuelWebSocket";

const App: React.FC = () => {
  const { state, isConnected, sendMessage } = useIfuelWebSocket(
    "ws://localhost:7071/ifuel",
  );

  return (
    <WidgetVisibilityProvider>
      <div className="app-root">
        <FuelWidgetContainer
          state={state}
          isConnected={isConnected}
          sendMessage={sendMessage}
        />
        <RelativeWidgetContainer state={state} isConnected={isConnected} />
        <YellowFlagWidgetContainer state={state} isConnected={isConnected} />
        <PitClearAirWidgetContainer
          pitClearAir={state?.pitClearAir}
          isConnected={isConnected}
        />
      </div>
    </WidgetVisibilityProvider>
  );
};

export default App;
