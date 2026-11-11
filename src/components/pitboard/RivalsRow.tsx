import React from "react";
import type { RelativeCar } from "../../types/relative";
import { ClassBadge } from "../ClassBadge";

const short = (n?: string | null) => {
  if (!n) return "";
  const p = n.trim().split(/\s+/);
  return p.length < 2 ? n : `${p[0][0]}. ${p.slice(1).join(" ")}`;
};
const gap = (g: number | null | undefined) => (g == null || !Number.isFinite(g) ? "--" : Math.abs(g) < 100 ? Math.abs(g).toFixed(1) : String(Math.round(Math.abs(g))));

const Rival: React.FC<{ side: "ahead" | "behind"; car: RelativeCar; cls?: Record<number, number> }> = ({ side, car, cls }) => {
  const d = car?.deltaLastToMe ?? null;
  const good = d != null && d >= 0;
  const tone = d == null ? "" : good ? "pb-rv--good" : "pb-rv--bad";
  const trend = d == null ? "" : side === "ahead" ? (d < 0 ? "se aleja" : "te acercas") : d < 0 ? "se acerca" : "te alejas";
  return (
    <div className={`pb-rv ${tone}`}>
      <span className="pb-lbl">{side === "ahead" ? "▲ Delante" : "▼ Detrás"}</span>
      <div className="pb-rv__main">
        <span className="pb-rv__car"><b className="pb-num">{car?.carNum ?? "--"}</b><ClassBadge small classId={car?.classId ?? null} classPosition={car?.classPosition ?? null} classColorIndexById={cls} /></span>
        <b className="pb-num pb-rv__gap">{gap(car?.gapSeconds)}<small>s</small></b>
      </div>
      <div className="pb-rv__sub">{short(car?.driverName) || " "}{trend ? ` · ${trend} ${Math.abs(d ?? 0).toFixed(2)}` : ""}</div>
    </div>
  );
};

export const RivalsRow: React.FC<{ ahead: RelativeCar; behind: RelativeCar; cls?: Record<number, number> }> = ({ ahead, behind, cls }) => (
  <div className="pb-panel pb-rivals">
    <Rival side="ahead" car={ahead} cls={cls} />
    <Rival side="behind" car={behind} cls={cls} />
  </div>
);
