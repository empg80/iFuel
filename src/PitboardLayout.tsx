// src/PitboardLayout.tsx — pitboard para el monitor secundario (1280×800)
import React from "react";
import type { IfuelState } from "./useIfuelWebSocket";
import type { StandingsRow } from "./types/standings";
import { FastTrafficBanner } from "./components/FastTrafficBanner";
import { YellowFlagWidgetContainer } from "./components/YellowFlagWidgetContainer";
import { RaceStandingsWidgetContainer } from "./components/RaceStandingsWidgetContainer";
import { RelativeWidgetContainer } from "./components/StandingBattleWidgetContainer";
import { PitClearAirWidgetContainer } from "./components/PitClearAirWidgetContainer";
import { FuelWidgetContainer } from "./components/FuelWidgetContainer";
import { PitboardHeader } from "./components/pitboard/PitboardHeader";
import { TrackRing } from "./components/pitboard/TrackRing";
import { TyresPanel } from "./components/pitboard/TyresPanel";
import { CarSettings } from "./components/pitboard/CarSettings";
import { PedalTraceChart } from "./components/pitboard/PedalTraceChart";

type PitboardLayoutProps = {
  state: IfuelState | null;
  raceStandingsRows: StandingsRow[];
  isConnected: boolean;
  sendMessage: (msg: unknown) => void;
};

export const PitboardLayout: React.FC<PitboardLayoutProps> = ({
  state,
  raceStandingsRows,
  isConnected,
  sendMessage,
}) => {
  const me = state?.playerCarNumber ?? null;
  const myRow = me != null ? raceStandingsRows.find((r) => String(r.carNumber) === me) : undefined;
  const remain = state?.sessionLapsRemainEx ?? null;
  const lap = state?.lapNumber ?? null;
  const lapsTotal = lap != null && remain != null && remain >= 0 && remain < 32767 ? lap + remain : null;
  const timed = lapsTotal == null;
  const car = state?.carData ?? null;

  return (
    <div className="pitboard-layout pb-root app-root--free">
      <div className="pb-area-head">
        <PitboardHeader
          position={myRow?.position ?? null}
          totalCars={raceStandingsRows.length || null}
          timeRemain={timed ? (state?.sessionTimeRemain ?? null) : null}
          lapsRemain={!timed ? remain : null}
          lap={lap}
          lapsTotal={lapsTotal}
          lastLap={state?.lapTime ?? null}
          bestLap={state?.myBestLapTime ?? null}
          delta={car?.delta ?? null}
          sectors={car?.sectors ?? []}
        />
      </div>
      {state?.yellowWarning?.active && (
        <div className="pb-area-flag">
          <YellowFlagWidgetContainer variant="pitboard" state={state} isConnected={isConnected} />
        </div>
      )}
      <div className="pb-area-standings pitboard-widget">
        <RaceStandingsWidgetContainer
          variant="pitboard"
          state={state}
          raceStandingsRows={raceStandingsRows}
          isConnected={isConnected}
        />
      </div>
      <div className="pb-col pb-col--mid">
        <FastTrafficBanner state={state} variant="pitboard" />
        <div className="pb-area-ring">
          <TrackRing
            cars={state?.cars ?? []}
            myPct={state?.lapDistPct ?? null}
            classColorIndexById={state?.classColorIndexById}
            sectorStarts={car?.sectorStarts}
            trackTemp={state?.trackTemp ?? null}
            airTemp={state?.airTemp ?? null}
            rainChance={state?.rainChance ?? null}
          />
        </div>
        <div className="pb-area-fuel pitboard-widget">
          <FuelWidgetContainer variant="pitboard" state={state} isConnected={isConnected} sendMessage={sendMessage} />
        </div>
        <div className="pb-area-tyres">
          <TyresPanel tyres={car?.tyres ?? null} compound={car?.compound ?? null} />
        </div>
      </div>
      <div className="pb-col pb-col--right">
        <div className="pb-area-relative pitboard-widget">
          <RelativeWidgetContainer variant="pitboard" state={state} isConnected={isConnected} />
        </div>
        <div className="pb-area-pit pitboard-widget">
          <PitClearAirWidgetContainer
            variant="pitboard"
            pitClearAir={state?.pitClearAir ?? null}
            isConnected={isConnected}
            lapNumber={state?.lapNumber ?? null}
            earliestPitLap={state?.earliestPitLap ?? null}
          />
        </div>
        <div className="pb-area-trace">
          <CarSettings car={car} />
          <PedalTraceChart trace={state?.trace ?? null} />
        </div>
      </div>
    </div>
  );
};
