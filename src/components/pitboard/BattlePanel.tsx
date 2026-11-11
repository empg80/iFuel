import React from "react";
import type { RelativeCar, OnTrackCar } from "../../types/relative";
import { ClassBadge } from "../ClassBadge";
import { formatLapTimeSeconds } from "../../utils/relativeFormat";

type Props = {
  ahead: RelativeCar;
  behind: RelativeCar;
  myPosition: number | null;
  myLastLap: number | null;
  myBestLap: number | null;
  onTrackAhead: OnTrackCar | null;
  onTrackBehind: OnTrackCar | null;
  classColorIndexById?: Record<number, number>;
  classNames?: Record<number, string>;
};

const short = (n?: string | null) => {
  if (!n) return "";
  const p = n.trim().split(/\s+/);
  return p.length < 2 ? n : `${p[0][0]}. ${p.slice(1).join(" ")}`;
};
const gapStr = (g: number | null | undefined) => (g == null || !Number.isFinite(g) ? "--" : Math.abs(g) < 100 ? Math.abs(g).toFixed(1) : String(Math.round(Math.abs(g))));
const lap = (s: number | null | undefined) => formatLapTimeSeconds(s ?? null);

type Side = "ahead" | "behind";
/** Rival directo en carrera: coche grande, hueco enorme y color según se acerca o se aleja. */
const Rival: React.FC<{ side: Side; car: RelativeCar; cls?: Record<number, number>; names?: Record<number, string> }> = ({ side, car, cls, names }) => {
  const d = car?.deltaLastToMe ?? null; // último rival - mi último (s): <0 = él fue más rápido
  // delante: si fue más rápido se aleja (malo). Detrás: si fue más rápido se acerca (malo).
  const bad = d != null && d < 0;
  const trend = d == null ? "" : side === "ahead" ? (d < 0 ? "se aleja" : "te acercas") : d < 0 ? "se acerca" : "te alejas";
  const tone = d == null ? "" : (side === "ahead" ? d >= 0 : d >= 0) ? "pb-bt--good" : "pb-bt--bad";
  void bad;
  return (
    <div className={`pb-bt pb-bt--${side} ${tone}`}>
      <div className="pb-bt__side pb-lbl">{side === "ahead" ? "▲ Delante" : "▼ Detrás"}</div>
      <div className="pb-bt__main">
        <div className="pb-bt__car">
          <b className="pb-bt__num pb-num">{car?.carNum ?? "--"}</b>
          <ClassBadge classId={car?.classId ?? null} classPosition={car?.classPosition ?? null} classColorIndexById={cls} classNames={names} />
        </div>
        <div className="pb-bt__gap pb-num">{gapStr(car?.gapSeconds)}<small>s</small></div>
      </div>
      <div className="pb-bt__name">{short(car?.driverName) || " "}</div>
      <div className="pb-bt__sub">
        <span>{lap(car?.lastLap)} <i>({lap(car?.bestLap)})</i></span>
        <span className="pb-bt__trend">{d == null ? "" : `${trend} ${Math.abs(d).toFixed(2)}`}</span>
      </div>
    </div>
  );
};

/** Coche físicamente delante/detrás en pista (aunque sea de otra clase o vuelta distinta). */
const OnTrack: React.FC<{ side: Side; car: OnTrackCar | null; cls?: Record<number, number>; names?: Record<number, string> }> = ({ side, car, cls, names }) => {
  const rel = car?.lapsDiff == null ? "" : car.lapsDiff === 0 ? "" : car.lapsDiff > 0 ? `+${car.lapsDiff}V` : `${car.lapsDiff}V`;
  const tone = car?.lapsDiff == null || car.lapsDiff === 0 ? "" : car.lapsDiff < 0 ? "pb-ot--lapped" : "pb-ot--ahead";
  return (
    <div className={`pb-ot ${tone}`}>
      <span className="pb-ot__arrow">{side === "ahead" ? "▲" : "▼"}</span>
      <b className="pb-ot__num pb-num">{car?.carNum ?? "--"}</b>
      <ClassBadge small classId={car?.classId ?? null} classPosition={car?.classPosition ?? null} classColorIndexById={cls} classNames={names} />
      <span className="pb-ot__gap pb-num">{gapStr(car?.gapSeconds)}s</span>
      <span className="pb-ot__rel">{rel}</span>
    </div>
  );
};

export const BattlePanel: React.FC<Props> = (p) => {
  // Carril de huecos: tú en el centro, los rivales según su hueco (±5 s)
  const pos = (g: number | null | undefined, dir: 1 | -1) => (g == null ? null : 50 + dir * Math.min(1, Math.abs(g) / 5) * 46);
  const a = pos(p.ahead?.gapSeconds, 1);
  const b = pos(p.behind?.gapSeconds, -1);
  return (
    <div className="pb-panel pb-battle">
      <Rival side="ahead" car={p.ahead} cls={p.classColorIndexById} names={p.classNames} />
      <div className="pb-rail">
        <div className="pb-rail__line" />
        {b != null && <div className="pb-rail__dot pb-rail__dot--behind" style={{ left: `${b}%` }}>{p.behind?.carNum}</div>}
        <div className="pb-rail__me">P{p.myPosition ?? "–"}</div>
        {a != null && <div className="pb-rail__dot pb-rail__dot--ahead" style={{ left: `${a}%` }}>{p.ahead?.carNum}</div>}
      </div>
      <div className="pb-me">
        <span className="pb-lbl">Tú</span>
        <span className="pb-num">{lap(p.myLastLap)} <i>({lap(p.myBestLap)})</i></span>
      </div>
      <Rival side="behind" car={p.behind} cls={p.classColorIndexById} names={p.classNames} />
      <div className="pb-ot-row">
        <span className="pb-lbl">En pista</span>
        <OnTrack side="ahead" car={p.onTrackAhead} cls={p.classColorIndexById} names={p.classNames} />
        <OnTrack side="behind" car={p.onTrackBehind} cls={p.classColorIndexById} names={p.classNames} />
      </div>
    </div>
  );
};
