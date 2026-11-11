import React from "react";
import type { IfuelState } from "../useIfuelWebSocket";
import type { StandingsRow } from "../types/standings";
import { useOverlayState } from "../contexts/useOverlayState";
import { FloatingWidget } from "./FloatingWidget";
import { WeatherStrip } from "./pitboard/WeatherStrip";
import { TyresStrip } from "./pitboard/TyresStrip";
import { CarSettings } from "./pitboard/CarSettings";
import { clockStr, deltaStr, lapStr, secStr } from "./pitboard/fmt";

type Props = { state: IfuelState | null; rows: StandingsRow[] };

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
