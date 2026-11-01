import React from "react";
import type { TyreCorner, TyreData } from "../../types/car";

const COMPOUND: Record<number, string> = { 0: "Seco", 1: "Lluvia" };
const CORNERS: { id: TyreCorner; label: string }[] = [
  { id: "lf", label: "DI" },
  { id: "rf", label: "DD" },
  { id: "lr", label: "TI" },
  { id: "rr", label: "TD" },
];

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

type Props = { tyres: TyreData | null; compound: number | null };

export const TyresPanel: React.FC<Props> = ({ tyres, compound }) => (
  <div className="pb-panel pb-tyres">
    <div className="pb-row-between">
      <span className="pb-lbl">Neumáticos</span>
      <span className="pb-lbl pb-warn">{compound != null ? (COMPOUND[compound] ?? `Comp. ${compound}`) : ""}</span>
    </div>
    <div className="pb-tyres__grid">
      {CORNERS.map(({ id, label }) => {
        const wear = tyres ? avg(tyres.wear[id]) : null;
        const temp = tyres ? avg(tyres.temp[id]) : null;
        const cold = tyres?.coldPressure[id] ?? null;
        const level = wear == null ? "" : wear < 30 ? "pb-bad" : wear < 60 ? "pb-warn" : "pb-good";
        return (
          <div key={id} className="pb-tyre">
            <span className="pb-lbl">{label}</span>
            <b className={`pb-num ${level}`}>{wear == null ? "–" : `${Math.round(wear)}%`}</b>
            <span className="pb-tyre__sub">{temp == null ? "–" : `${Math.round(temp)}°C`}{cold != null ? ` · ${(cold / 100).toFixed(2)} bar` : ""}</span>
          </div>
        );
      })}
    </div>
    <span className="pb-tyres__age">
      {tyres?.lapsAgo != null
        ? tyres.lapsAgo === 0 ? "Medido en la última parada" : `Medido hace ${tyres.lapsAgo} vueltas (al pasar por boxes)`
        : "Sin lectura · iRacing solo la da en boxes"}
    </span>
  </div>
);
