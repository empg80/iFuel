// src/contexts/useApplyPitBoardLayout.ts
import { useEffect, useRef } from "react";
import { useWidgetVisibility } from "../contexts/useWidgetVisibility";

export function useApplyPitBoardLayout() {
  const { layoutMode } = useWidgetVisibility();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (layoutMode !== "pitboard") {
      appliedRef.current = false;
      return;
    }
    if (appliedRef.current) return;
    appliedRef.current = true;

    const w = window.innerWidth;
    const h = window.innerHeight;

    const marginX = 40;
    const marginY = 40;

    // Anchos / altos aproximados
    const standingsWidth = 480;
    const centerWidth = 400;
    const widgetHeight = 100;

    const colLeft = marginX;
    const colCenter = Math.min(
      w - centerWidth - marginX,
      w * 0.5 - centerWidth / 2,
    );
    const colRight = Math.min(
      w - standingsWidth - marginX,
      w - standingsWidth - marginX,
    );

    const rowTop = marginY;
    const rowMiddle = h * 0.5 - widgetHeight / 2;
    const rowBottom = Math.min(h - widgetHeight - marginY, h * 0.8);

    const fuel = {
      x: colLeft,
      y: Math.min(h - widgetHeight - marginY, h * 0.75),
    };
    const relative = { x: colCenter, y: rowTop };
    const pitClearAir = { x: colCenter, y: rowMiddle };
    const yellow = { x: colCenter, y: rowBottom };
    const standings = { x: colRight, y: rowTop };

    localStorage.setItem("ifuel-pos-fuel", JSON.stringify(fuel));
    localStorage.setItem("ifuel-pos-relative", JSON.stringify(relative));
    localStorage.setItem("ifuel-pos-standings", JSON.stringify(standings));
    localStorage.setItem("ifuel-pos-pitclear", JSON.stringify(pitClearAir));
    localStorage.setItem("ifuel-pos-yellow", JSON.stringify(yellow));
  }, [layoutMode]);
}
