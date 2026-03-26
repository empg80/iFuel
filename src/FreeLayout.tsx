// src/FreeLayout.tsx
import React from "react";
import type { IfuelState } from "./useIfuelWebSocket";
import { FuelWidgetContainer } from "./components/FuelWidgetContainer";
import { RelativeWidgetContainer } from "./components/StandingBattleWidgetContainer";
import { YellowFlagWidgetContainer } from "./components/YellowFlagWidgetContainer";
import { PitClearAirWidgetContainer } from "./components/PitClearAirWidgetContainer";
import { RaceStandingsWidgetContainer } from "./components/RaceStandingsWidgetContainer";

type ServerStatus = "connected" | "connecting" | "disconnected";

type FreeLayoutProps = {
  state: IfuelState | null;
  isConnected: boolean;
  sendMessage: (msg: unknown) => void;
  serverStatus: ServerStatus;
  layoutMode?: "free" | "pitboard" | "replay";
};

export const FreeLayout: React.FC<FreeLayoutProps> = ({
  state,
  isConnected,
  sendMessage,
  serverStatus,
  layoutMode,
}) => {
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
        <RaceStandingsWidgetContainer wsUrl="ws://127.0.0.1:7071/ifuel" />
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
