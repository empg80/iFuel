// components/RaceStandingsWidget.tsx
import clsx from "clsx";
import type { RaceStandingsWidgetProps } from "../types/standings";
import { formatLapTimeSeconds } from "../utils/relativeFormat";

function formatPit(sec: number | null): string {
  if (sec == null) return "--.-";
  return sec.toFixed(1);
}

export function RaceStandingsWidget({
  rows,
  myCarNumber,
  classColorIndexById,
}: RaceStandingsWidgetProps) {
  return (
    <div className="widget race-standings-widget">
      <div className="widget__header">STANDINGS</div>
      <div className="race-standings__table">
        <div className="race-standings__row race-standings__row--header">
          <span>POS</span>
          <span>#</span>
          <span>DRIVER</span>
          <span>BEST LAP</span>
          <span>STINT</span>
          <span>LAST PIT</span>
        </div>

        {rows.map((row) => {
          const isMe = row.carNumber === myCarNumber;
          const rawIndex = classColorIndexById[row.classId] ?? 0;
          const classColorIndex = rawIndex % 6;

          return (
            <div
              key={row.carNumber}
              className={clsx(
                "race-standings__row",
                `race-standings__row--class-${classColorIndex}`,
                isMe && "race-standings__row--me",
              )}
            >
              <span className="race-standings__cell race-standings__cell--pos">
                {row.position}
              </span>
              <span className="race-standings__cell race-standings__cell--car">
                <span
                  className={clsx(
                    "class-badge",
                    `class-badge--${classColorIndex}`,
                  )}
                >
                  {row.carNumber}
                </span>
              </span>
              <span className="race-standings__cell race-standings__cell--driver">
                {row.driverName}
              </span>
              <span className="race-standings__cell race-standings__cell--best">
                {formatLapTimeSeconds(row.bestLapTime)}
              </span>
              <span className="race-standings__cell race-standings__cell--stint">
                {row.stintLapCount}
              </span>
              <span className="race-standings__cell race-standings__cell--pit">
                {formatPit(row.lastPitDurationSeconds)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
