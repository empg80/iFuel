import type { YellowWarning } from "../types/yellow";
import { ClassBadge } from "./ClassBadge";

type Props = {
  warning: YellowWarning;
  classColorIndexById?: Record<number, number>;
  classNames?: Record<number, string>;
};

/** A partir de esta distancia la barra de aproximación empieza a llenarse */
const APPROACH_METERS = 1000;
/** Por debajo, el aviso pulsa */
const CLOSE_METERS = 250;

const FlagIcon = ({ variant }: { variant: "clear" | "yellow" | "debris" }) => (
  <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" className="yfw__flag">
    {variant === "clear" ? (
      <path d="M7 17.5l6 6 12-13" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <>
        <path d="M8 4v25" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M10 6c4-2.4 7 2.4 11 0 1.6-.9 3-1.3 4.2-1.2v13c-1.2-.1-2.6.3-4.2 1.2-4 2.4-7-2.4-11 0z" fill="currentColor" />
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

  const title = !active ? "TRACK CLEAR" : isDebris ? "DEBRIS ON TRACK" : "YELLOW FLAG";
  // 0 = lejos / 1 = encima del incidente
  const approach = hasDistance ? Math.min(1, Math.max(0, 1 - (w!.distanceMeters as number) / APPROACH_METERS)) : 0;
  const close = hasDistance && (w!.distanceMeters as number) <= CLOSE_METERS;

  return (
    <div className="fuel-widget yfw" data-state={state} data-close={close ? "1" : "0"} role="status" aria-live="polite">
      <div className="yfw__icon">
        <FlagIcon variant={state} />
      </div>

      <div className="yfw__body">
        <div className="yfw__title">{title}</div>

        {active ? (
          hasDistance ? (
            <div className="yfw__readout">
              <span className="yfw__dist">{meters}<small>m</small></span>
              {seconds != null && <span className="yfw__eta">{seconds}<small>s</small></span>}
            </div>
          ) : (
            <div className="yfw__hint">Caution ahead</div>
          )
        ) : (
          <div className="yfw__hint">No flags on your lap</div>
        )}

        {active && (
          <div className="yfw__approach" aria-hidden="true">
            <div className="yfw__approach-fill" style={{ width: `${approach * 100}%` }} />
            <div className="yfw__approach-car" style={{ left: `${approach * 100}%` }} />
          </div>
        )}

        {active && w!.carNum != null && (
          <div className="yfw__car">
            <span>Car</span>
            <strong>#{w!.carNum}</strong>
            <ClassBadge
              small
              classId={w!.classId}
              classPosition={w!.classPosition}
              classColorIndexById={classColorIndexById}
              classNames={classNames}
            />
          </div>
        )}
      </div>
    </div>
  );
};
