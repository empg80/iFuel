// src/contexts/useWidgetVisibility.ts
import { useContext } from "react";
import { WidgetVisibilityContext } from "./WidgetVisibilityContext";

export const useWidgetVisibility = () => {
  const ctx = useContext(WidgetVisibilityContext);
  if (!ctx) {
    throw new Error(
      "useWidgetVisibility debe usarse dentro de WidgetVisibilityProvider",
    );
  }
  return ctx;
};
