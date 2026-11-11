import React from "react";
import type { IfuelState } from "../../useIfuelWebSocket";
import { pitCall } from "../../utils/pitCall";
import { useSafetyLaps, setSafetyLaps } from "../../utils/safetyMargin";
import { FuelSavingLine } from "../FuelSavingLine";

const f1 = (v: number | null | undefined, d = 1) => (v == null || !Number.isFinite(v) ? "–" : v.toFixed(d));

/** Plan de parada: qué hacer ahora, combustible, línea de carrera, cuándo parar y paradas previstas. */
export const PitPlanCard: React.FC<{ state: IfuelState | null }> = ({ state }) => {
  const margin = useSafetyLaps();
  const plan = state?.fuelPlan ?? null;
  const call = pitCall(state?.pitClearAir ?? undefined, state?.lapNumber ?? null);
  const lap = state?.lapNumber ?? 0;
  const perLap = plan?.perLap ?? null;
  const remaining = plan?.remainingLaps ?? null;
  const total = remaining != null && lap > 0 ? lap + remaining : null;
  const cap = state?.fuelCapacity ?? state?.fuelMax ?? state?.fuel ?? 0;
  const ratio = cap > 0 && state ? Math.min(1, Math.max(0, state.fuel / cap)) : 0;
  const winS = plan?.windowStartLap ?? null;
  const winE = plan?.windowEndLap ?? null;
  const pct = (l: number) => (total ? Math.min(100, Math.max(0, ((l - lap) / (total - lap)) * 100)) : 0);
  const stops = plan?.stintLaps ?? [];
  const lastStop = stops.length ? stops[stops.length - 1] : null;
  const loss = state?.pitClearAir?.pitLossSeconds ?? null;
  const toFinish = remaining != null && perLap ? remaining * perLap : null;

  return (
    <div className="pb-panel pb-plan" data-tone={call.tone}>
      <div className="pb-plan__top">
        <div className="pb-plan__badge">{call.tone === "go" ? "GO" : call.tone === "bad" ? "!" : call.tone === "info" ? "OK" : "…"}</div>
        <div>
          <div className="pb-plan__headline">{call.headline}</div>
          <div className="pb-plan__sub">{call.sub}{loss != null ? ` · pérdida ${Math.round(loss)} s${state?.pitClearAir?.pitLossMeasured ? " (medida)" : " (est.)"}` : ""}</div>
        </div>
      </div>

      <div className="pb-plan__kpis">
        <div className="pb-kpi"><span className="pb-lbl">Depósito</span><b className="pb-num">{f1(state?.fuel)}<small> L</small></b></div>
        <div className="pb-kpi"><span className="pb-lbl">Vueltas</span><b className="pb-num">{state?.estLaps != null ? f1(state.estLaps) : "–"}</b></div>
        <div className="pb-kpi"><span className="pb-lbl">Repostar</span><b className="pb-num pb-warn">{plan?.litersToAdd != null && plan.litersToAdd > 0 ? f1(plan.litersToAdd) : "0"}</b></div>
        <div className="pb-kpi"><span className="pb-lbl">Consumo</span><b className="pb-num">{f1(perLap, 2)}</b></div>
      </div>
      <div className="pb-plan__tank"><i style={{ width: `${ratio * 100}%` }} /></div>

      <span className="pb-lbl pb-plan__h">Plan de carrera{plan?.stops != null ? ` · ${plan.stops} ${plan.stops === 1 ? "parada" : "paradas"}` : ""}</span>
      <div className="pb-plan__line">
        {total && winS != null && winE != null && <div className="pb-plan__win" style={{ left: `${pct(winS)}%`, width: `${Math.max(2, pct(winE) - pct(winS))}%` }} />}
        {total && stops.map((s) => <i key={s} className="pb-plan__stop" style={{ left: `${pct(s)}%` }} />)}
        <i className="pb-plan__now" />
      </div>
      <div className="pb-plan__axis"><span>V{lap || "–"} ahora</span><span>{winS != null && winE != null ? `Ventana V${winS}–V${winE}` : ""}</span><span>{total ? `V${total} meta` : ""}</span></div>

      <FuelSavingLine saving={plan?.saving} />

      {call.laps.length > 0 && (
        <>
          <span className="pb-lbl pb-plan__h">Cuándo parar · tráfico al salir</span>
          <div className="pb-plan__opts">
            {call.laps.slice(0, 5).map((o) => (
              <div key={o.lap} className={`pb-opt pb-opt--${o.score === 0 ? "go" : o.score === 1 ? "wait" : "bad"}${o.lap === call.pick ? " is-pick" : ""}`}>
                <b>V{o.lap}</b>
                <small>{o.score === 0 ? "aire limpio" : o.score === 1 ? "algo" : "tráfico"}</small>
              </div>
            ))}
          </div>
        </>
      )}

      <span className="pb-lbl pb-plan__h">Paradas previstas</span>
      <div className="pb-plan__rows">
        {stops.length === 0 && <div><b>Sin paradas</b><span>{plan?.status === "no-stop" ? "llegas a meta" : "pendiente de datos"}</span></div>}
        {stops.slice(0, 3).map((s, i) => (
          <div key={s}><b>Parada {i + 1}</b><span>V{s}{i === 0 && plan?.litersNextStop ? ` · +${f1(plan.litersNextStop)} L` : ""}</span></div>
        ))}
        {stops.length > 3 && <div><b>…</b><span>+{stops.length - 3} más</span></div>}
        {toFinish != null && <div><b>Hasta meta</b><span>{f1(remaining)} v{lastStop ? ` · último stint V${lastStop}→` : ""} · {f1(toFinish)} L</span></div>}
      </div>

      <div className="pb-plan__margin">
        <span className="pb-lbl">Margen de seguridad</span>
        <button type="button" onClick={() => setSafetyLaps(margin - 0.25)} aria-label="Menos margen">−</button>
        <b className="pb-num">{margin.toFixed(2)} v</b>
        <button type="button" onClick={() => setSafetyLaps(margin + 0.25)} aria-label="Más margen">+</button>
      </div>
    </div>
  );
};
