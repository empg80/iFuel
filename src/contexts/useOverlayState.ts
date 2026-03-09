// src/contexts/useOverlayState.ts
import { useEffect, useState } from "react";

export function useOverlayState() {
  const [overlayState, setOverlayState] = useState<IfuelOverlayState>({});

  useEffect(() => {
    if (!window.ifuelOverlay) return;

    const unsubscribe = window.ifuelOverlay.onOverlayStateChanged((state) => {
      setOverlayState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return overlayState;
}
