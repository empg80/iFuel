// src/contexts/useOverlayState.ts
import { useEffect, useState } from "react";

export function useOverlayState() {
  const [overlayState, setOverlayState] = useState<IfuelOverlayState>({
    layoutMode: "free",
  });

  useEffect(() => {
    const overlay = window.ifuelOverlay;
    if (!overlay?.onOverlayStateChanged) return;
    let received = false;
    // estado inicial: sin esto los ajustes (voz del spotter...) tardan en llegar y se usaban los de por defecto
    void (overlay as { getState?: () => Promise<IfuelOverlayState> }).getState?.()
      .then((st) => { if (!received && st) setOverlayState((prev) => ({ ...prev, ...st })); })
      .catch(() => {});

    const unsubscribe = overlay.onOverlayStateChanged((state) => {
      received = true;
      setOverlayState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return overlayState;
}
