// components/RaceStandingsWidget.tsx
import clsx from "clsx";
import type { RaceStandingsWidgetProps } from "../types/standings";
import { formatLapTimeSeconds } from "../utils/relativeFormat";
import { ClassLegend } from "./ClassLegend";
import { filterStandings } from "../utils/standingsFilter";

function formatPit(sec: number | null): string {
  if (sec == null) return "--.-";
  return sec.toFixed(1);
}

export function RaceStandingsWidget({
  rows,
  myCarNumber,
  classColorIndexById,
  classNames,
  clock,
}: RaceStandingsWidgetProps) {
  // Top 10 de cada clase + 3 por delante y 3 por detrás de ti si no estás entre ellos
  const items = filterStandings(rows, myCarNumber);

  return (
    <div className="widget race-standings-widget">
      <div className="race-standings__head">
        <div className="widget__header">STANDINGS</div>
        {clock ? (
          <div className="race-standings__clock" data-low={clock.low ? "1" : "0"}>
            <span className="race-standings__clock-time">{clock.time}</span>
            <span className="race-standings__clock-cap">{clock.cap}</span>
          </div>
        ) : null}
      </div>
      <div className="race-standings__table">
        <div className="race-standings__row race-standings__row--header">
          <span>POS</span>
          <span>#</span>
          <span>DRIVER</span>
          <span>BEST LAP</span>
          <span>STINT</span>
          <span>LAST PIT</span>
        </div>

        {items.map((item, i) => {
          if (item.kind === "gap") {
            return (
              <div key={`gap-${i}`} className="race-standings__gap" aria-hidden="true">
                ··· {item.hidden} more
              </div>
            );
          }
          const row = item.row;
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
                {isMe && <span className="race-standings__me-mark" aria-hidden="true">▶</span>}
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
      <ClassLegend classColorIndexById={classColorIndexById} classNames={classNames} />
    </div>
  );
}
