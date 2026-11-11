// Vista previa de los overlays con datos simulados (solo en builds con VITE_PREVIEW=1).
// Uso: iFuel/dist-preview/index.html#/preview?scene=calm|warn|crit|full|compare|edge|replay|container
import React from "react";
import { useSearchParams } from "react-router-dom";
import { Backdrop } from "./Backdrop";
import { FuelWidget, type FuelWidgetProps } from "../components/FuelWidget";
import { FuelWidgetOverlay } from "../components/FuelWidgetOverlay";
import { RelativeWidget } from "../components/StandingBattleWidget";
import { BattlePanel } from "../components/pitboard/BattlePanel";
import { YellowFlagWidget } from "../components/YellowFlagWidget";
import { PitClearAirWidget } from "../components/PitClearAirWidget";
import { RaceStandingsWidget } from "../components/RaceStandingsWidget";
import type { StandingsRow } from "../types/standings";
import { RaceStandingsWidgetContainer } from "../components/RaceStandingsWidgetContainer";
import { ReplayTowerWidget } from "../components/ReplayTowerWidget";
import { DriverFocusWidget } from "../components/DriverFocusWidget";
import { TrackInfoWidget } from "../components/TrackInfoWidget";
import { PitboardLayout } from "../PitboardLayout";
import type { IfuelState } from "../useIfuelWebSocket";

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
const classNames = { 4011: "Hypercar", 2523: "GT3" };

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
  inPit: false, iRating: 2800, incidents: 2, penalty: null,
  carModel: "GT3",
}));

const ahead = { carNum: "27", driverName: "Marco Bellini", gapSeconds: 1.842, lastLap: 108.9, bestLap: 108.4, deltaLastToMe: -0.42, classId: 4011, classPosition: 3 };
const behind = { carNum: "8", driverName: "Jonas Eriksen-Larsen", gapSeconds: -0.874, lastLap: 109.4, bestLap: 108.8, deltaLastToMe: 0.31, classId: 4011, classPosition: 5 };
const onAhead = { carNum: "62", driverName: "Pablo Ruiz", gapSeconds: 4.2, lapsDiff: -1, classId: 2523, classPosition: 1 };
const onBehind = { carNum: "91", driverName: "Liam O Connor", gapSeconds: -6.9, lapsDiff: 0, classId: 4011, classPosition: 6 };

const Standings = () => (
  <RaceStandingsWidget clock={{ time: "8:00", cap: "TIME LEFT", extra: "2 LAPS LEFT", low: false }} rows={rows} myCarNumber="14" classColorIndexById={classColors} classNames={classNames} />
);
const Yellow = ({ on }: { on: boolean }) => (
  <YellowFlagWidget
    warning={
      on
        ? { active: true, distanceMeters: 420, timeSeconds: 6.8, carNum: "33", classId: 4011, classPosition: 5, type: "incident" }
        : { active: false, distanceMeters: null, timeSeconds: null, carNum: null, classId: null, classPosition: null, type: null }
    }
    classColorIndexById={classColors}
    classNames={classNames}
  />
);
const Pit = ({ lap }: { lap: number }) => (
  <PitClearAirWidget
    data={{ suggestedLap: 26, nowScore: 4, nowNearest: { carNum: 12, gapSeconds: 1.1 }, nextPitLap: lap, pitLossSeconds: 45, pitLossMeasured: true, windowStatus: "window", litersNeeded: 46.3, options: [{ lap: 25, trafficScore: 4, nearest: { carNum: 12, gapSeconds: 1.1 } }, { lap: 26, trafficScore: 1, nearest: { carNum: 7, gapSeconds: -2.4 } }, { lap: 27, trafficScore: 3 }, { lap: 28, trafficScore: 0 }] }}
    lapNumber={lap}
    pitWindowStartLap={22}
    pitWindowEndLap={30}
  />
);

const at = (style: React.CSSProperties, child: React.ReactNode) => (
  <div style={{ position: "absolute", ...style }}>{child}</div>
);

