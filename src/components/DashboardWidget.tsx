import React from "react";
import type { IfuelState } from "../useIfuelWebSocket";
import type { TyreCorner } from "../types/car";
import { pitCall } from "../utils/pitCall";
import { buildRibbon, gearLabel, rpmFraction, shiftState } from "../utils/dashModel";
import { clockStr, deltaStr, lapStr } from "./pitboard/fmt";

const ARC = 358; // longitud del arco de RPM (270°)
const CORNERS: { id: TyreCorner; label: string }[] = [
  { id: "lf", label: "DI" }, { id: "rf", label: "DD" }, { id: "lr", label: "TI" }, { id: "rr", label: "TD" },
];
const avg = (xs: (number | null)[] | undefined) => {
  const v = (xs ?? []).filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const f1 = (v: number | null | undefined, d = 1) => (v == null || !Number.isFinite(v) ? "–" : v.toFixed(d));

/** Dashboard de volante (diseño v4 "Estratégico"): marcha y RPM, delta, combustible, neumáticos, tráfico y cinta de carrera. */
export const DashboardWidget: React.FC<{ state: IfuelState | null }> = ({ state }) => {
  const car = state?.carData ?? null;
  const dash = car?.dash ?? null;
  const plan = state?.fuelPlan ?? null;
  const lap = state?.lapNumber ?? 0;
  const me = state?.standings?.find((r) => String(r.carNumber) === String(state?.playerCarNumber ?? "")) ?? null;
  const call = pitCall(state?.pitClearAir ?? undefined, lap || null);
  const rpmF = rpmFraction(dash);
  const sh = shiftState(dash);
  // bit 0x10 de EngineWarnings = limitador de pit activo
  const limiterOn = ((state?.engineWarnings ?? 0) & 0x10) !== 0;
  const delta = car?.delta ?? null;
  const kmh = state?.speedMs != null ? Math.round(state.speedMs * 3.6) : null;
  const remaining = plan?.remainingLaps ?? null;
  const finishLap = remaining != null && lap > 0 ? lap + Math.ceil(remaining) - 1 : null;
  const fuelEnd = state?.estLaps != null && lap > 0 ? lap + Math.floor(state.estLaps) : null;
  const ribbon = buildRibbon({
    lap: Math.max(1, lap), scores: call.laps, windowStart: plan?.windowStartLap ?? null, windowEnd: plan?.windowEndLap ?? null,
    pick: call.pick, fuelEndLap: fuelEnd, finishLap,
  });
  const cap = state?.fuelCapacity ?? state?.fuelMax ?? 0;
  const ratio = cap > 0 && state ? Math.min(1, Math.max(0, state.fuel / cap)) : 0;
  const refuel = state?.estRefuel ?? plan?.litersNextStop ?? 0;
  const burn = plan?.perLap ?? state?.fuelAvg ?? null;
  const t = state?.sessionTimeRemain;
  const timeLeft = t != null && t > 0 && t < 90000 ? t : null;
  const tClass = delta == null ? "" : delta <= 0 ? "dash-good" : "dash-bad";

  const ahead = state?.relativeAhead ?? null;
  const behind = state?.relativeBehind ?? null;
  const ft = state?.fastTraffic ?? null;
  const clsIdx = (id: number | null | undefined) => (state?.classColorIndexById?.[id ?? -1] ?? 0) % 6;
  const ladder: { key: string; num: string; note: string; gap: string; cls: number; tone: string }[] = [];
  if (ahead) ladder.push({ key: "a", num: `#${ahead.carNum ?? "?"}`, note: "delante", gap: f1(ahead.gapSeconds), cls: clsIdx(ahead.classId), tone: "" });
  ladder.push({ key: "me", num: "TÚ", note: me ? `P${me.position}` : "", gap: "", cls: clsIdx(me?.classId), tone: "me" });
  if (behind) ladder.push({ key: "b", num: `#${behind.carNum ?? "?"}`, note: "detrás", gap: f1(behind.gapSeconds), cls: clsIdx(behind.classId), tone: "" });
  if (ft && ft.carNum != null) ladder.push({ key: "f", num: `#${ft.carNum}`, note: `MÁS RÁPIDO · ${Math.max(1, Math.round(ft.catchInSeconds))} s`, gap: f1(ft.gapSeconds), cls: clsIdx(ft.classId), tone: "fast" });

  const cell = (label: string, v: React.ReactNode, tone = "") => (
    <div className={`dash-set ${tone}`}><span>{label}</span><b>{v}</b></div>
  );
  const hasHybrid = dash?.soc != null && dash.soc >= 0;
  const inPit = !!me?.inPit;

  return (
    <div className="dash">
      <div className="dash-head">
        <span>VUELTA <b>{lap || "–"}{finishLap ? `/${finishLap}` : ""}</b></span>
        {timeLeft != null && <span>RESTA <b>{clockStr(timeLeft)}</b></span>}
        <span>PISTA <b>{state?.trackTemp != null ? `${Math.round(state.trackTemp)}°` : "–"}</b></span>
        {me?.incidents != null && me.incidents >= 0 && <span>INC <b className={me.incidents >= 12 ? "dash-bad" : "dash-warn"}>{me.incidents}x</b></span>}
        <i />
        <em className={inPit ? "" : "on"}>RACE</em><em className={inPit ? "on" : ""}>PIT</em>
      </div>

      <div className="dash-mid">
        <div className="dash-left">
          <div className="dash-two">
            <div className="dash-box"><span>ÚLTIMA</span><b>{lapStr(state?.lapTime ?? null)}</b></div>
            <div className="dash-box dash-best"><span>MEJOR</span><b>{lapStr(state?.myBestLapTime ?? null)}</b></div>
          </div>
          <div className="dash-box dash-fuel">
            <b className="dash-fuel__laps">{f1(state?.estLaps)}<small> v</small></b>
            <div className="dash-fuel__r"><span>{f1(state?.fuel)} L · {f1(burn, 2)}/v</span><b>{refuel > 0.05 ? `ADD ${f1(refuel)} L` : "OK"}</b></div>
            <div className="dash-bar"><i style={{ width: `${ratio * 100}%` }} /></div>
          </div>
          <div className="dash-tyres">
            {CORNERS.map(({ id, label }) => {
              const wear = avg(car?.tyres?.wear[id]);
              const temp = avg(car?.tyres?.temp[id]);
              const tone = wear == null ? "" : wear < 30 ? "dash-bad" : wear < 60 ? "dash-warn" : "dash-good";
              return (
                <div key={id} className="dash-box dash-tyre">
                  <span className="dash-tyre__c">{label}</span>
                  <b className={tone}>{temp != null ? `${Math.round(temp)}°` : wear != null ? `${Math.round(wear)}%` : "–"}</b>
                  <span className="dash-bar dash-bar--s"><i className={tone} style={{ width: `${wear ?? 0}%` }} /></span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`dash-ring dash-ring--${sh}`}>
          <svg viewBox="0 0 168 168" role="img" aria-label="RPM y delta">
            <defs><linearGradient id="dashrpm" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#43e6a0" /><stop offset=".6" stopColor="#ffb83d" /><stop offset="1" stopColor="#ff4d5e" /></linearGradient></defs>
            <circle cx="84" cy="84" r="76" fill="none" stroke="#1a2538" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${ARC} 477`} transform="rotate(135 84 84)" />
            <circle cx="84" cy="84" r="76" fill="none" stroke="url(#dashrpm)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${Math.max(0.01, rpmF * ARC)} 477`} className="dash-rpmarc" transform="rotate(135 84 84)" />
          </svg>
          <div className="dash-ring__c">
            <div className="dash-gear">{gearLabel(dash?.gear)}</div>
            {limiterOn && <div className="dash-lim">LIM</div>}
            <div className={`dash-delta ${tClass}`}>{deltaStr(delta)}</div>
            <div className="dash-speed">{kmh ?? "–"}<small> KM/H</small></div>
          </div>
        </div>

        <div className="dash-box dash-ladder">
          <div className="dash-ladder__h"><span>TRÁFICO</span><span>{me ? `P${me.position} / ${state?.standings?.length ?? "–"}` : ""}</span></div>
          {ladder.map((r) => (
            <div key={r.key} className={`dash-row ${r.tone}`}>
              <i style={{ background: `var(--class-${r.cls})` }} />
              <b>{r.num}</b><span>{r.note}</span><em>{r.gap}</em>
            </div>
          ))}
        </div>
      </div>

      <div className="dash-ribbon">
        <div className="dash-ribbon__h">
          <span>CINTA DE CARRERA · TRÁFICO AL SALIR DE BOXES</span>
          <span><u className="dash-good">■ LIBRE</u> <u className="dash-warn">■ ALGO</u> <u className="dash-bad">■ TRÁFICO</u>{fuelEnd ? <> · <u className="dash-warn">COMBUSTIBLE HASTA V{fuelEnd}</u></> : null}</span>
        </div>
        <div className="dash-ribbon__cells">
          {ribbon.map((c) => (
            <div key={c.lap} className={`dash-cell${c.inWindow ? " win" : ""}${c.now ? " now" : ""}`} style={{ opacity: c.beyondFuel ? 0.4 : 1 }}>
              <small className={c.box ? "dash-good" : ""}>{c.box ? "BOX" : c.now ? "▶" : c.lap === finishLap ? "META" : ""}</small>
              <i className={c.score == null ? "" : c.score === 0 ? "g" : c.score === 1 ? "a" : "r"} style={{ height: c.score == null ? 6 : 6 + (c.score === 0 ? 15 : c.score === 1 ? 10 : 5) }} />
              <small>{c.label}</small>
            </div>
          ))}
        </div>
      </div>

      <div className={`dash-sets${hasHybrid ? " hy" : ""}`}>
        {cell("BIAS", f1(car?.brakeBias))}
        {cell("TC1", car?.tc1 ?? "–")}
        {cell("TC2", car?.tc2 ?? "–")}
        {cell("ABS", car?.abs ?? "–")}
        {cell("MAP", dash?.mguMode ?? dash?.engineBraking ?? "–", "map")}
        {hasHybrid ? (
          <div className="dash-set dash-soc"><span>SoC</span><span className="dash-bar"><i style={{ width: `${Math.min(100, Math.max(0, (dash!.soc as number) * (dash!.soc! <= 1 ? 100 : 1)))}%` }} /></span><b>{Math.round((dash!.soc as number) * (dash!.soc! <= 1 ? 100 : 1))}%</b></div>
        ) : null}
      </div>
    </div>
  );
};
