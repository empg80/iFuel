// src/components/ReplayOverlayApp.tsx
import React from "react";
import { useIfuelWebSocket } from "../useIfuelWebSocket";
import { BroadcastCar, BroadcastCircuit, BroadcastTower } from "./ReplayBroadcast";

function readLs(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export const ReplayOverlayApp: React.FC = () => {
  const { state, isConnected, raceStandingsRows } = useIfuelWebSocket(
    "ws://127.0.0.1:7071/ifuel",
  );

  if (!isConnected || !state) return null;

  // Nombre de la serie (opcional): localStorage "ifuel-replay-series". Guías de huecos: "ifuel-replay-guides" = "1".
  const seriesName = readLs("ifuel-replay-series");
  const phaseSeconds = Number(readLs("ifuel-replay-phase-s")) || 10;
  const guides = readLs("ifuel-replay-guides") === "1";

  return (
    <div className={"replay-root bc-root" + (guides ? " bc-guides" : "")}>
      <BroadcastTower
        state={state}
        rows={raceStandingsRows}
        focusCar={state.cameraDriver?.carNumber ?? null}
        seriesName={seriesName}
        phaseSeconds={phaseSeconds}
      />
      <BroadcastCircuit state={state} />
      <BroadcastCar state={state} rows={raceStandingsRows} />
    </div>
  );
};
