import React, { useEffect, useState } from "react";
import {
  WidgetVisibilityContext,
  defaultVisibilityState,
  type VisibilityState,
} from "./WidgetVisibilityContext";

export const WidgetVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<VisibilityState>(defaultVisibilityState);

  useEffect(() => {
    const api = window.ifuelOverlay;
    if (!api || typeof api.onOverlayStateChanged !== "function") return;

    api.onOverlayStateChanged((overlayState) => {
      setState({
        fuel: overlayState.fuelVisible ?? true,
        standingBattle: overlayState.standingBattleVisible ?? true,
        yellow: overlayState.yellowVisible ?? true,
        pitClearAir: overlayState.pitClearAirVisible ?? true,
        widgetsLocked: overlayState.widgetsLocked ?? true,
      });
    });
  }, []);

  return (
    <WidgetVisibilityContext.Provider value={state}>
      {children}
    </WidgetVisibilityContext.Provider>
  );
};

