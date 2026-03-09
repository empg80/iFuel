import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { FuelWidget } from "./FuelWidget";
// import { useWidgetVisibility } from "../contexts/useWidgetVisibility";
import type { FuelOpts } from "../types/fuel";
import { loadJsonFromStorage, saveJsonToStorage } from "../utils/storage";
import { loadWidgetPosition } from "../utils/position";
import type { IfuelState } from "../useIfuelWebSocket";
import { useOverlayState } from "../contexts/useOverlayState"; // NUEVO

const LS_KEY = "ifuel-settings-v1";
const POS_KEY_FUEL = "ifuel-pos-fuel";

const DEFAULT_FUEL_OPTS: FuelOpts = {
  minLapTimeSeconds: 20,
  minFuelUsedPerLap: 0.3,
  safetyExtraLaps: 1,
  avgMode: "5",
};

const FuelSettingsPanel = React.memo(function FuelSettingsPanel({
  fuelOpts,
  onChange,
}: {
  fuelOpts: FuelOpts;
  onChange: (next: FuelOpts) => void;
}) {
  const update = useCallback(
    (patch: Partial<FuelOpts>) => onChange({ ...fuelOpts, ...patch }),
    [fuelOpts, onChange],
  );

  return (
    <div className="fuel-settings">
      <div className="fuel-settings__title">iFuel settings</div>

      <label className="fuel-settings__field">
        Min lap time (s)
        <input
          type="number"
          value={fuelOpts.minLapTimeSeconds}
          onChange={(e) =>
            update({ minLapTimeSeconds: Number(e.target.value) || 0 })
          }
          className="fuel-settings__input"
        />
      </label>

      <label className="fuel-settings__field">
        Min fuel / lap
        <input
          type="number"
          step="0.1"
          value={fuelOpts.minFuelUsedPerLap}
          onChange={(e) =>
            update({ minFuelUsedPerLap: Number(e.target.value) || 0 })
          }
          className="fuel-settings__input"
        />
      </label>

      <label className="fuel-settings__field">
        Safety laps
        <input
          type="number"
          value={fuelOpts.safetyExtraLaps}
          onChange={(e) =>
            update({ safetyExtraLaps: Number(e.target.value) || 0 })
          }
          className="fuel-settings__input"
        />
      </label>

      <div className="fuel-settings__avg">
        Avg laps:
        <div className="fuel-settings__avg-buttons">
          {["2", "5", "10"].map((mode) => {
            const selected = fuelOpts.avgMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => update({ avgMode: mode as FuelOpts["avgMode"] })}
                className={
                  selected
                    ? "fuel-settings__avg-button fuel-settings__avg-button--active"
                    : "fuel-settings__avg-button"
                }
              >
                {mode}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

const emptyState: IfuelState = {
  fuel: 0,
  fuelMax: null,
  fuelCapacity: null,
  lapNumber: null,
  lapTime: null,
  fuelLast: null,
  fuelAvg: null,
  fuelAvg2: null,
  fuelAvg5: null,
  fuelAvg10: null,
  estLaps: null,
  estRefuel: null,
  fuelTime: "--:--",
  sessionLapsRemainEx: null,
  sessionTimeRemain: null,
  airTemp: null,
  trackTemp: null,
  earliestPitLap: null,
  totalStops: null,
  stintLaps: [],
  lapHistoryLast5: [],
  lapHistoryLast30: [],
  relativeAhead: null,
  relativeBehind: null,
  relativeMyPosition: null,
  myBestLapTime: null,
  onTrackAhead: null,
  onTrackBehind: null,
  classColorIndexById: {},
  yellowWarning: {
    active: false,
    distanceMeters: null,
    timeSeconds: null,
    carNum: null,
    classId: null,
    classPosition: null,
  },
  pitClearAir: null,
};

type FuelWidgetContainerProps = {
  state: IfuelState | null;
  isConnected: boolean;
  sendMessage: (msg: unknown) => void;
};

export const FuelWidgetContainer: React.FC<FuelWidgetContainerProps> = ({
  state,
  isConnected,
  sendMessage,
}) => {
  const overlayState = useOverlayState(); // NUEVO

  const fuelVisible = overlayState.fuelVisible ?? true;
  const widgetsLocked = overlayState.widgetsLocked ?? true;
  const fuelSettingsVisible = overlayState.fuelSettingsVisible ?? false;
  const fuelScale = overlayState.fuelScale ?? 1;

  // const {
  //   fuel: fuelVisible,
  //   widgetsLocked,
  //   fuelSettingsVisible,
  //   fuelScale,
  // } = useWidgetVisibility();

  const [fuelOpts, setFuelOpts] = useState<FuelOpts>(() =>
    loadJsonFromStorage(LS_KEY, DEFAULT_FUEL_OPTS),
  );

  const [position, setPosition] = useState(() =>
    loadWidgetPosition(POS_KEY_FUEL, { x: 100, y: 100 }),
  );

  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // NUEVO: recordamos la última ventana enviada
  const lastSentPitStrategyRef = useRef<{
    start: number;
    end: number;
    delta: number;
  } | null>(null);

  useEffect(() => {
    saveJsonToStorage(LS_KEY, fuelOpts);
  }, [fuelOpts]);

  useEffect(() => {
    saveJsonToStorage(POS_KEY_FUEL, position);
  }, [position]);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      setPosition({
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      });
    }

    function handleMouseUp() {
      if (draggingRef.current) {
        draggingRef.current = false;
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (widgetsLocked) return;

      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("input")) return;

      draggingRef.current = true;
      dragOffsetRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [widgetsLocked, position.x, position.y],
  );

  const handleSettingsChange = useCallback((next: FuelOpts) => {
    setFuelOpts(next);
  }, []);

  const hasState = state != null;

  const {
    fuel,
    fuelMax,
    fuelCapacity,
    lapNumber,
    lapTime,
    fuelLast,
    fuelAvg2,
    fuelAvg5,
    fuelAvg10,
    estLaps,
    estRefuel,
    fuelTime,
    earliestPitLap,
    totalStops,
    stintLaps,
    lapHistoryLast5,
    lapHistoryLast30,
    airTemp,
    trackTemp,
    sessionLapsRemainEx,
    sessionTimeRemain,
  } = state ?? emptyState;

  const capacity = fuelCapacity ?? fuelMax ?? fuel;
  const fuelLevelRatio = capacity > 0 ? fuel / capacity : 0;

  const MIN_VALID_LAPS_FOR_PIT_CLEAR = 5;
  const validLapsCount = state?.lapHistoryLast30.length ?? 0;

  // si quieres seguir mandando pit strategy desde aquí:
  useEffect(() => {
    if (!earliestPitLap || !estLaps) return;

    // aún no hay suficiente histórico de fuel → no activamos Pit Clear Air
    if (validLapsCount < MIN_VALID_LAPS_FOR_PIT_CLEAR) return;

    // Duración típica de stint: usa el primer stint calculado si existe
    const firstStint = stintLaps?.[0] ?? null;
    const stintLength = firstStint && firstStint > 0 ? firstStint : estLaps; // fallback

    // ancho base: 20 % del stint, acotado
    const baseHalfWidth = Math.round(stintLength * 0.2);

    const MIN_HALF_WIDTH = 2; // al menos ±2 vueltas
    const MAX_HALF_WIDTH = 8; // no más de ±8 vueltas

    const halfWidth = Math.min(
      MAX_HALF_WIDTH,
      Math.max(MIN_HALF_WIDTH, baseHalfWidth),
    );

    const centerLap = earliestPitLap;
    const pitWindowStartLap = Math.max(1, centerLap - halfWidth);
    const pitWindowEndLap = centerLap + halfWidth;
    const pitDeltaSeconds = 32;

    const prev = lastSentPitStrategyRef.current;
    const next = {
      start: pitWindowStartLap,
      end: pitWindowEndLap,
      delta: pitDeltaSeconds,
    };

    if (
      prev &&
      prev.start === next.start &&
      prev.end === next.end &&
      prev.delta === next.delta
    ) {
      return; // misma ventana, no enviar
    }

    lastSentPitStrategyRef.current = next;

    sendMessage({
      type: "updatePitStrategy",
      pitWindowStartLap,
      pitWindowEndLap,
      pitDeltaSeconds,
    });
  }, [earliestPitLap, estLaps, stintLaps, validLapsCount, sendMessage]);

  const lapTimeStr =
    lapTime && lapTime > 0
      ? new Date(lapTime * 1000).toISOString().substring(14, 23)
      : undefined;

  const displayedLap =
    lapNumber !== null && lapNumber > 0 ? lapNumber : undefined;

  const fuelAvgSelected = useMemo(() => {
    if (!hasState) return 0;
    if (fuelOpts.avgMode === "2") return fuelAvg2 ?? 0;
    if (fuelOpts.avgMode === "10") return fuelAvg10 ?? 0;
    return fuelAvg5 ?? 0;
  }, [hasState, fuelOpts.avgMode, fuelAvg2, fuelAvg5, fuelAvg10]);

  const isLapsRace =
    hasState &&
    sessionLapsRemainEx !== null &&
    sessionLapsRemainEx > 0 &&
    sessionLapsRemainEx < 1000;

  const sessionLabel = useMemo(() => {
    if (!hasState) return "Esperando datos de iRacing...";
    if (isLapsRace) {
      return `${sessionLapsRemainEx} LAPS LEFT`;
    }
    if (sessionTimeRemain && sessionTimeRemain > 0) {
      const totalSeconds = Math.floor(sessionTimeRemain);
      const hh = Math.floor(totalSeconds / 3600)
        .toString()
        .padStart(2, "0");
      const mm = Math.floor((totalSeconds % 3600) / 60)
        .toString()
        .padStart(2, "0");
      const ss = Math.floor(totalSeconds % 60)
        .toString()
        .padStart(2, "0");
      return `${hh}:${mm}:${ss} LEFT`;
    }
    return "--";
  }, [hasState, isLapsRace, sessionLapsRemainEx, sessionTimeRemain]);

  if (!fuelVisible) return null;

  return (
    <div
      className="fuel-widget-container"
      style={{
        left: position.x,
        top: position.y,
        transform: `scale(${fuelScale ?? 1})`,
      }}
      onMouseDown={handleMouseDown}
    >
      {!hasState ? (
        <div className="fuel-widget">
          <div className="label">Esperando datos de iRacing...</div>
        </div>
      ) : (
        <FuelWidget
          fuel={fuel}
          fuelTime={fuelTime}
          estLaps={estLaps ?? 0}
          fuelLast={fuelLast ?? 0}
          fuelAvg={fuelAvgSelected}
          estRefuel={estRefuel ?? 0}
          fuelLevelRatio={fuelLevelRatio}
          fuelAvg2={fuelAvg2 ?? 0}
          fuelAvg5={fuelAvg5 ?? 0}
          fuelAvg10={fuelAvg10 ?? 0}
          lapNumber={displayedLap}
          lapTime={lapTimeStr}
          lapFuel={fuelLast ?? undefined}
          earliestPitLap={earliestPitLap}
          totalStops={totalStops}
          stintLaps={stintLaps}
          lapHistoryLast5={lapHistoryLast5}
          lapHistoryLast30={lapHistoryLast30}
          sessionLabel={sessionLabel}
          airTemp={airTemp ?? null}
          trackTemp={trackTemp ?? null}
        />
      )}

      <div
        className={`fuel-widget-status ${
          isConnected
            ? "fuel-widget-status--connected"
            : "fuel-widget-status--disconnected"
        }`}
      >
        FUEL {isConnected ? "ON" : "OFF"}
      </div>

      {fuelSettingsVisible && (
        <FuelSettingsPanel
          fuelOpts={fuelOpts}
          onChange={handleSettingsChange}
        />
      )}
    </div>
  );
};
