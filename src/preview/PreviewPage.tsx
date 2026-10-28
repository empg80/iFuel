// Vista previa de los overlays con datos simulados (solo en builds con VITE_PREVIEW=1).
// Uso: iFuel/dist-preview/index.html#/preview?scene=calm|warn|crit|full|compare|edge|replay|container
import React from "react";
import { useSearchParams } from "react-router-dom";
import { Backdrop } from "./Backdrop";
import { FuelWidget, type FuelWidgetProps } from "../components/FuelWidget";
import { FuelWidgetOverlay } from "../components/FuelWidgetOverlay";
import { RelativeWidget } from "../components/StandingBattleWidget";
import { YellowFlagWidget } from "../components/YellowFlagWidget";
import { PitClearAirWidget } from "../components/PitClearAirWidget";
import { RaceStandingsWidget } from "../components/RaceStandingsWidget";
import type { StandingsRow } from "../types/standings";
import { RaceStandingsWidgetContainer } from "../components/RaceStandingsWidgetContainer";
import { ReplayTowerWidget } from "../components/ReplayTowerWidget";
import { DriverFocusWidget } from "../components/DriverFocusWidget";
import { TrackInfoWidget } from "../components/TrackInfoWidget";

const hist = (base: number, n: number) =>
  Array.from({ length: n }, (_, i) => ({
    lapNumber: i + 1,
    fuelUsed: base + Math.sin(i * 1.7) * 0.05 + (i % 5 === 3 ? 0.11 : 0),
  }));

function fuelProps(kind: "calm" | "warn" | "crit"): FuelWidgetProps {
  const base: FuelWidgetProps = {
    fuel: 38.4,
    fuelTime: "42:10",
    estLaps: 14.2,
    fuelLast: 2.71,
    fuelAvg: 2.7,
    estRefuel: 0,
    fuelLevelRatio: 0.62,
    fuelAvg2: 2.72,
    fuelAvg5: 2.7,
    fuelAvg10: 2.69,
    lapNumber: 12,
    lapTime: "01:49.3",
    lapFuel: 2.71,
    earliestPitLap: 26,
    totalStops: 2,
    stintLaps: [26, 24],
    lapHistoryLast5: hist(2.7, 5),
    lapHistoryLast30: hist(2.7, 24),
    sessionLabel: "28 LAPS LEFT",
    airTemp: 24.3,
    trackTemp: 36.8,
  };
  if (kind === "warn")
    return { ...base, fuel: 7.9, fuelTime: "09:12", estLaps: 2.9, fuelLevelRatio: 0.16, estRefuel: 18.5, lapFuel: 2.83, fuelLast: 2.83, lapNumber: 24 };
  if (kind === "crit")
    return { ...base, fuel: 2.9, fuelTime: "03:07", estLaps: 1.07, fuelLevelRatio: 0.06, estRefuel: 21.6, lapFuel: 2.74, fuelLast: 2.74, lapNumber: 26 };
  return base;
}

const classColors = { 4011: 0, 2523: 1 };

const rows: StandingsRow[] = [
  ["1", "M. Fernández", "27", 4011, 108.412, 14, 1],
  ["2", "J. Lindqvist", "8", 4011, 108.77, 14, 1],
  ["3", "P. Okafor", "5", 4011, 108.95, 13, 0],
  ["4", "S. Tanaka", "33", 4011, 109.21, 14, 1],
  ["5", "R. Costa", "14", 4011, 109.4, 12, 1],
  ["6", "L. Weber", "91", 4011, 109.62, 15, 0],
  ["7", "D. Novak", "62", 2523, 112.9, 11, 2],
  ["8", "A. Rossi", "19", 2523, 113.4, 12, 2],
  ["9", "C. Dubois", "3", 2523, 113.85, 10, 1],
  ["10", "T. Hughes", "77", 2523, 114.3, 13, 0],
].map(([position, driverName, carNumber, classId, best, stint, stops]) => ({
  position: Number(position),
  carNumber: String(carNumber),
  classId: Number(classId),
  driverName: String(driverName),
  bestLapTime: Number(best),
  gapToLeader: null,
  lapsDown: 0,
  stintLapCount: Number(stint),
  lastPitDurationSeconds: Number(stops) > 0 ? 24.8 + Number(stops) : null,
  pitStops: Number(stops),
  inPit: false,
  carModel: "GT3",
}));

