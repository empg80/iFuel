import { createContext } from "react";

export type VisibilityState = {
  fuel: boolean;
  standingBattle: boolean;
  yellow: boolean;
  pitClearAir: boolean;
  standings: boolean; // ← NUEVO
  widgetsLocked: boolean;
  fuelSettingsVisible: boolean;

  fuelScale: number;
  relativeScale: number;
  pitClearScale: number;
  yellowScale: number;
  standingsScale: number;
  layoutMode: "free" | "pitboard";
};

export const defaultVisibilityState: VisibilityState = {
  fuel: true,
  standingBattle: true,
  yellow: true,
  pitClearAir: true,
  standings: true, // ← NUEVO (o false si prefieres)
  widgetsLocked: true,
  fuelSettingsVisible: false,

  fuelScale: 1,
  relativeScale: 1,
  pitClearScale: 1,
  yellowScale: 1,
  standingsScale: 1,
  layoutMode: "free",
};

export const WidgetVisibilityContext = createContext<VisibilityState>(
  defaultVisibilityState,
);
