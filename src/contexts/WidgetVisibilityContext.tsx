// src/contexts/WidgetVisibilityContext.tsx
import { createContext } from "react";

interface WidgetVisibility {
  fuel: boolean;
  standingBattle: boolean;
  yellowFlag: boolean;
  pitClearAir: boolean; // NUEVO
}

export interface WidgetVisibilityContextType {
  visibility: WidgetVisibility;
  toggleWidget: (widget: keyof WidgetVisibility) => void;
}

export const WidgetVisibilityContext =
  createContext<WidgetVisibilityContextType | undefined>(undefined);
