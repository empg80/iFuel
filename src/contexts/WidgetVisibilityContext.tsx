// WidgetVisibilityContext.tsx
import React from "react";

export type LayoutMode = "free" | "pitboard" | "replay";

export type VisibilityState = {
  fuel: boolean;
  standingBattle: boolean;
  yellow: boolean;
  pitClearAir: boolean;
  standings: boolean;
  widgetsLocked: boolean;
  fuelSettingsVisible: boolean;
  fuelScale: number;
  relativeScale: number;
  pitClearScale: number;
  yellowScale: number;
  standingsScale: number;
  layoutMode: LayoutMode;
};

export const defaultVisibilityState: VisibilityState = {
  fuel: true,
  standingBattle: true,
  yellow: true,
  pitClearAir: true,
  standings: true,
  widgetsLocked: true,
  fuelSettingsVisible: false,
  fuelScale: 1,
  relativeScale: 1,
  pitClearScale: 1,
  yellowScale: 1,
  standingsScale: 1,
  layoutMode: "free",
};

export const WidgetVisibilityContext = React.createContext<VisibilityState>(
  defaultVisibilityState,
);
