import React from "react";
import type { CompactCar } from "../../types/car";

type Props = {
  cars: CompactCar[];
  myPct: number | null;
  classColorIndexById?: Record<number, number>;
  sectorStarts?: number[];
  trackTemp: number | null;
  airTemp: number | null;
  rainChance?: number | null;
  /** Dato grande en el centro (p. ej. distancia al debris); si falta, temperaturas */
  center?: { label: string; value: string; sub?: string; tone?: "warn" | "bad" } | null;
};

const R = 92;
const C = 115;
const at = (pct: number, r = R) => {
  const a = pct * Math.PI * 2 - Math.PI / 2;
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
};
const arc = (from: number, to: number) => {
  const [x1, y1] = at(from);
  const [x2, y2] = at(to);
  return `M${x1} ${y1} A${R} ${R} 0 ${to - from > 0.5 ? 1 : 0} 1 ${x2} ${y2}`;
};
const temp = (v: number | null) => (v == null ? "–" : `${Math.round(v)}°`);

export const TrackRing: React.FC<Props> = ({ cars, myPct, classColorIndexById, sectorStarts, trackTemp, airTemp, rainChance, center }) => {
  const starts = sectorStarts && sectorStarts.length >= 2 ? sectorStarts : [0];
  return (
    <div className="pb-panel pb-ring">
      <svg viewBox="0 0 230 230" aria-hidden="true">
        <circle cx={C} cy={C} r={R} className="pb-ring__track" />
        {starts.length >= 2 &&
          starts.map((s, i) => (
            <path key={i} d={arc(s, starts[i + 1] ?? 1)} className={`pb-ring__sec pb-ring__sec--${i % 3}`} />
          ))}
        <line x1={C} y1={C - R - 8} x2={C} y2={C - R + 8} className="pb-ring__line" />
        {cars.map((c, i) => {
          const [x, y] = at(c[1]);
          const k = c[4] != null ? (classColorIndexById?.[c[4]] ?? 0) : 0;
          return <circle key={i} cx={x} cy={y} r={5} className={`pb-dot pb-dot--${k % 6}`} opacity={c[5] ? 0.4 : 1} />;
        })}
        {myPct != null && myPct >= 0 && (() => {
          const [x, y] = at(myPct);
          return <circle cx={x} cy={y} r={8} className="pb-dot pb-dot--me" />;
        })()}
      </svg>
      <div className="pb-ring__center">
        {center ? (
          <>
            <span className="pb-lbl">{center.label}</span>
            <b className={`pb-num ${center.tone === "bad" ? "pb-bad" : "pb-warn"}`}>{center.value}</b>
            {center.sub && <span className="pb-ring__sub">{center.sub}</span>}
          </>
        ) : (
          <>
            <span className="pb-lbl">Pista</span>
            <b className="pb-num">{temp(trackTemp)}</b>
            <span className="pb-ring__sub">Aire {temp(airTemp)}{rainChance != null && rainChance > 0 ? ` · Lluvia ${Math.round(rainChance)}%` : ""}</span>
          </>
        )}
      </div>
    </div>
  );
};
