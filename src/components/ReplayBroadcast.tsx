// src/components/ReplayBroadcast.tsx
// Layout de replay estilo retransmisión: torre de tiempos, circuito y datos del coche en pantalla.
import React, { useMemo } from "react";
import type { CSSProperties } from "react";
import type { StandingsRow } from "../types/standings";
import type { IfuelState } from "../useIfuelWebSocket";
import { formatLapTimeSeconds, formatLeaderGap } from "../utils/relativeFormat";

const TOWER_ROWS = 10;

export function fmtClock(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return "--:--";
  const t = Math.floor(sec);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60).toString().padStart(2, "0");
  const s = (t % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

export function fmtTimeOfDay(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return "--:--";
  const t = ((Math.floor(sec) % 86400) + 86400) % 86400;
  const h = Math.floor(t / 3600).toString().padStart(2, "0");
  const m = Math.floor((t % 3600) / 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function sessionLabel(type: string | null | undefined, name: string | null | undefined): string {
  const t = `${type ?? ""} ${name ?? ""}`.toLowerCase();
  if (/race|carrera/.test(t)) return "Carrera";
  if (/qual|clasif/.test(t)) return "Clasificación";
  if (/practice|libre|test/.test(t)) return "Práctica";
  return name || type || "Sesión";
}

export function gearLabel(g: number | null | undefined): string {
  if (g == null) return "--";
  if (g < 0) return "R";
  if (g === 0) return "N";
  return String(g);
}

// "mercedesamggt4" -> "Mercedes Amggt4" no aporta; se deja el nombre tal cual si viene legible.
function carLabel(path: string): string {
  return path.replace(/[_-]+/g, " ").trim();
}

function shortName(full: string): string {
  const p = (full || "").trim().split(/\s+/);
  if (p.length <= 1) return p[0] ?? "";
  return `${p[0].charAt(0).toUpperCase()}. ${p[p.length - 1]}`;
}

/* ---------- Torre ---------- */
type TowerProps = {
  state: IfuelState;
  rows: StandingsRow[];
  focusCar: string | null;
  seriesName: string;
};

export const BroadcastTower: React.FC<TowerProps> = ({ state, rows, focusCar, seriesName }) => {
  const sorted = useMemo(() => [...rows].sort((a, b) => a.position - b.position), [rows]);
  const sameCar = (r: StandingsRow) =>
    !!focusCar && r.carNumber.replace(/^0+/, "") === focusCar.replace(/^0+/, "");
  const top = sorted.slice(0, TOWER_ROWS);
  const focusRow = sorted.find(sameCar);
  const extra = focusRow && !top.includes(focusRow) ? focusRow : null;

  const color = (classId: number): string => {
    const idx = state.classColorIndexById?.[classId];
    return idx == null ? "#5b6b86" : `var(--class-${((idx % 6) + 6) % 6}, #5b6b86)`;
  };

  const total = state.sessionTimeTotal;
  const hasTime = total != null && total > 0 && total < 86400;
  const lapsTotal = state.sessionLapsTotal;
  const hasLaps = lapsTotal != null && lapsTotal > 0 && lapsTotal < 32000;
  const remainLaps = state.sessionLapsRemainEx;
  const lapNow =
    hasLaps && remainLaps != null && remainLaps >= 0 && remainLaps < 32000
      ? Math.min(lapsTotal as number, (lapsTotal as number) - remainLaps + 1)
      : null;

  const timeText = hasTime
    ? `Tiempo ${fmtClock(state.sessionElapsed)} / ${fmtClock(total)}`
    : state.sessionTimeRemain != null && state.sessionTimeRemain > 0 && state.sessionTimeRemain < 86400
      ? `Quedan ${fmtClock(state.sessionTimeRemain)}`
      : "Sesión";
  const lapText = hasLaps && lapNow != null ? `Vuelta ${lapNow}/${lapsTotal}` : "";

  const flag = state.yellowWarning?.active ? "yellow" : "green";

  const renderRow = (r: StandingsRow) => (
    <div
      key={`${r.position}-${r.carNumber}`}
      className={"bc-row" + (sameCar(r) ? " is-focus" : "")}
      style={{ ["--cc" as string]: color(r.classId) } as CSSProperties}
    >
      <span className="bc-row__pos">{r.position}</span>
      <span className="bc-row__cls" />
      <span className="bc-row__num">{r.carNumber}</span>
      <span className="bc-row__name">{shortName(r.driverName)}</span>
      <span className="bc-row__gap">{r.position === 1 ? "Líder" : formatLeaderGap(r.gapToLeader, r.lapsDown)}</span>
    </div>
  );

  return (
    <div className="bc-tower bc-cn">
      <div className="bc-tower__head">
        <div className="bc-slot bc-slot--logo" data-slot="logo">logo</div>
        <div className="bc-tower__title">
          <div className="bc-tower__a">{seriesName || state.trackName || "iFuel"}</div>
          <div className="bc-tower__b">
            {sessionLabel(state.sessionType, state.sessionName)}
            {seriesName && state.trackName ? ` · ${state.trackName}` : ""}
          </div>
        </div>
        <div className={`bc-flag bc-flag--${flag}`} />
      </div>
      <div className="bc-tower__time">
        <span>{timeText}</span>
        <span>{lapText}</span>
      </div>
      {top.map(renderRow)}
      {extra && (
        <>
          <div className="bc-row bc-row--sep">···</div>
          {renderRow(extra)}
        </>
      )}
    </div>
  );
};

/* ---------- Circuito ---------- */
export const BroadcastCircuit: React.FC<{ state: IfuelState }> = ({ state }) => {
  const t = (v: number | null | undefined) => (v == null ? "--°" : `${Math.round(v)}°`);
  const wind = state.windSpeed == null ? "--" : `${Math.round(state.windSpeed)} km/h`;
  const rain = state.rainChance == null ? "--%" : `${Math.round(state.rainChance)}%`;
  return (
    <div className="bc-circuit bc-cn">
      <div className="bc-circuit__head">
        <div className="bc-circuit__a">{state.trackName || "Circuito"}</div>
        <div className="bc-circuit__b">{state.trackLength || ""}</div>
      </div>
      <div className="bc-circuit__map">
        <div className="bc-slot bc-slot--map" data-slot="map">trazado del circuito</div>
      </div>
      <div className="bc-circuit__grid">
        <div>Aire<b>{t(state.airTemp)}</b></div>
        <div>Pista<b>{t(state.trackTemp)}</b></div>
        <div>Viento<b>{wind}</b></div>
        <div>Lluvia<b>{rain}</b></div>
      </div>
      <div className="bc-circuit__clock">
        <span>Hora local</span>
        <span>{fmtTimeOfDay(state.sessionTimeOfDay)}</span>
      </div>
    </div>
  );
};

/* ---------- Coche en pantalla ---------- */
export const BroadcastCar: React.FC<{ state: IfuelState; rows: StandingsRow[] }> = ({ state, rows }) => {
  const cam = state.cameraDriver ?? null;
  const row = cam ? rows.find((r) => r.carNumber.replace(/^0+/, "") === cam.carNumber.replace(/^0+/, "")) : null;
  if (!cam) return null;
  const model = row?.carModel || cam.carModel || "";
  const best = cam.bestLapSeconds ?? row?.bestLapTime ?? null;
  const tire = cam.tireName || row?.tireName || null;
  return (
    <div className="bc-car bc-cn">
      <div className="bc-car__pos"><small>POS</small>{cam.position > 0 ? cam.position : "--"}</div>
      <div className="bc-car__num">{cam.carNumber.replace(/^#/, "")}</div>
      <div className="bc-car__name">
        <div className="bc-car__a">{cam.driverName}</div>
        <div className="bc-car__b">
          {carLabel(model)}
          {best != null ? ` · Mejor ${formatLapTimeSeconds(best)}` : ""}
        </div>
      </div>
      <div className="bc-car__stats">
        <div><small>KM/H</small><b>{cam.speedKph != null ? cam.speedKph : "--"}</b></div>
        <div><small>MARCHA</small><b>{gearLabel(cam.gear)}</b></div>
        <div><small>RPM</small><b>{cam.rpm != null ? cam.rpm.toLocaleString("es-ES") : "--"}</b></div>
        <div><small>NEUM.</small><b>{tire ?? "--"}</b></div>
        {cam.onPitRoad && <div className="bc-car__pit"><b>PIT</b></div>}
      </div>
    </div>
  );
};
