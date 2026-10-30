import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { FuelWidget } from "./FuelWidget";
import { FuelWidgetOverlay } from "./FuelWidgetOverlay";
import type { FuelOpts } from "../types/fuel";
import { loadJsonFromStorage, saveJsonToStorage } from "../utils/storage";
import { loadWidgetPosition, clampPosition } from "../utils/position";
import type { IfuelState } from "../useIfuelWebSocket";
import { useOverlayState } from "../contexts/useOverlayState";

const LS_KEY = "ifuel-settings-v1";
const POS_KEY_FUEL = "ifuel-pos-fuel";

const DEFAULT_FUEL_OPTS: FuelOpts = {
  minLapTimeSeconds: 20,
  minFuelUsedPerLap: 0.3,
  safetyExtraLaps: 1,
  avgMode: "5",
};

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

const FuelSettingsPanel = React.memo(function FuelSettingsPanel({
  fuelOpts: _fuelOpts,
  onChange: _onChange,
}: {
  fuelOpts: FuelOpts;
  onChange: (next: FuelOpts) => void;
}) {
  return null;
});

type FuelWidgetContainerProps = {
  state: IfuelState | null;
  isConnected: boolean;
  sendMessage: (msg: unknown) => void;
  variant?: "free" | "pitboard";
};

export const FuelWidgetContainer: React.FC<FuelWidgetContainerProps> = ({
  state,
  isConnected,
  variant = "free",
}) => {
  const overlayState = useOverlayState();

  const fuelVisible = overlayState.fuelVisible ?? true;
  const widgetsLocked = overlayState.widgetsLocked ?? true;
  const fuelSettingsVisible = overlayState.fuelSettingsVisible ?? false;
  const fuelScale = overlayState.fuelScale ?? 1;
  const fuelDetail = overlayState.fuelDetail === "full" ? "full" : "compact";

  const [fuelOpts, setFuelOpts] = useState<FuelOpts>(() =>
    loadJsonFromStorage(LS_KEY, DEFAULT_FUEL_OPTS),
  );

  const [position, setPosition] = useState(() =>
    loadWidgetPosition(POS_KEY_FUEL, { x: 40, y: 40 }),
  );

  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const isPitboard = variant === "pitboard";

  useEffect(() => {
    saveJsonToStorage(LS_KEY, fuelOpts);
  }, [fuelOpts]);

  useEffect(() => {
    if (isPitboard) return;
    saveJsonToStorage(POS_KEY_FUEL, position);
  }, [position, isPitboard]);

  useEffect(() => {
    if (isPitboard) return;

    function handleMouseMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      setPosition(
        clampPosition({
          x: e.clientX - dragOffsetRef.current.x,
          y: e.clientY - dragOffsetRef.current.y,
        }),
      );
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
  }, [isPitboard]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isPitboard) return;
      if (widgetsLocked) return;

      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("input")) return;

      draggingRef.current = true;
      dragOffsetRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [isPitboard, widgetsLocked, position.x, position.y],
  );

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

  const sessionClock = useMemo(() => {
    if (!hasState || !sessionTimeRemain || sessionTimeRemain <= 0 || sessionTimeRemain > 86400 * 3) return null;
    const total = Math.floor(sessionTimeRemain);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(sec).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }, [hasState, sessionTimeRemain]);

  if (!fuelVisible) return null;

  // Mismas props para las dos variantes: PitBoard conserva el widget clásico, el overlay usa el rediseñado
  const fuelWidgetProps: React.ComponentProps<typeof FuelWidget> = {
    fuel: fuel,
    fuelTime: fuelTime,
    estLaps: estLaps ?? 0,
    fuelLast: fuelLast ?? 0,
    fuelAvg: fuelAvgSelected,
    estRefuel: estRefuel ?? 0,
    fuelLevelRatio: fuelLevelRatio,
    fuelAvg2: fuelAvg2 ?? 0,
    fuelAvg5: fuelAvg5 ?? 0,
    fuelAvg10: fuelAvg10 ?? 0,
    lapNumber: displayedLap,
    lapTime: lapTimeStr,
    lapFuel: fuelLast ?? undefined,
    earliestPitLap: earliestPitLap,
    totalStops: totalStops,
    stintLaps: stintLaps,
    lapHistoryLast5: lapHistoryLast5,
    lapHistoryLast30: lapHistoryLast30,
    sessionLabel: sessionLabel,
    sessionClock,
    airTemp: airTemp ?? null,
    trackTemp: trackTemp ?? null,
  };

  return (
    <div
      className={
        isPitboard
          ? "fuel-widget-container pitboard-full"
          : "fuel-widget-container"
      }
      style={
        isPitboard
          ? undefined
          : {
              left: position.x,
              top: position.y,
              transform: `scale(${fuelScale ?? 1})`,
            }
      }
      onMouseDown={handleMouseDown}
    >
      {!hasState ? (
        <div className="fuel-widget">
          <div className="label">Esperando datos de iRacing...</div>
        </div>
      ) : (
        isPitboard ? (
          <FuelWidget {...fuelWidgetProps} />
        ) : (
          <FuelWidgetOverlay {...fuelWidgetProps} detail={fuelDetail} />
        )
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
        <FuelSettingsPanel fuelOpts={fuelOpts} onChange={setFuelOpts} />
      )}
    </div>
  );
};
