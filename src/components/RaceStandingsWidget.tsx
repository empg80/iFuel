// components/RaceStandingsWidget.tsx
import type { RaceStandingsWidgetProps } from "../types/standings";

function formatLap(sec: number | null): string {
  if (sec == null) return "--.--";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${s.toFixed(3).padStart(6, "0")}` : s.toFixed(3);
}

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
    <div className="widget race-standings">
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
          const classColorIndex = classColorIndexById[row.classId] ?? 0;

          return (
            <div
              key={row.carNumber}
              className={
                "race-standings__row" + (isMe ? " race-standings__row--me" : "")
              }
            >
              <span className="race-standings__cell race-standings__cell--pos">
                {row.position}
              </span>
              <span className="race-standings__cell race-standings__cell--car">
                <span className={`class-badge class-badge--${classColorIndex}`}>
                  {row.carNumber}
                </span>
              </span>
              <span className="race-standings__cell race-standings__cell--driver">
                {row.driverName}
              </span>
              <span className="race-standings__cell race-standings__cell--best">
                {formatLap(row.bestLapTime)}
              </span>
              <span className="race-standings__cell race-standings__cell--stint">
                {row.stintLaps}
              </span>
              <span className="race-standings__cell race-standings__cell--pit">
                {formatPit(row.lastPitTime)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
