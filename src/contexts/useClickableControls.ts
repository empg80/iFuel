import { useEffect } from "react";

const CONTROL = "button, input, select, textarea, a, [data-clickable]";

/**
 * Con los widgets bloqueados la ventana del overlay ignora el ratón (click-through) y los botones del propio
 * widget (margen de combustible +/−, etc.) no se podían pulsar. Mientras el ratón esté sobre un control se
 * captura el ratón; al salir se vuelve al click-through.
 */
export function useClickableControls() {
  useEffect(() => {
    const api = window.ifuelOverlay;
    if (!api?.setMouseCapture) return;
    let captured = false;
    const set = (v: boolean) => {
      if (v === captured) return;
      captured = v;
      api.setMouseCapture?.(v);
    };
    const onMove = (e: MouseEvent) => {
      const el = e.target as Element | null;
      set(!!el?.closest?.(CONTROL));
    };
    const onLeave = () => set(false);
    document.addEventListener("mousemove", onMove, true);
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      document.removeEventListener("mousemove", onMove, true);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      set(false);
    };
  }, []);
}
