import type { YellowWarning } from "../types/yellow";
import { ClassBadge } from "./ClassBadge";

type Props = {
  warning: YellowWarning;
  classColorIndexById?: Record<number, number>;
  classNames?: Record<number, string>;
};

/** A partir de esta distancia la tira de luces empieza a encenderse */
const APPROACH_METERS = 1000;
/** Por debajo, el aviso pulsa */
const CLOSE_METERS = 250;
const SEGMENTS = 12;

const Glyph = ({ state }: { state: "clear" | "yellow" | "debris" }) => (
  <svg viewBox="0 0 40 40" className="yfw__glyph" aria-hidden="true">
    {state === "clear" && (
      <path d="M9 21l8 8 14-16" fill="none" stroke="currentColor" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
    )}
    {state === "yellow" && (
      <>
        <path d="M10 5v31" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M13 8c5-3 9 3 14 0 2-1.2 3.8-1.6 5.5-1.5v16c-1.700-.1-3.500.3-5.500 1.500-5 3-9-3-14 0z" fill="currentColor" />
      </>
    )}
    {state === "debris" && (
      <>
        <path d="M20 5L37 34H3z" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinejoin="round" />
        <path d="M20 15v9" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" />
        <circle cx="20" cy="29" r="2.2" fill="currentColor" />
      </>
    )}
  </svg>
);

export const YellowFlagWidget = ({ warning, classColorIndexById, classNames }: Props) => {
  const w = warning;
  const active = !!w && w.active;
  const isDebris = active && w!.type === "debris";
  const state = !active ? "clear" : isDebris ? "debris" : "yellow";

  const hasDistance = active && w!.distanceMeters != null;
  const meters = hasDistance ? Math.round(w!.distanceMeters as number) : null;
  const seconds = hasDistance && w!.timeSeconds != null ? (w!.timeSeconds as number).toFixed(1) : null;

  const title = !active ? "TRACK CLEAR" : isDebris ? "DEBRIS" : "YELLOW FLAG";
  const kicker = !active ? "Race control" : isDebris ? "Caution · debris on track" : "Caution · incident ahead";
  const approach = hasDistance ? Math.min(1, Math.max(0, 1 - (w!.distanceMeters as number) / APPROACH_METERS)) : 0;
  const lit = hasDistance ? Math.max(1, Math.round(approach * SEGMENTS)) : 0;
  const close = hasDistance && (w!.distanceMeters as number) <= CLOSE_METERS;
  // Sin distancia (p. ej. debris sin coche localizado): las luces barren en bucle como aviso genérico
  const sweep = active && !hasDistance;

  return (
    <div className="yfw" data-state={state} data-close={close ? "1" : "0"} role="status" aria-live="polite">
      <div className="yfw__tile">
        <Glyph state={state} />
      </div>

      <div className="yfw__main">
        <div className="yfw__kicker">
          <span>{kicker}</span>
          {active && w!.carNum != null && (
            <span className="yfw__car">
              #{w!.carNum}
              <ClassBadge
                small
                classId={w!.classId}
                classPosition={w!.classPosition}
                classColorIndexById={classColorIndexById}
                classNames={classNames}
              />
            </span>
          )}
        </div>

        <div className="yfw__row">
          <span className="yfw__title">{title}</span>
          {hasDistance && (
            <span className="yfw__readout">
              <span className="yfw__dist">{meters}<small>m</small></span>
              {seconds != null && <span className="yfw__eta">{seconds}<small>s</small></span>}
            </span>
          )}
        </div>

        {active && (
          <div className="yfw__lights" data-sweep={sweep ? "1" : "0"} aria-hidden="true">
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <i
                key={i}
                className="yfw__seg"
                data-on={i < lit ? "1" : "0"}
                data-hot={i >= SEGMENTS - 3 ? "1" : "0"}
                style={sweep ? { animationDelay: `${i * 0.08}s` } : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
