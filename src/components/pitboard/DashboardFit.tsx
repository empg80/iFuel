import React, { useEffect, useRef, useState } from "react";
import type { IfuelState } from "../../useIfuelWebSocket";
import { DashboardWidget } from "../DashboardWidget";

/** Dashboard de volante escalado para llenar el hueco del pitboard (diseño base 640×300). */
export const DashboardFit: React.FC<{ state: IfuelState | null }> = ({ state }) => {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const fit = () => setScale(Math.max(0.5, Math.min(el.clientWidth / 640, el.clientHeight / 300)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="pb-dashfit">
      <div style={{ width: 640, height: 300, transform: `scale(${scale})`, transformOrigin: "center center" }}>
        <DashboardWidget state={state} />
      </div>
    </div>
  );
};
