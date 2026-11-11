// src/PitboardLayout.tsx — pitboard para el monitor secundario (1280×800)
// Zonas: cabecera · franja de avisos · standings | plan de parada + neumáticos | rivales + radar
import React from "react";
import type { IfuelState } from "./useIfuelWebSocket";
import type { StandingsRow } from "./types/standings";
import { RaceStandingsWidgetContainer } from "./components/RaceStandingsWidgetContainer";
import { PitboardHeader } from "./components/pitboard/PitboardHeader";
import { AlertStrip } from "./components/pitboard/AlertStrip";
import { PitPlanCard } from "./components/pitboard/PitPlanCard";
import { TyresStrip } from "./components/pitboard/TyresStrip";
import { RivalsRow } from "./components/pitboard/RivalsRow";
import { TrackRing } from "./components/pitboard/TrackRing";
import { CarSettings } from "./components/pitboard/CarSettings";
import { PitHelperPanel } from "./components/PitHelperPanel";
import { pitCall } from "./utils/pitCall";
import { pitboardAlert } from "./utils/pitboardAlert";

type PitboardLayoutProps = {
  state: IfuelState | null;
  raceStandingsRows: StandingsRow[];
  isConnected: boolean;
  sendMessage: (msg: unknown) => void;
};

export const PitboardLayout: React.FC<PitboardLayoutProps> = ({ state, raceStandingsRows, isConnected }) => {
  const me = state?.playerCarNumber ?? null;
  const myRow = me != null ? raceStandingsRows.find((r) => String(r.carNumber) === me) : undefined;
  const remain = state?.sessionLapsRemainEx ?? null;
  const lap = state?.lapNumber ?? null;
  const lapsTotal = lap != null && remain != null && remain >= 0 && remain < 32767 ? lap + remain : null;
  const timed = lapsTotal == null;
  const car = state?.carData ?? null;
  const flags = state?.sessionFlags ?? 0;

  const call = pitCall(state?.pitClearAir ?? undefined, lap);
  const alert = pitboardAlert({
    pitHelper: state?.pitHelper ?? null,
    myPenalty: myRow?.penalty ?? null,
    yellow: state?.yellowWarning ?? null,
    fastTraffic: state?.fastTraffic ?? null,
    classNames: state?.classNames,
    weatherState: state?.weather?.state ?? null,
    call,
    fuelCritical: state?.fuelPlan?.status === "critical",
    lastLap: (flags & 0x2) !== 0 || remain === 1,
    checkered: (flags & 0x1) !== 0,
  });
  const y = state?.yellowWarning;
  const center =
    y?.active && y.distanceMeters != null && y.distanceMeters > 0 && y.distanceMeters <= 1200
      ? { label: y.type === "debris" ? "Debris" : y.type === "incident" ? "Coche parado" : "Amarilla", value: `${Math.round(y.distanceMeters / 10) * 10} m`, sub: "por delante" }
      : null;

  return (
    <div className="pitboard-layout pb-root app-root--free">
      <div className="pb-area-head">
        <PitboardHeader
          position={myRow?.position ?? null}
          totalCars={raceStandingsRows.length || null}
          timeRemain={state?.sessionTimeRemain != null && state.sessionTimeRemain > 0 && state.sessionTimeRemain < 90000 ? state.sessionTimeRemain : null}
          lapsRemain={!timed ? remain : null}
          lap={lap}
          lapsTotal={lapsTotal}
          lastLap={state?.lapTime ?? null}
          bestLap={state?.myBestLapTime ?? null}
          delta={car?.delta ?? null}
          sectors={car?.sectors ?? []}
          record={state?.trackHistory?.best?.race ?? state?.trackHistory?.best?.quali ?? state?.trackHistory?.best?.practice ?? null}
          incidents={myRow?.incidents ?? null}
        />
      </div>
      <div className="pb-area-alert">
        <AlertStrip
          alert={alert}
          weather={state?.weather}
          rainChance={state?.rainChance ?? null}
          trackTemp={state?.trackTemp ?? null}
          airTemp={state?.airTemp ?? null}
          sessionFlags={flags}
        />
      </div>
      <div className="pb-area-standings pitboard-widget">
        <RaceStandingsWidgetContainer variant="pitboard" state={state} raceStandingsRows={raceStandingsRows} isConnected={isConnected} />
      </div>
      <div className="pb-col pb-col--mid">
        <PitPlanCard state={state} />
        <TyresStrip tyres={car?.tyres ?? null} compound={car?.compound ?? null} />
      </div>
      <div className="pb-col pb-col--right">
        {state?.pitHelper ? (
          <div className="pb-pithelper"><PitHelperPanel helper={state.pitHelper} variant="pitboard" /></div>
        ) : (
          <>
            <RivalsRow ahead={state?.relativeAhead ?? null} behind={state?.relativeBehind ?? null} cls={state?.classColorIndexById} />
            <div className="pb-area-ring">
              <TrackRing
                cars={state?.cars ?? []}
                myPct={state?.lapDistPct ?? null}
                classColorIndexById={state?.classColorIndexById}
                sectorStarts={car?.sectorStarts}
                trackTemp={state?.trackTemp ?? null}
                airTemp={state?.airTemp ?? null}
                rainChance={state?.rainChance ?? null}
                center={center}
              />
            </div>
            <CarSettings car={car} />
          </>
        )}
      </div>
    </div>
  );
};
