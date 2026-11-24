// src/components/ReplayOverlayApp.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useIfuelWebSocket } from "../useIfuelWebSocket";
import { paletteVars, resolveSettings } from "../utils/replayStyle";
import { BroadcastCar, BroadcastCircuit, BroadcastTower } from "./ReplayBroadcast";

function readLs(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/**
 * Layout de replay. Los ajustes llegan del menú de bandeja (Electron) o de la URL cuando se usa en OBS:
 * #/replay?design=ribbon&palette=f1&gap=interval&guides=1&phase=10&serie=Nombre
 */
export const ReplayOverlayApp: React.FC = () => {
  const { state, isConnected, raceStandingsRows } = useIfuelWebSocket("ws://127.0.0.1:7071/ifuel");
  const [params] = useSearchParams();
  const [overlayState, setOverlayState] = useState<Parameters<typeof resolveSettings>[0]>(null);

  useEffect(() => {
    const api = window.ifuelOverlay;
    if (!api) return;
    let alive = true;
    api.getState?.().then((s) => alive && setOverlayState(s as never)).catch(() => {});
    const off = api.onOverlayStateChanged((s) => setOverlayState(s as never));
    return () => {
      alive = false;
      off();
    };
  }, []);

  const settings = useMemo(() => resolveSettings(overlayState, params), [overlayState, params]);
  const vars = useMemo(() => paletteVars(settings.palette, settings.custom), [settings.palette, settings.custom]);

  if (!isConnected || !state) return null;

  const seriesName = params.get("serie") ?? readLs("ifuel-replay-series");

  return (
    <div
      className={`replay-root bc-root d-${settings.design}` + (settings.guides ? " bc-guides" : "")}
      style={vars as React.CSSProperties}
    >
      <BroadcastTower
        state={state}
        rows={raceStandingsRows}
        focusCar={state.cameraDriver?.carNumber ?? null}
        seriesName={seriesName}
        phaseSeconds={settings.phaseS}
        design={settings.design}
        gapMode={settings.gapMode}
      />
      <BroadcastCircuit state={state} />
      <BroadcastCar state={state} rows={raceStandingsRows} />
    </div>
  );
};
