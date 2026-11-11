import React from "react";
import type { TyreCorner, TyreData } from "../../types/car";

const CORNERS: { id: TyreCorner; label: string }[] = [
  { id: "lf", label: "DI" }, { id: "rf", label: "DD" }, { id: "lr", label: "TI" }, { id: "rr", label: "TD" },
];
const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

/** Neumáticos en una franja: iRacing solo refresca la lectura al pasar por boxes. */
export const TyresStrip: React.FC<{ tyres: TyreData | null; compound: number | null }> = ({ tyres, compound }) => (
  <div className="pb-panel pb-tyrestrip">
    <span className="pb-lbl">Neumáticos{compound != null ? ` · ${compound === 1 ? "Lluvia" : "Seco"}` : ""}</span>
    <div className="pb-tyrestrip__grid">
      {CORNERS.map(({ id, label }) => {
        const wear = tyres ? avg(tyres.wear[id]) : null;
        const temp = tyres ? avg(tyres.temp[id]) : null;
        const level = wear == null ? "" : wear < 30 ? "pb-bad" : wear < 60 ? "pb-warn" : "pb-good";
        return (
          <span key={id}>{label} <b className={`pb-num ${level}`}>{wear == null ? "–" : `${Math.round(wear)}%`}</b>{temp != null ? <small> {Math.round(temp)}°</small> : null}</span>
        );
      })}
    </div>
    <small className="pb-tyrestrip__age">
      {tyres?.lapsAgo != null ? (tyres.lapsAgo === 0 ? "medido en la última parada" : `medido en boxes hace ${tyres.lapsAgo} v`) : "se lee al pasar por boxes"}
    </small>
  </div>
);
