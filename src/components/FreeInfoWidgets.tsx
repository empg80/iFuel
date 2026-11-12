import React, { useEffect, useRef, useState } from "react";
import type { IfuelState } from "../useIfuelWebSocket";
import type { StandingsRow } from "../types/standings";
import { useOverlayState } from "../contexts/useOverlayState";
import { FloatingWidget } from "./FloatingWidget";
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
  const W = 372, H = 44;
  const t0 = samples[samples.length - 1].t - WINDOW_MS;
  const x = (t: number) => ((t - t0) / WINDOW_MS) * W;
  const line = (k: "wet" | "rain" | "chance") => samples.map((s, i) => `${i ? "L" : "M"}${x(s.t).toFixed(1)},${(H - 3 - s[k] * (H - 8)).toFixed(1)}`).join(" ");
  return (
    <svg className="fw-trend" width="100%" height={H} viewBox={`0 0 ${W} ${H}`} aria-label="Tendencia del clima, últimos 20 minutos">
      <path d={line("chance")} fill="none" stroke="#ffb547" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d={line("wet")} fill="none" stroke="#5aa9ff" strokeWidth="2" />
      <path d={line("rain")} fill="none" stroke="#ffffff" strokeWidth="1.5" />
      <text x="6" y="11" fontSize="10" fill="#93a1b5">20 min · <tspan fill="#5aa9ff">mojado</tspan> · <tspan fill="#fff">lluvia</tspan> · <tspan fill="#ffb547">prob.</tspan></text>
    </svg>
  );
};


const SKIES = ["Despejado", "Poco nuboso", "Nuboso", "Cubierto"];
const COMPASS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
const STATE_LABEL: Record<string, string> = { dry: "Seco", risk: "Riesgo de lluvia", raining: "Lluvia", drying: "Secándose", wet: "Pista mojada" };

const Ico: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const Sun = () => <><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.3M12 19.2v2.3M2.5 12h2.3M19.2 12h2.3M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" /></>;
const Cloud = () => <path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 9.6 4.5 4.5 0 0 0 7 18.5z" />;
const CloudRain = () => <><path d="M7 15h10a3.8 3.8 0 0 0 .5-7.55A5.2 5.2 0 0 0 7.2 6.6 4.2 4.2 0 0 0 7 15z" /><path d="M8.5 18l-1 2.2M12.5 18l-1 2.2M16.5 18l-1 2.2" /></>;
const CloudSun = () => <><circle cx="8" cy="8" r="3" /><path d="M8 2.2v1.2M2.2 8h1.2M3.9 3.9l.9.9M12.1 3.9l-.9.9" /><path d="M9 19h8.5a3.6 3.6 0 0 0 .5-7.15A4.8 4.8 0 0 0 9.4 11.2 3.9 3.9 0 0 0 9 19z" /></>;
const Drop = () => <path d="M12 3.2s6 6.4 6 10.6a6 6 0 0 1-12 0C6 9.6 12 3.2 12 3.2z" />;
const Thermo = () => <><path d="M10 14.2V5a2 2 0 0 1 4 0v9.2a4 4 0 1 1-4 0z" /><path d="M12 9v6.5" /></>;
const Umbrella = () => <><path d="M3 12a9 9 0 0 1 18 0z" /><path d="M12 12v6.2a2 2 0 0 1-4 0" /></>;
const WindArrow: React.FC<{ deg: number }> = ({ deg }) => <g transform={`rotate(${deg} 12 12)`}><path d="M12 20V4M6.5 9.5 12 4l5.5 5.5" /></g>;

function WeatherCard({ state }: { state: IfuelState }) {
  const w = state.weather;
  if (!w) return null;
  const skies = Math.min(3, Math.max(0, Math.round(w.skies)));
  const raining = w.state === "raining";
  const wet = w.state === "wet" || w.state === "drying";
  const icon = raining || wet ? <CloudRain /> : skies >= 2 ? <Cloud /> : skies === 1 ? <CloudSun /> : <Sun />;
  const wetPct = Math.round(((Math.min(7, Math.max(1, w.wetness)) - 1) / 6) * 100);
  const chance = state.rainChance != null ? Math.round(state.rainChance) : null;
  const windDeg = w.windDir != null ? (w.windDir * 180) / Math.PI : null;
  const compass = windDeg != null ? COMPASS[Math.round(windDeg / 45 + 8) % 8] : null;
  return (
    <div className={`pb-panel fw-wx fw-wx--${w.state}`}>
      <div className="fw-wx__top">
        <span className="fw-wx__icon"><Ico size={44}>{icon}</Ico></span>
        <div className="fw-wx__main">
          <b>{STATE_LABEL[w.state] ?? "Seco"}</b>
          <span>{SKIES[skies]}</span>
        </div>
        {chance != null && (
          <div className="fw-wx__chance" title="Probabilidad de lluvia">
            <Ico size={20}><Umbrella /></Ico><b>{chance}<small>%</small></b>
          </div>
        )}
      </div>
      <div className="fw-wx__chips">
        <span title="Temperatura de pista"><Ico><Thermo /></Ico><small>Pista</small><b>{state.trackTemp != null ? `${Math.round(state.trackTemp)}°` : "–"}</b></span>
        <span title="Temperatura del aire"><Ico><Thermo /></Ico><small>Aire</small><b>{state.airTemp != null ? `${Math.round(state.airTemp)}°` : "–"}</b></span>
        <span title="Pista mojada"><Ico><Drop /></Ico><small>Mojada</small><b>{wetPct}%</b></span>
        <span title="Viento">
          <Ico>{windDeg != null ? <WindArrow deg={windDeg + 180} /> : <path d="M3 12h13a3 3 0 1 0-3-3M3 17h9a3 3 0 1 1-3 3" />}</Ico>
          <small>{compass ?? "Viento"}</small><b>{w.windKph != null ? Math.round(w.windKph) : "–"}<small> km/h</small></b>
        </span>
      </div>
      <WeatherTrend state={state} />
    </div>
  );
}

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
        <WeatherCard state={state} />
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
