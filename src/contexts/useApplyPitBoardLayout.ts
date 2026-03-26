// src/contexts/useApplyPitBoardLayout.ts
import { useEffect } from "react";
import { useWidgetVisibility } from "../contexts/useWidgetVisibility";

export function useApplyPitBoardLayout() {
  const { layoutMode } = useWidgetVisibility();

  useEffect(() => {
    // Nuevo Pitboard usa grid fijo, no tocamos posiciones del layout libre.
    if (layoutMode !== "pitboard") return;
  }, [layoutMode]);
}
