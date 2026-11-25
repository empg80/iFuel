// src/components/ReplayBroadcast.tsx
// Layout de replay estilo retransmisión: torre de tiempos, circuito y datos del coche en pantalla.
import { shortDriverName } from "../utils/driverName";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { StandingsRow } from "../types/standings";
import type { IfuelState } from "../useIfuelWebSocket";
import { formatLapTimeSeconds } from "../utils/relativeFormat";
import { battleFor, fastestLapCar, gapTrend, positionChange, tyreLetter, type Trend } from "../utils/replayData";
import type { ReplayDesign, ReplayGapMode } from "../utils/replayStyle";
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


/* ---------- Torre (modelo común a los tres diseños) ---------- */
type TowerProps = {
  state: IfuelState;
  rows: StandingsRow[];
  focusCar: string | null;
  seriesName: string;
  phaseSeconds?: number;
  design: ReplayDesign;
  gapMode: ReplayGapMode;
};

const norm = (n: string) => n.replace(/^#/, "").replace(/^0+(?=\d)/, "");

function shortCode(full: string): string {
  const p = (full || "").trim().split(/\s+/);
  return (p[p.length - 1] || "").slice(0, 3).toUpperCase();
}

/** Posición de cada coche la primera vez que se ve; se reinicia si el replay retrocede o cambia la sesión. */
function usePositionBaseline(rows: StandingsRow[], elapsed: number | null | undefined, sessionKey: string) {
  const ref = useRef<{ map: Map<string, number>; last: number; key: string }>({ map: new Map(), last: 0, key: "" });
  const r = ref.current;
  const e = elapsed ?? 0;
  if (r.key !== sessionKey || e < r.last - 5) {
    r.map = new Map();
    r.key = sessionKey;
  }
  r.last = e;
  for (const row of rows) {
    const k = norm(row.carNumber);
    if (!r.map.has(k) && row.position > 0) r.map.set(k, row.position);
  }
  return r.map;
}

function useTowerModel(p: TowerProps) {
  const { state, rows, focusCar, phaseSeconds = 10 } = p;
  const focusRow = focusCar ? rows.find((r) => norm(r.carNumber) === norm(focusCar)) : undefined;
  const focusClass = focusRow?.classId ?? null;

  const phases = useMemo(() => buildPhases(rows), [rows]);
  const phaseKeys = phases.map((x) => x.key).join("|");
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
  const baseline = usePositionBaseline(rows, state.sessionElapsed, `${state.trackName ?? ""}|${state.sessionName ?? ""}`);
  const vr = useMemo(() => fastestLapCar(rows), [rows]);

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
  const phaseColor = phase.classId != null ? colorOf(phase.classId) : "var(--bc-cyan)";

  const isFocus = (r: TowerRow) => !!focusCar && norm(r.carNumber) === norm(focusCar);
  const gapOf = (r: TowerRow) => (p.gapMode === "interval" ? r.intervalText : r.gapText);

  return { phases, idx, phase, durMs, list, baseline, vr, colorOf, className, timeText, lapText, phaseColor, isFocus, gapOf };
}

const FlagBar: React.FC<{ state: IfuelState }> = ({ state }) => (
  <div className={`bc-flag bc-flag--${state.yellowWarning?.active ? "yellow" : "green"}`} />
);

const Badges: React.FC<{ r: TowerRow; vr: string | null }> = ({ r, vr }) => {
  const t = tyreLetter(r.tireName);
  return (
    <>
      {vr != null && norm(r.carNumber) === vr && <span className="bc-tag bc-tag--vr">VR</span>}
      {r.inPit ? <span className="bc-tag bc-tag--pit">PIT</span> : t && <span className={`bc-tag bc-tag--t${t}`}>{t}</span>}
    </>
  );
};

const Change: React.FC<{ r: TowerRow; baseline: Map<string, number> }> = ({ r, baseline }) => {
  const d = positionChange(baseline.get(norm(r.carNumber)), r.position);
  if (d === 0) return <span className="bc-ar bc-ar--eq">–</span>;
  return <span className={`bc-ar ${d > 0 ? "bc-ar--up" : "bc-ar--dn"}`}>{d > 0 ? `▲${d}` : `▼${-d}`}</span>;
};

/** Scroll muy suave de un contenedor (ping-pong) solo si hace falta. */
function useAutoScroll(ref: React.RefObject<HTMLDivElement | null>, axis: "y" | "x", active: boolean, resetKey: string) {
  useEffect(() => {
    const el = ref.current;
    if (el) { el.scrollTop = 0; el.scrollLeft = 0; }
    if (!active) return;
    let dir = 1;
    let pause = 0;
    const iv = setInterval(() => {
      const e = ref.current;
      if (!e) return;
      const max = axis === "y" ? e.scrollHeight - e.clientHeight : e.scrollWidth - e.clientWidth;
      if (max <= 0) return;
      if (pause > 0) { pause -= 1; return; }
      const cur = (axis === "y" ? e.scrollTop : e.scrollLeft) + 0.4 * dir;
      const v = Math.min(max, Math.max(0, cur));
      if (axis === "y") e.scrollTop = v; else e.scrollLeft = v;
      if (v >= max) { dir = -1; pause = 60; } else if (v <= 0) { dir = 1; pause = 60; }
    }, 30);
    return () => clearInterval(iv);
  }, [resetKey, active, axis]);
}

const TowerHeader: React.FC<{ state: IfuelState; seriesName: string; m: ReturnType<typeof useTowerModel>; gapMode: ReplayGapMode; compact?: boolean }> = ({ state, seriesName, m, gapMode, compact }) => (
  <>
    <div className="bc-tower__head">
      <div className="bc-slot bc-slot--logo" data-slot="logo">logo</div>
      <div className="bc-tower__title">
        <div className="bc-tower__a">{seriesName || state.trackName || "iFuel"}</div>
        <div className="bc-tower__b">
          {sessionLabel(state.sessionType, state.sessionName)}
          {seriesName && state.trackName ? ` · ${state.trackName}` : ""}
          {!compact ? (gapMode === "interval" ? " · Interval" : " · Líder") : ""}
        </div>
      </div>
      <FlagBar state={state} />
    </div>
    <div className="bc-tower__time">
      <span>{m.timeText}</span>
      <span>{m.lapText}</span>
    </div>
  </>
);

/* ---------- Torre: diseños "tv" y "pylon" (columna vertical) ---------- */
const TowerColumn: React.FC<TowerProps> = (p) => {
  const m = useTowerModel(p);
  const { state } = p;
  const pylon = p.design === "pylon";
  const pinned = m.list.length > TOWER_MAX_ROWS ? m.list.slice(0, TOWER_PINNED) : m.list;
  const rest = m.list.length > TOWER_MAX_ROWS ? m.list.slice(TOWER_PINNED) : [];
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useAutoScroll(scrollRef, "y", rest.length > 0, m.phase.key);

  const renderRow = (r: TowerRow) => (
    <div
      key={r.carNumber}
      className={"bc-row" + (m.isFocus(r) ? " is-focus" : "")}
      style={{ ["--cc" as string]: m.colorOf(r.classId) } as CSSProperties}
    >
      <span className="bc-row__pos">{r.shownPos}</span>
      <Change r={r} baseline={m.baseline} />
      <span className="bc-row__cls" />
      {!pylon && <span className="bc-row__num">{r.carNumber}</span>}
      <span className="bc-row__name">{pylon ? shortCode(r.driverName) : shortDriverName(r.driverName)}</span>
      {!pylon && <Badges r={r} vr={m.vr} />}
      {pylon && r.inPit && <span className="bc-tag bc-tag--pit">PIT</span>}
      <span className="bc-row__gap">{m.gapOf(r)}</span>
    </div>
  );

  return (
    <div className="bc-tower bc-cn" style={{ ["--ph" as string]: m.phaseColor } as CSSProperties}>
      <TowerHeader state={state} seriesName={p.seriesName} m={m} gapMode={p.gapMode} compact={pylon} />
      {m.phases.length > 1 && (
        <>
          <div className="bc-phases">
            {m.phases.map((ph, i) => (
              <span
                key={ph.key}
                className={i === m.idx ? "on" : ""}
                style={i === m.idx ? ({ background: ph.classId != null ? m.colorOf(ph.classId) : "var(--bc-cyan)" } as CSSProperties) : undefined}
              >
                {m.className(ph.classId)}
              </span>
            ))}
          </div>
          <div className="bc-phasebar">
            <i key={`${m.phase.key}-${m.idx}`} style={{ animationDuration: `${m.durMs}ms` }} />
          </div>
        </>
      )}
      <div key={m.phase.key} className={"bc-tower__list" + (rest.length ? " has-scroll" : "")}>
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

/* ---------- Torre: diseño "ribbon" (cinta inferior + bloque de sesión arriba) ---------- */
const TowerRibbon: React.FC<TowerProps> = (p) => {
  const m = useTowerModel(p);
  const { state } = p;
  const pinned = m.list.slice(0, TOWER_PINNED);
  const rest = m.list.slice(TOWER_PINNED);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useAutoScroll(scrollRef, "x", rest.length > 0, m.phase.key);

  const chip = (r: TowerRow) => (
    <div
      key={r.carNumber}
      className={"bc-chip" + (m.isFocus(r) ? " is-focus" : "")}
      style={{ ["--cc" as string]: m.colorOf(r.classId) } as CSSProperties}
    >
      <span className="bc-chip__pos">{r.shownPos}</span>
      <span className="bc-chip__cls" />
      <span>{shortCode(r.driverName)}</span>
      <Change r={r} baseline={m.baseline} />
      <Badges r={r} vr={m.vr} />
      <span className="bc-chip__gap">{m.gapOf(r)}</span>
    </div>
  );

  return (
    <>
      <div className="bc-session bc-cn">
        <div className="bc-slot bc-slot--logo" data-slot="logo">logo</div>
        <div className="bc-session__txt">
          <div className="bc-tower__a">{p.seriesName || state.trackName || "iFuel"}</div>
          <div className="bc-session__b">
            {sessionLabel(state.sessionType, state.sessionName)} · {m.timeText}
            {m.lapText ? ` · ${m.lapText}` : ""}
          </div>
        </div>
        <FlagBar state={state} />
      </div>
      <div className="bc-ribbon bc-cn" style={{ ["--ph" as string]: m.phaseColor } as CSSProperties}>
        {m.phases.length > 1 && (
          <div className="bc-ribbon__bar">
            <i key={`${m.phase.key}-${m.idx}`} style={{ animationDuration: `${m.durMs}ms` }} />
          </div>
        )}
        <div className="bc-ribbon__lbl" style={{ background: m.phase.classId != null ? m.colorOf(m.phase.classId) : undefined }}>
          {m.className(m.phase.classId)}
          <small>{p.gapMode === "interval" ? "Interval" : "Líder"}</small>
        </div>
        <div key={m.phase.key} className="bc-ribbon__list">
          <div className="bc-ribbon__pin">{pinned.map(chip)}</div>
          <div className="bc-ribbon__scroll" ref={scrollRef}>{rest.map(chip)}</div>
        </div>
      </div>
    </>
  );
};

export const BroadcastTower: React.FC<TowerProps> = (p) =>
  p.design === "ribbon" ? <TowerRibbon {...p} /> : <TowerColumn {...p} />;

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
type Sample = { t: number; gap: number };

/** Historial de huecos (ventana de ~8 s de la sesión) para saber si el hueco se cierra o se abre. */
function useGapSamples(key: string, gap: number | null, now: number) {
  const ref = useRef<{ key: string; list: Sample[] }>({ key: "", list: [] });
  const r = ref.current;
  if (r.key !== key || (r.list.length && now < r.list[r.list.length - 1].t - 2)) {
    r.key = key;
    r.list = [];
  }
  if (gap != null && (!r.list.length || now - r.list[r.list.length - 1].t >= 0.5)) {
    r.list.push({ t: now, gap });
    while (r.list.length && now - r.list[0].t > 8) r.list.shift();
  }
  return r.list;
}

const TREND_TXT: Record<Trend, string> = { closing: "acercándose", opening: "alejándose", flat: "" };

const BattleSide: React.FC<{ kind: "ahead" | "behind"; car: { carNumber: string; name: string; gap: number | null } | null; now: number }> = ({ kind, car, now }) => {
  const samples = useGapSamples(`${kind}-${car?.carNumber ?? ""}`, car?.gap ?? null, now);
  if (!car) return <div className="bc-battle__side bc-battle__side--empty">{kind === "ahead" ? "Sin coche delante" : "Sin coche detrás"}</div>;
  const trend = gapTrend(samples, now, car.gap);
  // delante: acercarse es bueno; detrás: acercarse es amenaza
  const good = kind === "ahead" ? trend === "closing" : trend === "opening";
  const bad = kind === "ahead" ? trend === "opening" : trend === "closing";
  const cls = trend === "flat" ? "" : good ? "is-good" : bad ? "is-bad" : "";
  return (
    <div className={`bc-battle__side ${cls}`}>
      <span>{kind === "ahead" ? "▲" : "▼"} {car.name}</span>
      <b>{car.gap == null ? "--" : `${kind === "ahead" ? "−" : "+"}${car.gap.toFixed(1)}`}</b>
      <em>{TREND_TXT[trend]}</em>
    </div>
  );
};

export const BroadcastCar: React.FC<{ state: IfuelState; rows: StandingsRow[] }> = ({ state, rows }) => {
  const cam = state.cameraDriver ?? null;
  const battle = useMemo(() => battleFor(rows, cam?.carNumber ?? null), [rows, cam?.carNumber]);
  if (!cam) return null;
  const row = rows.find((r) => norm(r.carNumber) === norm(cam.carNumber));
  const model = row?.carModel || cam.carModel || "";
  const best = cam.bestLapSeconds ?? row?.bestLapTime ?? null;
  const tire = cam.tireName || row?.tireName || null;
  const last = cam.lastLapSeconds ?? null;
  const stops = row?.pitStops ?? 0;
  const now = state.sessionElapsed ?? 0;
  return (
    <div className="bc-carwrap bc-cn">
      <div className="bc-battle">
        <BattleSide kind="ahead" car={battle.ahead} now={now} />
        <BattleSide kind="behind" car={battle.behind} now={now} />
      </div>
      <div className="bc-car">
        <div className="bc-car__pos"><small>POS</small>{cam.position > 0 ? cam.position : "--"}</div>
        <div className="bc-car__num">{cam.carNumber.replace(/^#/, "")}</div>
        <div className="bc-car__name">
          <div className="bc-car__a">{cam.driverName}</div>
          <div className="bc-car__b">{carLabel(model)}</div>
        </div>
        <div className="bc-car__stats">
          <div><small>KM/H</small><b>{cam.speedKph != null ? cam.speedKph : "--"}</b></div>
          <div className="bc-car__opt"><small>MEJOR</small><b>{best != null ? formatLapTimeSeconds(best) : "--"}</b></div>
          <div><small>ÚLTIMA</small><b>{last != null ? formatLapTimeSeconds(last) : "--"}</b></div>
          <div className="bc-car__opt"><small>NEUM.</small><b>{tire ?? "--"}</b></div>
          <div className={cam.onPitRoad ? "bc-car__pit" : ""}>
            <small>BOX</small>
            <b>{cam.onPitRoad ? "EN BOX" : stops > 0 ? `${stops} ${stops === 1 ? "parada" : "paradas"}` : "Sin parar"}</b>
          </div>
        </div>
      </div>
    </div>
  );
};
