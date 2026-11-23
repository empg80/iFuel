import React, { useState } from "react";
import type { IfuelState } from "../../useIfuelWebSocket";
import { planStints } from "../../utils/stintPlan";
import { clockStr, lapStr } from "./fmt";

type Key = "durationMin" | "tankL" | "lapS" | "fuelPerLap" | "pitLossS" | "marginLaps" | "drivers" | "driverChangeS" | "maxDriveMin" | "maxTotalMin" | "yellowPct";
const KEY = "ifuel-stint-planner";
const FIELDS: { k: Key; label: string; unit: string; step: number; min: number; max: number; digits: number; zero?: string }[] = [
  { k: "durationMin", label: "Duración", unit: "min", step: 10, min: 10, max: 1440, digits: 0 },
  { k: "tankL", label: "Depósito", unit: "L", step: 1, min: 5, max: 300, digits: 0 },
  { k: "lapS", label: "Ritmo", unit: "s/v", step: 0.5, min: 30, max: 600, digits: 1 },
  { k: "fuelPerLap", label: "Consumo", unit: "L/v", step: 0.05, min: 0.2, max: 30, digits: 2 },
  { k: "pitLossS", label: "Pérdida en boxes", unit: "s", step: 1, min: 0, max: 180, digits: 0 },
  { k: "marginLaps", label: "Margen", unit: "v", step: 0.25, min: 0, max: 5, digits: 2 },
  { k: "drivers", label: "Pilotos", unit: "", step: 1, min: 1, max: 6, digits: 0 },
  { k: "driverChangeS", label: "Cambio de piloto", unit: "s", step: 5, min: 0, max: 180, digits: 0 },
  { k: "maxDriveMin", label: "Máx. por stint", unit: "min", step: 10, min: 0, max: 360, digits: 0, zero: "sin límite" },
  { k: "maxTotalMin", label: "Máx. por piloto", unit: "min", step: 30, min: 0, max: 1440, digits: 0, zero: "sin límite" },
  { k: "yellowPct", label: "Amarillas previstas", unit: "% carrera", step: 5, min: 0, max: 50, digits: 0 },
];
const load = (): Partial<Record<Key, number>> => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {}; } catch { return {}; }
};

