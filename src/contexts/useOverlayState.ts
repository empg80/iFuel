// src/contexts/useOverlayState.ts
import { useEffect, useState } from "react";

export function useOverlayState() {
  const [overlayState, setOverlayState] = useState<IfuelOverlayState>({
    layoutMode: "free",
  });

  useEffect(() => {
    const overlay = window.ifuelOverlay;
    if (!overlay?.onOverlayStateChanged) return;

    const unsubscribe = overlay.onOverlayStateChanged((state) => {
      setOverlayState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return overlayState;
}
