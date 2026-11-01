import React from "react";
import type { PedalTrace } from "../../types/car";

const W = 400;
const H = 80;
const line = (v: number[], cap: number) =>
  v.map((y, i) => `${((i / Math.max(1, cap - 1)) * W).toFixed(1)},${(H - (y / 100) * (H - 4) - 2).toFixed(1)}`).join(" ");

export const PedalTraceChart: React.FC<{ trace: PedalTrace | null }> = ({ trace }) => {
  const cap = trace ? Math.max(trace.throttle.length, Math.round(trace.hz * 8)) : 160;
  return (
    <div className="pb-panel pb-trace">
      <span className="pb-lbl pb-trace__lbl">Acelerador · Freno</span>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        {trace && trace.throttle.length > 1 && (
          <>
            <polyline points={line(trace.throttle, cap)} className="pb-trace__t" />
            <polyline points={line(trace.brake, cap)} className="pb-trace__b" />
          </>
        )}
      </svg>
    </div>
  );
};
