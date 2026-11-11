import React from "react";
import type { FuelSaving } from "../useIfuelWebSocket";

/** Línea de estrategia: litros/vuelta a ahorrar para evitar la parada o ganar una vuelta. */
export const FuelSavingLine: React.FC<{ saving?: FuelSaving | null }> = ({ saving }) => {
  if (!saving || !(saving.savePerLap > 0)) return null;
  const txt =
    saving.mode === "avoid-stop"
      ? `Ahorra ${saving.savePerLap.toFixed(2)} L/v (${(saving.savePct * 100).toFixed(0)}%) y llegas sin parar`
      : `Ahorra ${saving.savePerLap.toFixed(2)} L/v (${(saving.savePct * 100).toFixed(0)}%) y haces ${saving.targetLaps} vueltas`;
  return <div className={`fuel-saving${saving.realistic ? " is-realistic" : ""}`}>⛽ {txt}</div>;
};
