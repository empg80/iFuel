import type { YellowWarning } from "../types/yellow";
import { ClassBadge } from "./ClassBadge";

type Props = {
  warning: YellowWarning;
  classColorIndexById?: Record<number, number>;
};

export const YellowFlagWidget = ({ warning, classColorIndexById }: Props) => {
  const w = warning;

  const isActiveYellow = !!w && w.active;
  const isDebris = isActiveYellow && w.type === "debris";

  const distanceStr =
    isActiveYellow && w && w.distanceMeters != null
      ? `${Math.round(w.distanceMeters)} m`
      : "-- m";

  const timeStr =
    isActiveYellow && w && w.timeSeconds != null
      ? `${w.timeSeconds.toFixed(1)} s`
      : "--.- s";

  const title = isActiveYellow
    ? isDebris
      ? "DEBRIS / SURFACE"
      : "YELLOW FLAG"
    : "GREEN FLAG";

  const statusLine = isActiveYellow
    ? `Ahead: ${distanceStr} / ${timeStr}`
    : "Track clear";

  const iconBackground = !isActiveYellow
    ? "#00c853"
    : isDebris
    ? "repeating-linear-gradient(45deg, #ffd000 0 6px, #ffd000 6px 10px, #b00000 10px 14px)"
    : "#ffd000";

  const iconText = isActiveYellow ? "⚑" : "✓";

  return (
    <div className="fuel-widget yellow-flag-widget">
      <div
        className="yellow-flag-widget__icon"
        style={{ background: iconBackground }}
      >
        <span className="yellow-flag-widget__icon-text">{iconText}</span>
      </div>

      <div className="yellow-flag-widget__content">
        <div className="label">{title}</div>
        <div className="value yellow-flag-widget__status">{statusLine}</div>

        {isActiveYellow && w && (
          <div className="yellow-flag-widget__incident">
            Incident car:{" "}
            <ClassBadge
              small
              classId={w.classId}
              classPosition={w.classPosition}
              classColorIndexById={classColorIndexById}
            />{" "}
            {w.carNum != null ? `#${w.carNum}` : "N/A"}
          </div>
        )}
      </div>
    </div>
  );
};
