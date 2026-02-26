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

    api.onOverlayStateChanged((overlayState: IfuelOverlayState) => {
  setState((prev) => ({
    ...prev,
    fuel: overlayState.fuelVisible ?? prev.fuel,
    standingBattle: overlayState.standingBattleVisible ?? prev.standingBattle,
    yellow: overlayState.yellowVisible ?? prev.yellow,
    pitClearAir: overlayState.pitClearAirVisible ?? prev.pitClearAir,
    widgetsLocked: overlayState.widgetsLocked ?? prev.widgetsLocked,
    fuelSettingsVisible:
      overlayState.fuelSettingsVisible ?? prev.fuelSettingsVisible,
    fuelScale: overlayState.fuelScale ?? prev.fuelScale,
    relativeScale: overlayState.relativeScale ?? prev.relativeScale,
    pitClearScale: overlayState.pitClearScale ?? prev.pitClearScale,
    yellowScale: overlayState.yellowScale ?? prev.yellowScale,
  }));
});

  }, []);

  return (
    <WidgetVisibilityContext.Provider value={state}>
      {children}
    </WidgetVisibilityContext.Provider>
  );
};
