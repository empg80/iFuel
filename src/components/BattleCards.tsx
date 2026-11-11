import React from "react";
import type { RelativeCar, OnTrackCar } from "../types/relative";
import { ClassBadge } from "./ClassBadge";

type Props = {
  ahead: RelativeCar;
  behind: RelativeCar;
  myPosition: number | null;
  onTrackAhead: OnTrackCar | null;
  onTrackBehind: OnTrackCar | null;
  classColorIndexById?: Record<number, number>;
};

const gap = (g: number | null | undefined) => (g == null || !Number.isFinite(g) ? "--" : Math.abs(g) < 100 ? Math.abs(g).toFixed(1) : String(Math.round(Math.abs(g))));
const short = (n?: string | null) => {
  if (!n) return "";
  const p = n.trim().split(/\s+/);
  return p.length < 2 ? n : `${p[0][0]}. ${p.slice(1).join(" ")}`;
};

const Card: React.FC<{ side: "ahead" | "behind"; car: RelativeCar; cls?: Record<number, number> }> = ({ side, car, cls }) => {
  const d = car?.deltaLastToMe ?? null;
  const tone = d == null ? "" : d >= 0 ? "bc--good" : "bc--bad";
  return (
    <div className={`bc ${tone}`}>
      <span className="bc__side">{side === "ahead" ? "▲" : "▼"}</span>
      <b className="bc__num">{car?.carNum ?? "--"}</b>
      <ClassBadge small classId={car?.classId ?? null} classPosition={car?.classPosition ?? null} classColorIndexById={cls} />
      <span className="bc__name">{short(car?.driverName)}</span>
      <b className="bc__gap">{gap(car?.gapSeconds)}<small>s</small></b>
    </div>
  );
};

/** Layout libre: dos tarjetas compactas (delante / detrás) que tapan poco de la pantalla. */
export const BattleCards: React.FC<Props> = ({ ahead, behind, myPosition, onTrackAhead, onTrackBehind, classColorIndexById }) => (
  <div className="pb-scope bc-wrap">
    <Card side="ahead" car={ahead} cls={classColorIndexById} />
    <div className="bc-me">P{myPosition ?? "–"}</div>
    <Card side="behind" car={behind} cls={classColorIndexById} />
    {(onTrackAhead || onTrackBehind) && (
      <div className="bc-ot">
        {onTrackAhead && <span>▲ #{onTrackAhead.carNum} {gap(onTrackAhead.gapSeconds)}s{onTrackAhead.lapsDiff ? ` ${onTrackAhead.lapsDiff > 0 ? "+" : ""}${onTrackAhead.lapsDiff}V` : ""}</span>}
        {onTrackBehind && <span>▼ #{onTrackBehind.carNum} {gap(onTrackBehind.gapSeconds)}s{onTrackBehind.lapsDiff ? ` ${onTrackBehind.lapsDiff > 0 ? "+" : ""}${onTrackBehind.lapsDiff}V` : ""}</span>}
      </div>
    )}
  </div>
);
