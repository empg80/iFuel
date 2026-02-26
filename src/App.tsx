import React from "react";
import { FuelWidgetContainer } from "./components/FuelWidgetContainer";
import { RelativeWidgetContainer } from "./components/StandingBattleWidgetContainer";
import { YellowFlagWidgetContainer } from "./components/YellowFlagWidgetContainer";
import { WidgetVisibilityProvider } from "./contexts/WidgetVisibilityProvider";
import { PitClearAirWidgetContainer } from "./components/PitClearAirWidgetContainer";


const App: React.FC = () => {
  return (
    <WidgetVisibilityProvider>
      <div className="app-root">
        <FuelWidgetContainer />
        <RelativeWidgetContainer />
        <YellowFlagWidgetContainer />
        <PitClearAirWidgetContainer />
      </div>
    </WidgetVisibilityProvider>
  );
};

export default App;