function Scene({ scene }: { scene: string }) {
  if (scene === "pitboard") {
    const wave = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => Math.max(0, Math.min(100, Math.round(f(i)))));
    const names47 = ["Alonso Pérez", "Marcus Eriksen-Larsen", "Jean-Baptiste Dubois", "Kimi Tanaka", "Pablo Ruiz", "Liam O Connor", "Sergio Hernández"];
    const big: StandingsRow[] = Array.from({ length: 47 }, (_, i) => ({
      position: i + 1, carNumber: String(i === 32 ? 8 : i + 20), classId: i % 3 === 0 ? 4029 : 4011, driverName: names47[i % names47.length] + " " + (i + 1),
      bestLapTime: 232 + i * 0.4, gapToLeader: i * 2.37, lapsDown: 0, stintLapCount: 5, lastPitDurationSeconds: null, pitStops: 0, inPit: i === 3, carModel: "GTP", iRating: 2500 + i * 90, incidents: i % 5, penalty: i === 6 ? "black" : i === 8 ? "repair" : null,
    }));
    const state = {
      fuel: 18.4, fuelMax: 52, fuelCapacity: 52, lapNumber: 12, lapTime: 107.52, fuelLast: 2.78, fuelAvg: 2.78, fuelAvg2: 2.8, fuelAvg5: 2.78, fuelAvg10: 2.77,
      estLaps: 6.6, estRefuel: 27.5, fuelTime: "11:50", sessionLapsRemainEx: 16, sessionTimeRemain: 1800, airTemp: 24, trackTemp: 31,
      earliestPitLap: 16, totalStops: 1, stintLaps: [16, 12], lapHistoryLast5: hist(2.78, 5), lapHistoryLast30: hist(2.78, 12),
      relativeAhead: ahead, relativeBehind: behind, relativeMyPosition: 4, myBestLapTime: 106.91,
      onTrackAhead: onAhead, onTrackBehind: onBehind, classColorIndexById: { 4011: 0, 4029: 1 }, classNames: { 4011: "GTP", 4029: "LMP2" },
      fuelPlan: { perLap: 2.78, perLapSource: "laps", status: "window", stops: 1, stintLaps: [16, 12], litersToAdd: 27.5, litersNextStop: 27.5, windowStartLap: 14, windowEndLap: 18, remainingLaps: 28 },
      pitClearAir: { suggestedLap: 16, nowScore: 0, nextPitLap: 16, pitLossSeconds: 45, pitLossMeasured: true, windowStatus: "window", litersNeeded: 27.5, options: [{ lap: 15, trafficScore: 2 }, { lap: 16, trafficScore: 0 }, { lap: 17, trafficScore: 1 }] },
      fastTraffic: { carNum: "7", classId: 4029, gapSeconds: 6.2, catchInSeconds: 24, count: 2 },
      weather: { state: "risk", precip: 0, wetness: 1, skies: 3, humidity: 70, windKph: 14, windDir: 1.2 },
      pitHelper: new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("pit") ? { speedKph: 71, limitKph: 60, overKph: 11, limiterOn: true, boxDistM: 85, status: "speeding" } : null,
      standings: big, playerCarNumber: "8", isReplayPlaying: false, lapDistPct: 0.72, onPitRoad: false,
      cars: [["7", 0.12, 60, 3, 4011, 0], ["8", 0.31, 60, 3, 4011, 0], ["33", 0.55, 60, 3, 4011, 0], ["62", 0.81, 55, 3, 2523, 0], ["19", 0.93, 55, 3, 2523, 0], ["91", 0.66, 60, 3, 4011, 0]],
      carData: {
        delta: -0.18, brakeBias: 54.5, tc1: 4, tc2: 2, abs: 3, compound: 0, sectorStarts: [0, 0.33, 0.66],
        sectors: [{ time: 34.12, fresh: true, status: "best" }, { time: 41.8, fresh: true, status: "slower" }, { time: 31.6, fresh: false, status: "slower" }],
        tyres: {
          wear: { lf: [91, 93, 95], rf: [84, 88, 92], lr: [90, 92, 94], rr: [86, 89, 93] },
          temp: { lf: [88, 92, 90], rf: [95, 99, 96], lr: [86, 90, 88], rr: [91, 94, 92] },
          coldPressure: { lf: 165, rf: 165, lr: 158, rr: 158 }, measuredLap: 0, lapsAgo: 12,
        },
      },
      trace: { hz: 20, throttle: wave(160, (i) => 55 + 45 * Math.sin(i / 7)), brake: wave(160, (i) => Math.max(0, 90 * Math.sin(i / 7 + 3.4))) },
      trackName: "Monza", trackLength: "5.79 km", windSpeed: 3, windDirection: "N", rainChance: 0,
    } as unknown as IfuelState;
    return (
      <div className="app-root app-root--pitboard" style={{ position: "absolute", inset: 0 }}>
        <PitboardLayout state={state} raceStandingsRows={big} isConnected={true} sendMessage={() => {}} />
      </div>
    );
  }

  if (scene === "standings") {
    const cls = [4011, 4029, 2523];
    const names = { 4011: "GTP", 4029: "LMP2", 2523: "GT3" };
    const colors = { 4011: 0, 4029: 3, 2523: 1 };
    const many = Array.from({ length: 48 }, (_, i) => {
      const classId = i < 6 ? 4011 : i < 14 ? (i % 2 ? 4029 : 4011) : i < 22 ? 4029 : 2523;
      return {
        position: i + 1, carNumber: String(10 + i), classId: classId === 4011 && i > 9 ? 4029 : classId,
        driverName: `Driver ${i + 1}`, bestLapTime: 200 + i * 0.7, gapToLeader: null, lapsDown: 0,
        stintLapCount: 5 + (i % 4), lastPitDurationSeconds: i % 3 ? 24.8 : null, pitStops: i % 3, inPit: false, carModel: "x", iRating: 3100 - i * 40, incidents: i % 7, penalty: null,
      };
    });
    void cls;
    return (
      <div className="app-root--free" style={{ padding: 30, background: "#3a4658", minHeight: "100vh", width: 640 }}>
        <RaceStandingsWidget clock={{ time: "8:00", cap: "TIME LEFT", extra: "2 LAPS LEFT", low: false }} rows={many} myCarNumber="45" classColorIndexById={colors} classNames={names} />
      </div>
    );
  }
  if (scene === "pca") {
    const o = (lap: number, trafficScore: number, extra: object = {}) => ({ lap, trafficScore, ...extra });
    const base = { pitLossSeconds: 45, pitLossMeasured: true, litersNeeded: 46.3, windowStartLap: 8, windowEndLap: 12 };
    const L = 7;
    return (
      <div className="app-root--free" style={{ display: "grid", gridTemplateColumns: "repeat(2, 420px)", gap: 20, padding: 30, background: "#3a4658", minHeight: "100vh", alignItems: "start" }}>
        <PitClearAirWidget lapNumber={L} pitWindowStartLap={8} pitWindowEndLap={12} data={{ ...base, windowStatus: "window", suggestedLap: 8, nextPitLap: 8, nowScore: 2, options: [o(8, 2, { direct: 1, fastBehind: 1, slowAhead: 2, nearest: { carNum: 42, gapSeconds: -2.1 } }), o(9, 0), o(10, 1)] }} />
        <PitClearAirWidget lapNumber={L} pitWindowStartLap={8} pitWindowEndLap={12} data={{ ...base, windowStatus: "no-stop", suggestedLap: null, options: [] }} />
        <PitClearAirWidget lapNumber={L} pitWindowStartLap={8} pitWindowEndLap={12} data={{ ...base, windowStatus: "critical", suggestedLap: 8, options: [o(8, 0)] }} />
        <PitClearAirWidget lapNumber={L} pitWindowStartLap={8} pitWindowEndLap={12} data={{ ...base, windowStatus: "window", suggestedLap: 10, nextPitLap: 8, nowScore: 3, options: [o(8, 3), o(9, 1), o(10, 0, { nearest: { carNum: 7, gapSeconds: 4.2 } })] }} />
        <PitClearAirWidget lapNumber={L} pitWindowStartLap={8} pitWindowEndLap={12} data={{ ...base, windowStatus: "extra-stop", suggestedLap: 8, nextPitLap: 8, options: [o(8, 1), o(9, 0)] }} />
        <PitClearAirWidget lapNumber={L} pitWindowStartLap={null} pitWindowEndLap={null} data={undefined} />
      </div>
    );
  }
  if (scene === "flags") {
    const w = (o: object) => ({ active: true, distanceMeters: null, timeSeconds: null, carNum: null, classId: null, classPosition: null, type: "incident", ...o }) as never;
    return (
      <div className="app-root--free" style={{ display: "flex", flexDirection: "column", gap: 22, padding: 36, background: "#3a4658", minHeight: "100vh" }}>
        <YellowFlagWidget warning={{ active: false, distanceMeters: null, timeSeconds: null, carNum: null, classId: null, classPosition: null, type: null }} />
        <YellowFlagWidget warning={w({ distanceMeters: 860, timeSeconds: 14.2, carNum: "33", classId: 4011, classPosition: 5 })} classColorIndexById={classColors} classNames={classNames} />
        <YellowFlagWidget warning={w({ distanceMeters: 420, timeSeconds: 6.8, carNum: "33", classId: 4011, classPosition: 5 })} classColorIndexById={classColors} classNames={classNames} />
        <YellowFlagWidget warning={w({ distanceMeters: 95, timeSeconds: 1.6, carNum: "7", classId: 4011, classPosition: 2 })} classColorIndexById={classColors} classNames={classNames} />
        <YellowFlagWidget warning={w({ type: "debris" })} />
      </div>
    );
  }
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
      {at({ left: "50%", transform: "translateX(-50%)", bottom: 36 }, <div className="pb-scope pb-scope--overlay"><BattlePanel ahead={ahead} behind={behind} myPosition={4} myLastLap={109.2} myBestLap={108.95} onTrackAhead={onAhead} onTrackBehind={onBehind} classColorIndexById={classColors} classNames={classNames} /></div>)}
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
