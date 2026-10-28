// src/FreeLayout.tsx
import React from "react";
import type { IfuelState } from "./useIfuelWebSocket";
import type { StandingsRow } from "./types/standings";
import { useOverlayState } from "./contexts/useOverlayState";
import { FuelWidgetContainer } from "./components/FuelWidgetContainer";
import { RelativeWidgetContainer } from "./components/StandingBattleWidgetContainer";
import { YellowFlagWidgetContainer } from "./components/YellowFlagWidgetContainer";
import { PitClearAirWidgetContainer } from "./components/PitClearAirWidgetContainer";
import { RaceStandingsWidgetContainer } from "./components/RaceStandingsWidgetContainer";

type ServerStatus = "connected" | "connecting" | "disconnected";

type FreeLayoutProps = {
  state: IfuelState | null;
  raceStandingsRows: StandingsRow[];
  isConnected: boolean;
  sendMessage: (msg: unknown) => void;
  serverStatus: ServerStatus;
  layoutMode?: "free" | "pitboard" | "replay";
};

export const FreeLayout: React.FC<FreeLayoutProps> = ({
  state,
  raceStandingsRows,
  isConnected,
  sendMessage,
  serverStatus,
  layoutMode,
}) => {
  const { overlayActive, widgetsLocked } = useOverlayState();
  const editingOverlay = !!overlayActive && !widgetsLocked;

  let label: string;

  if (serverStatus === "connected") {
    label = state ? "SERVER ON" : "WAITING FOR SESSION";
  } else if (serverStatus === "connecting") {
    label = "SERVER CONNECTING";
  } else {
    label = "SERVER OFF";
  }

  return (
    <div className="app-root app-root--free">
      {editingOverlay && (
        <>
          <div className="edit-mode-frame" />
          <div className="edit-mode-banner">
            EDIT MODE · drag the widgets · Ctrl+Shift+L to lock (click-through)
          </div>
        </>
      )}
      <div className={`server-status server-status--${serverStatus}`}>
        {label}
      </div>

      <FuelWidgetContainer
        state={state}
        isConnected={isConnected}
        sendMessage={sendMessage}
      />
      <RelativeWidgetContainer state={state} isConnected={isConnected} />
      <YellowFlagWidgetContainer state={state} isConnected={isConnected} />

      {layoutMode !== "replay" && (
        <RaceStandingsWidgetContainer
          state={state}
          raceStandingsRows={raceStandingsRows}
          isConnected={isConnected}
        />
      )}

      <PitClearAirWidgetContainer
        pitClearAir={state?.pitClearAir ?? null}
        isConnected={isConnected}
        lapNumber={state?.lapNumber ?? null}
        earliestPitLap={state?.earliestPitLap ?? null}
      />
    </div>
  );
};