const ahead = { carNum: "27", gapSeconds: 1.842, lastLap: 108.9, bestLap: 108.4, deltaLastToMe: -0.42, classId: 4011, classPosition: 3 };
const behind = { carNum: "8", gapSeconds: -0.874, lastLap: 109.4, bestLap: 108.8, deltaLastToMe: 0.31, classId: 4011, classPosition: 5 };
const onAhead = { carNum: "62", gapSeconds: 4.2, lapsDiff: -1, classId: 2523, classPosition: 1 };
const onBehind = { carNum: "91", gapSeconds: -6.9, lapsDiff: 0, classId: 4011, classPosition: 6 };

const Rel = () => (
  <RelativeWidget
    ahead={ahead}
    behind={behind}
    myPosition={4}
    myLastLap={109.2}
    myBestLap={108.95}
    onTrackAhead={onAhead}
    onTrackBehind={onBehind}
    classColorIndexById={classColors}
  />
);
const Standings = () => (
  <RaceStandingsWidget rows={rows} myCarNumber="14" classColorIndexById={classColors} />
);
const Yellow = ({ on }: { on: boolean }) => (
  <YellowFlagWidget
    warning={
      on
        ? { active: true, distanceMeters: 420, timeSeconds: 6.8, carNum: "33", classId: 4011, classPosition: 5, type: "incident" }
        : { active: false, distanceMeters: null, timeSeconds: null, carNum: null, classId: null, classPosition: null, type: null }
    }
    classColorIndexById={classColors}
  />
);
const Pit = ({ lap }: { lap: number }) => (
  <PitClearAirWidget
    data={{ suggestedLap: 26, options: [{ lap: 25, trafficScore: 4 }, { lap: 26, trafficScore: 1 }, { lap: 27, trafficScore: 3 }] }}
    lapNumber={lap}
    pitWindowStartLap={22}
    pitWindowEndLap={30}
  />
);

const at = (style: React.CSSProperties, child: React.ReactNode) => (
  <div style={{ position: "absolute", ...style }}>{child}</div>
);

