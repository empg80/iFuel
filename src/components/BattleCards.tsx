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

const lapsText = (d: number | null | undefined) =>
  d == null ? "" : d === 0 ? "misma vuelta" : d > 0 ? `${d} ${d === 1 ? "vuelta" : "vueltas"} más` : `${-d} ${d === -1 ? "vuelta" : "vueltas"} menos`;

/** Coche más cercano en pista (de cualquier clase), en una línea legible: lado · número · distancia · vueltas. */
const OnTrackRow: React.FC<{ side: "ahead" | "behind"; car: OnTrackCar | null; cls?: Record<number, number> }> = ({ side, car, cls }) => {
  if (!car) return null;
  const ci = car.classId != null ? (cls?.[car.classId] ?? 0) % 6 : null;
  const d = car.lapsDiff ?? null;
  return (
    <div className={`bc-ot__row${d != null && d !== 0 ? (d > 0 ? " bc-ot__row--more" : " bc-ot__row--less") : ""}`}>
      <span className="bc-ot__where">{side === "ahead" ? "▲ Delante" : "▼ Detrás"}</span>
      <b className="bc-ot__car" style={ci != null ? { background: `var(--class-${ci})` } : undefined}>#{car.carNum}</b>
      <span className="bc-ot__gap">{gap(car.gapSeconds)} s</span>
      <span className="bc-ot__laps">{lapsText(d)}</span>
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
      <div className="bc-ot" title="Coche más cercano en pista, de cualquier clase">
        <OnTrackRow side="ahead" car={onTrackAhead} cls={classColorIndexById} />
        <OnTrackRow side="behind" car={onTrackBehind} cls={classColorIndexById} />
      </div>
    )}
  </div>
);
