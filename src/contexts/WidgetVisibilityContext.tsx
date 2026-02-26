import { createContext } from "react";

export type VisibilityState = {
  fuel: boolean;
  standingBattle: boolean;
  yellow: boolean;
  pitClearAir: boolean;
  widgetsLocked: boolean;
  fuelSettingsVisible: boolean;

  fuelScale: number;
  relativeScale: number;
  pitClearScale: number;
  yellowScale: number;
};

export const defaultVisibilityState: VisibilityState = {
  fuel: true,
  standingBattle: true,
  yellow: true,
  pitClearAir: true,
  widgetsLocked: true,
  fuelSettingsVisible: false,

  fuelScale: 1,
  relativeScale: 1,
  pitClearScale: 1,
  yellowScale: 1,
};

export const WidgetVisibilityContext =
  createContext<VisibilityState>(defaultVisibilityState);