function Scene({ scene }: { scene: string }) {
  if (scene === "compare") {
    // Antes (widget clásico, estilos antiguos) frente a después (rediseño), sobre fondo neutro
    return (
      <div style={{ position: "absolute", inset: 0, background: "#101216", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        <div className="app-root" style={{ display: "block", minHeight: 0, padding: 48, borderRight: "1px solid #2a2d34" }}>
          <div style={{ color: "#8a94a6", font: "600 16px system-ui", letterSpacing: ".12em", marginBottom: 24 }}>ANTES</div>
          <FuelWidget {...fuelProps("warn")} />
          <div style={{ height: 24 }} />
        </div>
        <div className="app-root app-root--free" style={{ display: "block", minHeight: 0, padding: 48 }}>
          <div style={{ color: "#8a94a6", font: "600 16px system-ui", letterSpacing: ".12em", marginBottom: 24 }}>DESPUÉS</div>
          <FuelWidgetOverlay {...fuelProps("warn")} detail="compact" />
        </div>
      </div>
    );
  }

  if (scene === "container") {
    // El contenedor real (posición arrastrable, etiqueta de estado) con el tema libre
    return (
      <div className="app-root app-root--free" style={{ position: "absolute", inset: 0, display: "block", minHeight: 0 }}>
        <Backdrop />
        <RaceStandingsWidgetContainer state={null} raceStandingsRows={rows} isConnected={true} />
      </div>
    );
  }

  if (scene === "replay") {
    // Vista replay (retransmisión): torre, piloto en foco e info de pista
    const towerRows: StandingsRow[] = Array.from({ length: 22 }, (_, i) => {
      const base = rows[i % rows.length];
      return { ...base, position: i + 1, carNumber: String(base.carNumber), driverName: i < rows.length ? base.driverName : `Driver ${i + 1}`, gapToLeader: i === 0 ? 0 : i < 14 ? i * 3.417 + (i > 9 ? 40 : 0) : null, lapsDown: i >= 14 ? 1 + (i > 18 ? 1 : 0) : 0 };
    });
    return (
      <div className="replay-root" style={{ position: "absolute", inset: 0 }}>
        <Backdrop />
        <TrackInfoWidget trackName="Autodromo Nazionale Monza" trackLength="5.79 km" airTemp={24.3} trackTemp={36.8} windSpeed={11.5} windDirection="NW" rainChance={10} />
        <ReplayTowerWidget
          state={{ classColorIndexById: classColors, sessionLapsRemainEx: 12, sessionTimeRemain: 0, yellowWarning: null }}
          rows={towerRows}
          highlightCarNumber="14"
          seriesName="iFuel Replay"
        />
        <DriverFocusWidget driver={{ position: 5, carNumber: "14", driverName: "R. Costa", carModel: "Porsche 911 GT3 R", bestLapTime: 109.4 }} />
      </div>
    );
  }

  if (scene === "edge") {
    // Estados límite: sin estimación de combustible, escombros, parada "ahora", coches doblados, hueco de pit
    const noEst: FuelWidgetProps = { ...fuelProps("calm"), estLaps: 0, fuelLast: 0, fuelAvg: 0, fuelAvg2: 0, fuelAvg5: 0, fuelAvg10: 0, estRefuel: 0, lapFuel: 0, fuelTime: "--:--", lapHistoryLast5: [], lapHistoryLast30: [], earliestPitLap: null, totalStops: null, stintLaps: [], lapNumber: 1, sessionLabel: "--" };
    return (
      <div className="app-root app-root--free" style={{ position: "absolute", inset: 0, display: "block", minHeight: 0 }}>
        <Backdrop />
        {at({ left: 36, bottom: 36 }, <FuelWidgetOverlay {...noEst} detail="compact" />)}
        {at({ left: "50%", transform: "translateX(-50%)", bottom: 36 }, (
          <RelativeWidget ahead={{ ...ahead, gapSeconds: 0.2 }} behind={{ ...behind, gapSeconds: -12.4 }} myPosition={1} myLastLap={0} myBestLap={0}
            onTrackAhead={{ ...onAhead, gapSeconds: 1.1, lapsDiff: 1 }} onTrackBehind={{ ...onBehind, lapsDiff: -1 }} classColorIndexById={classColors} />
        ))}
        {at({ left: "50%", transform: "translateX(-50%)", top: 36 }, (
          <YellowFlagWidget warning={{ active: true, distanceMeters: 95, timeSeconds: 1.6, carNum: null, classId: null, classPosition: null, type: "debris" }} classColorIndexById={classColors} />
        ))}
        {at({ right: 36, top: 36 }, <PitClearAirWidget data={undefined} lapNumber={3} pitWindowStartLap={null} pitWindowEndLap={null} />)}
        {at({ right: 36, bottom: 36 }, <Pit lap={26} />)}
      </div>
    );
  }

  const kind = scene === "crit" ? "crit" : scene === "warn" ? "warn" : "calm";
  const detail = scene === "full" ? "full" : "compact";
  const yellow = scene === "crit";
  const pitLap = scene === "warn" ? 24 : 12;

  return (
    <div className="app-root app-root--free" style={{ position: "absolute", inset: 0, display: "block", minHeight: 0 }}>
      <Backdrop />
      {at({ left: 36, bottom: detail === "full" ? undefined : 36, top: detail === "full" ? 36 : undefined }, <FuelWidgetOverlay {...fuelProps(kind)} detail={detail} />)}
      {at({ left: "50%", transform: "translateX(-50%)", bottom: 36 }, <Rel />)}
      {at({ right: 36, top: 36 }, <Standings />)}
      {at({ left: "50%", transform: "translateX(-50%)", top: 36 }, <Yellow on={yellow} />)}
      {(scene === "warn" || scene === "crit") && at({ right: 36, bottom: 36 }, <Pit lap={scene === "warn" ? pitLap : 25} />)}
    </div>
  );
}

export default function PreviewPage() {
  const [params] = useSearchParams();
  const scene = params.get("scene") ?? "calm";
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#000" }}>
      <Scene scene={scene} />
    </div>
  );
}
