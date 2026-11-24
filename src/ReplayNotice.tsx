// src/ReplayNotice.tsx
// Ventana principal con el layout "Replay / retransmisión": los widgets están en la ventana de replay.
import React from "react";

export const ReplayNotice: React.FC = () => {
  const go = (layoutMode: "free" | "pitboard") =>
    void window.ifuelOverlay?.updateState?.({ layoutMode, widgetsLocked: true });
  return (
    <div className="replay-notice" data-clickable>
      <div className="replay-notice__card">
        <div className="replay-notice__tag">LAYOUT REPLAY / RETRANSMISIÓN ACTIVO</div>
        <p>
          La retransmisión se muestra en su propia ventana, que puedes capturar en OBS
          (menú <b>Replay / retransmisión</b>) o colocar en otro monitor.
        </p>
        <p className="replay-notice__sub">Esta ventana no muestra widgets mientras este layout esté activo.</p>
        <div className="replay-notice__btns">
          <button type="button" onClick={() => go("free")}>Volver al layout libre</button>
          <button type="button" onClick={() => go("pitboard")}>Ir al Pitboard</button>
        </div>
      </div>
    </div>
  );
};
