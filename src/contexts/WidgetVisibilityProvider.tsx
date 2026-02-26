// src/contexts/WidgetVisibilityProvider.tsx
import React, { useState } from "react";
import type { ReactNode } from "react";
import {
  WidgetVisibilityContext,
  type WidgetVisibilityContextType,
} from "./WidgetVisibilityContext";

interface WidgetVisibility {
  fuel: boolean;
  standingBattle: boolean;
  yellowFlag: boolean;
  pitClearAir: boolean; // NUEVO
}

export const WidgetVisibilityProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [visibility, setVisibility] = useState<WidgetVisibility>({
    fuel: true,
    standingBattle: true,
    yellowFlag: true,
    pitClearAir: true, // NUEVO
  });

  const toggleWidget: WidgetVisibilityContextType["toggleWidget"] = (
    widget,
  ) => {
    setVisibility((prev) => ({
      ...prev,
      [widget]: !prev[widget],
    }));
  };

  return (
    <WidgetVisibilityContext.Provider value={{ visibility, toggleWidget }}>
      {children}
    </WidgetVisibilityContext.Provider>
  );
};