/** Planificador de stints: valores automáticos desde la telemetría; los que toques se recuerdan. */
export const StintPlannerCard: React.FC<{ state: IfuelState | null }> = ({ state }) => {
  const [ov, setOv] = useState<Partial<Record<Key, number>>>(load);
  const t = state?.sessionTimeRemain;
  const auto: Record<Key, number | null> = {
    durationMin: t != null && t > 600 && t < 90000 ? Math.round(t / 60) : 180,
    tankL: state?.fuelCapacity ?? state?.fuelMax ?? 60,
    lapS: state?.lapTime ?? (state?.myBestLapTime ? state.myBestLapTime * 1.01 : null),
    fuelPerLap: state?.fuelAvg ?? state?.trackHistory?.fuelPerLap ?? null,
    pitLossS: state?.pitClearAir?.pitLossSeconds != null ? Math.round(state.pitClearAir.pitLossSeconds) : 38,
    marginLaps: 1,
    drivers: 1, driverChangeS: 30, maxDriveMin: 0, maxTotalMin: 0, yellowPct: 0,
  };
  const val = (k: Key) => ov[k] ?? auto[k];
  const set = (k: Key, v: number | null) => {
    const next = { ...ov };
    if (v == null) delete next[k]; else next[k] = v;
    setOv(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* en memoria */ }
  };
  const plan = planStints({
    durationS: (val("durationMin") ?? 0) * 60, tankL: val("tankL") ?? 0, lapS: val("lapS") ?? 0,
    fuelPerLap: val("fuelPerLap") ?? 0, pitLossS: val("pitLossS") ?? 0, marginLaps: val("marginLaps") ?? 0,
    drivers: val("drivers") ?? 1, driverChangeS: val("driverChangeS") ?? 0, maxDriveS: (val("maxDriveMin") ?? 0) * 60,
    maxTotalS: (val("maxTotalMin") ?? 0) * 60, yellowPct: val("yellowPct") ?? 0,
  });
  const curLap = state?.lapNumber ?? 0;
  const multi = (val("drivers") ?? 1) > 1;
  // Vista resumida en carrera: stint actual, vueltas hasta la parada, repostaje y piloto
  const inRace = !!state?.raceRunning;
  const nowStint = plan && inRace && curLap > 0 ? plan.stints.find((st) => curLap >= st.fromLap && curLap < st.fromLap + st.laps) ?? null : null;
  const lapsLeft = nowStint ? nowStint.fromLap + nowStint.laps - curLap : 0;

  return (
    <div className="pb-panel pb-planner">
      <div className="pb-planner__fields">
        {FIELDS.map((f) => {
          const v = val(f.k);
          const isOv = ov[f.k] != null;
          return (
            <div key={f.k} className="pb-planner__f">
              <span className="pb-lbl">{f.label}{isOv ? "" : " · auto"}</span>
              <div>
                <button type="button" onClick={() => set(f.k, Math.max(f.min, +((v ?? f.min) - f.step).toFixed(2)))} aria-label={`Menos ${f.label}`}>−</button>
                <b className="pb-num">{v == null ? "–" : f.k === "lapS" ? lapStr(v) : v === 0 && f.zero ? f.zero : v.toFixed(f.digits)}<small> {f.k === "lapS" || (v === 0 && f.zero) ? "" : f.unit}</small></b>
                <button type="button" onClick={() => set(f.k, Math.min(f.max, +((v ?? f.min) + f.step).toFixed(2)))} aria-label={`Más ${f.label}`}>+</button>
                {isOv && <button type="button" className="pb-planner__auto" onClick={() => set(f.k, null)} title="Volver al valor automático">auto</button>}
              </div>
            </div>
          );
        })}
      </div>
      {!plan ? (
        <div className="pb-planner__empty">Faltan datos (consumo o ritmo): da unas vueltas o ajústalos a mano.</div>
      ) : (
        <>
          {nowStint && (
            <div className="pb-planner__now" role="status">
              <span className="pb-lbl">Ahora · stint {nowStint.n}/{plan.stints.length}</span>
              <b>{nowStint.endTimeS != null ? <>Parada en V{nowStint.fromLap + nowStint.laps - 1}{" "}<small>({lapsLeft} v · {clockStr(nowStint.endTimeS)})</small></> : <>Hasta la meta <small>({lapsLeft} v)</small></>}</b>
              {nowStint.refuelL != null && <span>Repostar <b>{Math.round(nowStint.refuelL)} L</b></span>}
              {multi && <span>Piloto <b>P{nowStint.driver + 1}</b>{plan.stints[nowStint.n] ? <> → P{plan.stints[nowStint.n].driver + 1}</> : null}</span>}
            </div>
          )}
          {plan.warnings.map((w) => <div key={w} className="pb-planner__warn">{w}</div>)}
          <div className="pb-planner__kpis">
            <div className="pb-kpi"><small>Vueltas</small><b className="pb-num">{plan.totalLaps}</b></div>
            <div className="pb-kpi"><small>Paradas</small><b className="pb-num">{plan.stops}</b></div>
            <div className="pb-kpi"><small>Stint máx.</small><b className="pb-num">{plan.maxStintLaps} v</b></div>
            <div className="pb-kpi"><small>Combustible</small><b className="pb-num">{Math.round(plan.totalFuelL)} L</b></div>
          </div>
          <div className="pb-planner__bar">
            {plan.stints.map((s) => (
              <React.Fragment key={s.n}>
                <div className={s.n % 2 ? "a" : "b"} style={{ flex: s.laps }}>S{s.n} · {s.laps} v</div>
                {s.refuelL != null && <i />}
              </React.Fragment>
            ))}
          </div>
          <table className="pb-planner__tbl">
            <thead><tr><th>Stint</th>{multi && <th>Piloto</th>}<th>Vueltas</th><th>Desde</th><th>Parada a</th><th>Repostar</th></tr></thead>
            <tbody>
              {plan.stints.map((s) => (
                <tr key={s.n} className={curLap >= s.fromLap && curLap < s.fromLap + s.laps ? "is-now" : ""}>
                  <td>{s.n}</td>{multi && <td>P{s.driver + 1} · {Math.round(s.driveS / 60)} min</td>}<td>{s.laps}</td><td>V{s.fromLap}</td>
                  <td>{s.endTimeS != null ? clockStr(s.endTimeS) : "meta"}</td>
                  <td>{s.refuelL != null ? `${Math.round(s.refuelL)} L` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};
