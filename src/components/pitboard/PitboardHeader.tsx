import React from "react";
import type { SectorInfo } from "../../types/car";
import { clockStr, deltaStr, lapStr, secStr } from "./fmt";

type Props = {
  position: number | null;
  totalCars: number | null;
  timeRemain: number | null;
  lapsRemain?: number | null;
  lap: number | null;
  lapsTotal: number | null;
  lastLap: number | null;
  bestLap: number | null;
  delta: number | null;
  sectors: SectorInfo[];
  record?: number | null;
};

const cell = (label: string, value: React.ReactNode, cls = "") => (
  <div className={`pb-hd__cell ${cls}`}>
    <span className="pb-lbl">{label}</span>
    <b className="pb-num">{value}</b>
  </div>
);

export const PitboardHeader: React.FC<Props> = ({ position, totalCars, timeRemain, lapsRemain, lap, lapsTotal, lastLap, bestLap, delta, sectors, record }) => {
  const dClass = delta == null ? "" : delta < 0 ? "pb-good" : delta > 0 ? "pb-bad" : "";
  return (
    <div className="pb-panel pb-hd">
      {cell("Pos", <>{position ?? "–"}{totalCars ? <small>/{totalCars}</small> : null}</>, "pb-hd__pos")}
      {timeRemain != null && cell("Tiempo", clockStr(timeRemain))}
      {lapsRemain != null && cell("Restan", <>{lapsRemain}<small> v</small></>)}
      {timeRemain == null && lapsRemain == null && cell("Tiempo", "–")}
      {cell("Vuelta", <>{lap ?? "–"}{lapsTotal ? <small>/{lapsTotal}</small> : null}</>)}
      {cell("Última", lapStr(lastLap))}
      {cell("Mejor", lapStr(bestLap), "pb-best")}
      {record != null && cell("Récord", lapStr(record))}
      {cell("Delta", deltaStr(delta), dClass)}
      <div className="pb-hd__sectors">
        {[0, 1, 2].map((i) => {
          const s = sectors[i];
          const cls = !s || s.time == null ? "" : s.status === "best" ? "pb-best" : "pb-warn";
          return (
            <div key={i} className={`pb-hd__sector ${s?.fresh ? "" : "pb-dim"}`}>
              <span className="pb-lbl">S{i + 1}</span>
              <b className={`pb-num ${cls}`}>{secStr(s?.time)}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
};
