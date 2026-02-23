import React from "react";
import { FuelWidgetContainer } from "./components/FuelWidgetContainer";
import { RelativeWidgetContainer } from "./components/StandingBattleWidgetContainer";

const App: React.FC = () => {
  return (
    <div className="app-root">
      <FuelWidgetContainer />
      <RelativeWidgetContainer />
    </div>
  );
};

export default App;
