import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { FuelWidget } from "./FuelWidget";
import { useIfuelWebSocket } from "../useIfuelWebSocket";

const WS_URL = "ws://localhost:7071/ifuel";
const LS_KEY = "ifuel-settings-v1";

type FuelOpts = {
  minLapTimeSeconds: number;
  minFuelUsedPerLap: number;
  safetyExtraLaps: number;
  avgMode: "2" | "5" | "10";
};

const DEFAULT_FUEL_OPTS: FuelOpts = {
  minLapTimeSeconds: 20,
  minFuelUsedPerLap: 0.3,
  safetyExtraLaps: 1,
  avgMode: "5",
};

// Panel de ajustes memoizado para no re-renderizar en cada tick de telemetría
const FuelSettingsPanel: React.FC<{
  fuelOpts: FuelOpts;
  onChange: (next: FuelOpts) => void;
}> = React.memo(function FuelSettingsPanel({ fuelOpts, onChange }) {
  const update = useCallback(
    (patch: Partial<FuelOpts>) => onChange({ ...fuelOpts, ...patch }),
    [fuelOpts, onChange],
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 4,
        right: "100%",
        marginRight: 8,
        padding: "2px",
        borderRadius: 4,
        background: "rgba(0,0,0,0.85)",
        color: "#fff",
        fontSize: 10,
        minWidth: 180,
        zIndex: 10,
      }}
    >
      <div style={{ marginBottom: 4, fontWeight: 600 }}>iFuel settings</div>

      <label style={{ display: "block", marginBottom: 4 }}>
        Min lap time (s)
        <input
          type="number"
          value={fuelOpts.minLapTimeSeconds}
          onChange={(e) =>
            update({ minLapTimeSeconds: Number(e.target.value) || 0 })
          }
          style={{ width: "100%", fontSize: 10 }}
        />
      </label>

      <label style={{ display: "block", marginBottom: 4 }}>
        Min fuel / lap
        <input
          type="number"
          step="0.1"
          value={fuelOpts.minFuelUsedPerLap}
          onChange={(e) =>
            update({ minFuelUsedPerLap: Number(e.target.value) || 0 })
          }
          style={{ width: "100%", fontSize: 10 }}
        />
      </label>

      <label style={{ display: "block", marginBottom: 4 }}>
        Safety laps
        <input
          type="number"
          value={fuelOpts.safetyExtraLaps}
          onChange={(e) =>
            update({ safetyExtraLaps: Number(e.target.value) || 0 })
          }
          style={{ width: "100%", fontSize: 10 }}
        />
      </label>

      <div style={{ marginTop: 4 }}>
        Avg laps:
        <div style={{ marginTop: 2, display: "flex", gap: 4 }}>
          {["2", "5", "10"].map((mode) => (
            <button
              key={mode}
              onClick={() => update({ avgMode: mode as FuelOpts["avgMode"] })}
              style={{
                flex: 1,
                fontSize: 10,
                padding: "2px 0",
                borderRadius: 3,
                border:
                  fuelOpts.avgMode === mode
                    ? "1px solid #0f0"
                    : "1px solid #555",
                background: fuelOpts.avgMode === mode ? "#064" : "#222",
                color: "#fff",
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

const emptyState = {
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
  stintLaps: [] as number[],
  lapHistoryLast5: [] as { lapNumber: number; fuelUsed: number; lapTime: number }[],
  lapHistoryLast30: [] as { lapNumber: number; fuelUsed: number; lapTime: number }[],
} satisfies import("../useIfuelWebSocket").IfuelState;

export const FuelWidgetContainer: React.FC = () => {
  const [fuelOpts, setFuelOpts] = useState<FuelOpts>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return DEFAULT_FUEL_OPTS;
      const parsed = JSON.parse(raw) as Partial<FuelOpts>;
      return {
        ...DEFAULT_FUEL_OPTS,
        ...parsed,
      };
    } catch {
      return DEFAULT_FUEL_OPTS;
    }
  });

  const [showSettings, setShowSettings] = useState(false);

  // candado: true = fijo, false = se puede mover
  const [overlayLocked, setOverlayLocked] = useState(false);

  // posición y drag
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Persistencia de ajustes
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(fuelOpts));
    } catch (e) {
      console.error("Error guardando ifuel settings:", e);
    }
  }, [fuelOpts]);

  // Hook de telemetría (con throttling interno en el hook)
  const { state, isConnected } = useIfuelWebSocket(WS_URL, {
    minLapTimeSeconds: fuelOpts.minLapTimeSeconds,
    minFuelUsedPerLap: fuelOpts.minFuelUsedPerLap,
    safetyExtraLaps: fuelOpts.safetyExtraLaps,
  });

  // Manejo de drag global sin recrear handlers en cada render
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
      if (overlayLocked) return;

      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("input")) return;

      draggingRef.current = true;
      dragOffsetRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [overlayLocked, position.x, position.y],
  );

  const handleToggleLock = useCallback(() => {
    setOverlayLocked((v) => !v);
  }, []);

  const handleToggleSettings = useCallback(() => {
    setShowSettings((v) => !v);
  }, []);

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

  return (
    <div
      className="fuel-widget-container"
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
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

      {/* Indicador WS */}
      <div
        style={{
          position: "absolute",
          top: -20,
          left: 0,
          padding: "2px 6px",
          borderRadius: 4,
          fontSize: 10,
          background: isConnected
            ? "rgba(0, 128, 0, 0.7)"
            : "rgba(128, 0, 0, 0.7)",
          color: "#fff",
        }}
      >
        WS {isConnected ? "ON" : "OFF"}
      </div>

      {/* Botones candado + ajustes */}
      <div style={{ position: "absolute", top: -20, right: 0 }}>
        <button
          onClick={handleToggleLock}
          style={{
            marginRight: 4,
            padding: "2px 6px",
            fontSize: 10,
            borderRadius: 4,
            cursor: "pointer",
            background: overlayLocked ? "#c33" : "#333",
            color: "#fff",
            border: "1px solid #666",
          }}
        >
          {overlayLocked ? "🔒" : "🔓"}
        </button>

        <button
          style={{
            padding: "2px 6px",
            fontSize: 10,
            borderRadius: 4,
          }}
          onClick={handleToggleSettings}
        >
          ⚙
        </button>
      </div>

      {/* Panel ajustes */}
      {showSettings && (
        <FuelSettingsPanel
          fuelOpts={fuelOpts}
          onChange={handleSettingsChange}
        />
      )}
    </div>
  );
};
