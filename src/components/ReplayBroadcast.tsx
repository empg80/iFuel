// src/components/ReplayBroadcast.tsx
// Layout de replay estilo retransmisión: torre de tiempos, circuito y datos del coche en pantalla.
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { StandingsRow } from "../types/standings";
import type { IfuelState } from "../useIfuelWebSocket";
import { formatLapTimeSeconds } from "../utils/relativeFormat";
import { TOWER_MAX_ROWS, TOWER_PINNED, buildPhases, phaseDurationMs, phaseRows, type TowerRow } from "../utils/towerPhases";

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
  phaseSeconds?: number;
};

export const BroadcastTower: React.FC<TowerProps> = ({ state, rows, focusCar, seriesName, phaseSeconds = 10 }) => {
  const norm = (n: string) => n.replace(/^0+/, "");
  const focusRow = focusCar ? rows.find((r) => norm(r.carNumber) === norm(focusCar)) : undefined;
  const focusClass = focusRow?.classId ?? null;

  const phases = useMemo(() => buildPhases(rows), [rows]);
  const phaseKeys = phases.map((p) => p.key).join("|");
  const [phaseIdx, setPhaseIdx] = useState(0);
  const idx = phaseIdx < phases.length ? phaseIdx : 0;
  const phase = phases[idx];
  const durMs = phaseDurationMs(phaseSeconds, phase, focusClass);

  useEffect(() => {
    if (phases.length <= 1) return;
    const t = setTimeout(() => setPhaseIdx((i) => (i + 1) % phases.length), durMs);
    return () => clearTimeout(t);
  }, [idx, durMs, phaseKeys, phases.length]);

  const list = useMemo(() => phaseRows(rows, phase), [rows, phase]);
  const pinned = list.length > TOWER_MAX_ROWS ? list.slice(0, TOWER_PINNED) : list;
  const rest = list.length > TOWER_MAX_ROWS ? list.slice(TOWER_PINNED) : [];

  // scroll muy suave del resto (solo si hay más de 20 coches en la fase)
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
    if (rest.length === 0) return;
    let dir = 1;
    let pause = 0;
    const iv = setInterval(() => {
      const e = scrollRef.current;
      if (!e) return;
      const max = e.scrollHeight - e.clientHeight;
      if (max <= 0) return;
      if (pause > 0) { pause -= 1; return; }
      e.scrollTop += 0.4 * dir;
      if (e.scrollTop >= max) { e.scrollTop = max; dir = -1; pause = 60; }
      else if (e.scrollTop <= 0) { e.scrollTop = 0; dir = 1; pause = 60; }
    }, 30);
    return () => clearInterval(iv);
  }, [phase.key, rest.length > 0]);

  const colorOf = (classId: number): string => {
    const i = state.classColorIndexById?.[classId];
    return i == null ? "#5b6b86" : `var(--class-${((i % 6) + 6) % 6}, #5b6b86)`;
  };
  const className = (classId: number | null): string =>
    classId == null ? "General" : (state.classNames?.[classId] ?? `Clase ${classId}`);

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
  const phaseColor = phase.classId != null ? colorOf(phase.classId) : "#22d3ee";

  const renderRow = (r: TowerRow) => (
    <div
      key={`${r.carNumber}`}
      className={"bc-row" + (!!focusCar && norm(r.carNumber) === norm(focusCar) ? " is-focus" : "")}
      style={{ ["--cc" as string]: colorOf(r.classId) } as CSSProperties}
    >
      <span className="bc-row__pos">{r.shownPos}</span>
      <span className="bc-row__cls" />
      <span className="bc-row__num">{r.carNumber}</span>
      <span className="bc-row__name">{shortName(r.driverName)}</span>
      <span className="bc-row__gap">{r.gapText}</span>
    </div>
  );

  return (
    <div className="bc-tower bc-cn" style={{ ["--ph" as string]: phaseColor } as CSSProperties}>
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
      {phases.length > 1 && (
        <>
          <div className="bc-phases">
            {phases.map((p, i) => (
              <span
                key={p.key}
                className={i === idx ? "on" : ""}
                style={i === idx ? ({ background: p.classId != null ? colorOf(p.classId) : "#22d3ee" } as CSSProperties) : undefined}
              >
                {className(p.classId)}
              </span>
            ))}
          </div>
          <div className="bc-phasebar">
            <i key={`${phase.key}-${idx}`} style={{ animationDuration: `${durMs}ms` }} />
          </div>
        </>
      )}
      <div key={phase.key} className={"bc-tower__list" + (rest.length ? " has-scroll" : "")}>
        <div className={rest.length ? "bc-pin" : ""}>{pinned.map(renderRow)}</div>
        {rest.length > 0 && (
          <div className="bc-scroll" ref={scrollRef}>
            {rest.map(renderRow)}
          </div>
        )}
      </div>
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
  const last = cam.lastLapSeconds ?? null;
  const stops = row?.pitStops ?? 0;
  return (
    <div className="bc-car bc-cn">
      <div className="bc-car__pos"><small>POS</small>{cam.position > 0 ? cam.position : "--"}</div>
      <div className="bc-car__num">{cam.carNumber.replace(/^#/, "")}</div>
      <div className="bc-car__name">
        <div className="bc-car__a">{cam.driverName}</div>
        <div className="bc-car__b">
          {carLabel(model)}
        </div>
      </div>
      <div className="bc-car__stats">
        <div><small>KM/H</small><b>{cam.speedKph != null ? cam.speedKph : "--"}</b></div>
        <div><small>MEJOR</small><b>{best != null ? formatLapTimeSeconds(best) : "--"}</b></div>
        <div><small>ÚLTIMA</small><b>{last != null ? formatLapTimeSeconds(last) : "--"}</b></div>
        <div><small>NEUM.</small><b>{tire ?? "--"}</b></div>
        <div className={cam.onPitRoad ? "bc-car__pit" : ""}>
          <small>BOX</small>
          <b>{cam.onPitRoad ? "EN BOX" : stops > 0 ? `${stops} ${stops === 1 ? "parada" : "paradas"}` : "Sin parar"}</b>
        </div>
      </div>
    </div>
  );
};
