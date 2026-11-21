import React from "react";
import { useParams } from "react-router-dom";
import { useIfuelWebSocket } from "../useIfuelWebSocket";
import { OBS_WIDGETS, type ObsWidget } from "../utils/obsMode";
import { FuelWidgetContainer } from "./FuelWidgetContainer";
import { RelativeWidgetContainer } from "./StandingBattleWidgetContainer";
import { RaceStandingsWidgetContainer } from "./RaceStandingsWidgetContainer";
import { PitClearAirWidgetContainer } from "./PitClearAirWidgetContainer";
import { YellowFlagWidgetContainer } from "./YellowFlagWidgetContainer";
import { FreeInfoWidgets } from "./FreeInfoWidgets";
import { FastTrafficBanner } from "./FastTrafficBanner";
import { PitHelperPanel } from "./PitHelperPanel";

/** Un solo widget del layout libre, fijo en la esquina y con fondo transparente, para una fuente de navegador de OBS. */
export const ObsWidgetPage: React.FC = () => {
  const { widget } = useParams<{ widget: string }>();
  const { state, isConnected, sendMessage, raceStandingsRows } = useIfuelWebSocket("ws://127.0.0.1:7071/ifuel");
  if (!widget || !(OBS_WIDGETS as readonly string[]).includes(widget)) {
    return <div style={{ color: "#fff", padding: 12 }}>Widget desconocido. Disponibles: {OBS_WIDGETS.join(", ")}</div>;
  }
  const w = widget as ObsWidget;
  return (
    <div className="obs-root">
      {w === "fuel" && <FuelWidgetContainer state={state} isConnected={isConnected} sendMessage={sendMessage} />}
      {w === "relative" && <RelativeWidgetContainer state={state} isConnected={isConnected} />}
      {w === "standings" && <RaceStandingsWidgetContainer state={state} raceStandingsRows={raceStandingsRows} isConnected={isConnected} />}
      {w === "pitclear" && (
        <PitClearAirWidgetContainer pitClearAir={state?.pitClearAir ?? null} isConnected={isConnected} lapNumber={state?.lapNumber ?? null} earliestPitLap={state?.earliestPitLap ?? null} />
      )}
      {w === "yellow" && <YellowFlagWidgetContainer state={state} isConnected={isConnected} />}
      {(w === "driver" || w === "weather" || w === "car" || w === "dash") && <FreeInfoWidgets state={state} rows={raceStandingsRows} only={w} />}
      {w === "traffic" && <FastTrafficBanner state={state} />}
      {w === "pithelper" && <PitHelperPanel helper={state?.pitHelper} />}
    </div>
  );
};
