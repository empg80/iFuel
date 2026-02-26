// src/contexts/WidgetVisibilityContext.tsx
import { createContext } from "react";

export type VisibilityState = {
  fuel: boolean;
  standingBattle: boolean;
  yellow: boolean;
  pitClearAir: boolean;
  widgetsLocked: boolean;
};

export const defaultVisibilityState: VisibilityState = {
  fuel: true,
  standingBattle: true,
  yellow: true,
  pitClearAir: true,
  widgetsLocked: true,
};

export const WidgetVisibilityContext =
  createContext<VisibilityState>(defaultVisibilityState);
