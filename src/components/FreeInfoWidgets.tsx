import React, { useEffect, useRef, useState } from "react";
import type { IfuelState } from "../useIfuelWebSocket";
import type { StandingsRow } from "../types/standings";
import { useOverlayState } from "../contexts/useOverlayState";
import { FloatingWidget } from "./FloatingWidget";
import { WeatherStrip } from "./pitboard/WeatherStrip";
import { TyresStrip } from "./pitboard/TyresStrip";
import { CarSettings } from "./pitboard/CarSettings";
import { clockStr, deltaStr, lapStr, secStr } from "./pitboard/fmt";

type Props = { state: IfuelState | null; rows: StandingsRow[] };

type Sample = { t: number; wet: number; rain: number; chance: number };
const WINDOW_MS = 20 * 60 * 1000;

/** iRacing no ofrece radar: se dibuja la tendencia de los últimos 20 min (pista mojada, lluvia y probabilidad). */
const WeatherTrend: React.FC<{ state: IfuelState }> = ({ state }) => {
  const [samples, setSamples] = useState<Sample[]>([]);
  const latest = useRef<Sample | null>(null);
  const w = state.weather;
  latest.current = w ? {
    t: Date.now(),
    wet: Math.min(1, Math.max(0, (w.wetness - 1) / 6)),
    rain: Math.min(1, Math.max(0, w.precip ?? 0)),
    chance: Math.min(1, Math.max(0, (state.rainChance ?? 0) / 100)),
  } : null;
  useEffect(() => {
    const push = () => {
      const s = latest.current;
      if (!s) return;
      setSamples((prev) => [...prev.filter((x) => s.t - x.t < WINDOW_MS), s]);
    };
    push();
    const id = setInterval(push, 10000);
    return () => clearInterval(id);
  }, []);
  if (samples.length < 2) return null;
  const W = 400, H = 46;
  const t0 = samples[samples.length - 1].t - WINDOW_MS;
  const x = (t: number) => ((t - t0) / WINDOW_MS) * W;
  const line = (k: "wet" | "rain" | "chance") => samples.map((s, i) => `${i ? "L" : "M"}${x(s.t).toFixed(1)},${(H - 3 - s[k] * (H - 8)).toFixed(1)}`).join(" ");
  return (
    <svg className="fw-trend" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-label="Tendencia del clima, últimos 20 minutos">
      <path d={line("chance")} fill="none" stroke="#ffb547" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d={line("wet")} fill="none" stroke="#5aa9ff" strokeWidth="2" />
      <path d={line("rain")} fill="none" stroke="#ffffff" strokeWidth="1.5" />
      <text x="6" y="11" fontSize="10" fill="#93a1b5">20 min · <tspan fill="#5aa9ff">mojado</tspan> · <tspan fill="#fff">lluvia</tspan> · <tspan fill="#ffb547">prob.</tspan></text>
    </svg>
  );
};

/** Datos del pitboard que el layout libre no tenía: piloto (posición, incidentes, vueltas, sectores), clima, neumáticos y ajustes. */
export const FreeInfoWidgets: React.FC<Props> = ({ state, rows }) => {
  const o = useOverlayState();
  if (!state) return null;
  const me = state.playerCarNumber ?? null;
  const myRow = me != null ? rows.find((r) => String(r.carNumber) === me) : undefined;
  const car = state.carData ?? null;
  const remain = state.sessionLapsRemainEx ?? null;
  const lap = state.lapNumber ?? null;
  const t = state.sessionTimeRemain;
  const timeLeft = t != null && t > 0 && t < 90000 ? t : null;
  const record = state.trackHistory?.best?.race ?? state.trackHistory?.best?.quali ?? state.trackHistory?.best?.practice ?? null;
  const inc = myRow?.incidents ?? null;
  const delta = car?.delta ?? null;
  const sectors = car?.sectors ?? [];
  const cell = (label: string, value: React.ReactNode, cls = "") => (
    <div className="fw-cell"><span className="pb-lbl">{label}</span><b className={`pb-num ${cls}`}>{value}</b></div>
  );
  const hasCarData = !!car && (car.tyres || car.brakeBias || car.tc1 != null || car.tc2 != null || car.abs != null);

  return (
    <>
      <FloatingWidget id="driver" visible={o.driverVisible ?? true} scale={o.driverScale ?? 1} defaultPos={{ x: 40, y: 330 }}>
        <div className="pb-panel fw-driver">
          <div className="fw-row">
            {cell("Pos", <>{myRow?.position ?? "–"}{rows.length ? <small>/{rows.length}</small> : null}</>, "fw-me")}
            {inc != null && inc >= 0 && cell("Inc", <>{inc}<small>x</small></>, inc >= 12 ? "pb-bad" : "")}
            {cell("Vuelta", lap ?? "–")}
            {timeLeft != null ? cell("Tiempo", clockStr(timeLeft)) : remain != null && remain >= 0 && remain < 32767 ? cell("Restan", `${remain} v`) : null}
          </div>
          <div className="fw-row">
            {cell("Última", lapStr(state.lapTime ?? null))}
            {cell("Mejor", lapStr(state.myBestLapTime ?? null), "pb-best")}
            {record != null && cell("Récord", lapStr(record))}
            {cell("Delta", deltaStr(delta), delta == null ? "" : delta < 0 ? "pb-good" : delta > 0 ? "pb-bad" : "")}
          </div>
          <div className="fw-row">
            {[0, 1, 2].map((i) => {
              const s = sectors[i];
              const cls = !s || s.time == null ? "" : s.status === "best" ? "pb-best" : "pb-warn";
              return <div key={i} className={`fw-cell ${s?.fresh ? "" : "pb-dim"}`}><span className="pb-lbl">S{i + 1}</span><b className={`pb-num ${cls}`}>{secStr(s?.time)}</b></div>;
            })}
          </div>
        </div>
      </FloatingWidget>

      <FloatingWidget id="weather" visible={o.weatherVisible ?? true} scale={o.weatherScale ?? 1} defaultPos={{ x: 40, y: 500 }}>
        <div className="fw-weather">
          <WeatherStrip weather={state.weather} rainChance={state.rainChance ?? null} trackTemp={state.trackTemp ?? null} airTemp={state.airTemp ?? null} />
          <WeatherTrend state={state} />
        </div>
      </FloatingWidget>

      <FloatingWidget id="car" visible={(o.carVisible ?? false) && !!hasCarData} scale={o.carScale ?? 1} defaultPos={{ x: 40, y: 580 }}>
        <div className="fw-car">
          <TyresStrip tyres={car?.tyres ?? null} compound={car?.compound ?? null} />
          <CarSettings car={car} />
        </div>
      </FloatingWidget>
    </>
  );
};
