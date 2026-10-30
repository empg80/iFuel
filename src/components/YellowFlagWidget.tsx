import type { YellowWarning } from "../types/yellow";
import { ClassBadge } from "./ClassBadge";

type Props = {
  warning: YellowWarning;
  classColorIndexById?: Record<number, number>;
  classNames?: Record<number, string>;
};

export const YellowFlagWidget = ({ warning, classColorIndexById, classNames }: Props) => {
  const w = warning;

  const isActiveYellow = !!w && w.active;
  const isDebris = isActiveYellow && w.type === "debris";

  // Solo se muestran cifras que existen: sin incidente localizado no se ponen "-- m"
  const hasDistance = isActiveYellow && w != null && w.distanceMeters != null;
  const hasTime = hasDistance && w!.timeSeconds != null;
  const distanceStr = hasDistance ? `${Math.round(w!.distanceMeters as number)} m` : "";
  const timeStr = hasTime ? `${(w!.timeSeconds as number).toFixed(1)} s` : "";

  const title = isActiveYellow
    ? isDebris
      ? "DEBRIS / SURFACE"
      : "YELLOW FLAG"
    : "GREEN FLAG";

  const flagState = !isActiveYellow ? "clear" : isDebris ? "debris" : "yellow";

  const iconBackground = !isActiveYellow
    ? "#00c853"
    : isDebris
    ? "repeating-linear-gradient(45deg, #ffd000 0 6px, #ffd000 6px 10px, #b00000 10px 14px)"
    : "#ffd000";

  const iconText = isActiveYellow ? "⚑" : "✓";

  return (
    <div className="fuel-widget yellow-flag-widget" data-state={flagState}>
      <div
        className="yellow-flag-widget__icon"
        style={{ background: iconBackground }}
      >
        <span className="yellow-flag-widget__icon-text">{iconText}</span>
      </div>

      <div className="yellow-flag-widget__content">
        <div className="label">{title}</div>
        <div className="value yellow-flag-widget__status">
          {isActiveYellow ? (
            hasDistance ? (
              <>
                <span className="yf-prefix">Ahead </span>
                <span className="yf-dist">{distanceStr}</span>
                {hasTime && (
                  <>
                    <span className="yf-sep"> · </span>
                    <span className="yf-time">{timeStr}</span>
                  </>
                )}
              </>
            ) : (
              <span className="yf-prefix">Caution on track</span>
            )
          ) : (
            "Track clear"
          )}
        </div>

        {isActiveYellow && w && w.carNum != null && (
          <div className="yellow-flag-widget__incident">
            Incident car:{" "}
            <ClassBadge
              small
              classId={w.classId}
              classPosition={w.classPosition}
              classColorIndexById={classColorIndexById}
              classNames={classNames}
            />{" "}
            {`#${w.carNum}`}
          </div>
        )}
      </div>
    </div>
  );
};
