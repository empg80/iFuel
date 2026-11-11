// components/RaceStandingsWidget.tsx
import clsx from "clsx";
import type { RaceStandingsWidgetProps, StandingsRow } from "../types/standings";
import { formatLapTimeSeconds } from "../utils/relativeFormat";
import { fitStandings } from "../utils/standingsFilter";

/** Distancia al coche de delante de la misma clase: "+1.234", "+1L" si va doblado, "—" para el primero. */
function formatInterval(row: StandingsRow, ahead: StandingsRow | undefined): string {
  if (!ahead) return "—";
  if (row.lapsDown !== ahead.lapsDown) {
    const d = row.lapsDown - ahead.lapsDown;
    return d > 0 ? `+${d}L` : "—";
  }
  if (row.gapToLeader == null || ahead.gapToLeader == null) return "--";
  const g = row.gapToLeader - ahead.gapToLeader;
  if (!(g >= 0)) return "--";
  return `+${g < 100 ? g.toFixed(1) : Math.round(g)}`;
}

const PENALTY: Record<string, { txt: string; cls: string; title: string }> = {
  black: { txt: "⚑ NEGRA", cls: "black", title: "Bandera negra (sanción)" },
  dq: { txt: "DQ", cls: "black", title: "Descalificado" },
  repair: { txt: "⚑ NARANJA", cls: "repair", title: "Bandera naranja: reparar" },
  warn: { txt: "⚑ AVISO", cls: "warn", title: "Bandera negra y blanca: aviso" },
};

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
  maxRows,
}: RaceStandingsWidgetProps) {
  // Top 10 de cada clase + 3 por delante y 3 por detrás de ti si no estás entre ellos
  const groups = fitStandings(rows, myCarNumber, maxRows);
  const multi = groups.length > 1;
  const classLists = new Map<number, StandingsRow[]>();
  for (const r of [...rows].sort((a, b) => a.position - b.position)) {
    const l = classLists.get(r.classId) ?? [];
    l.push(r);
    classLists.set(r.classId, l);
  }

  return (
    <div className="widget race-standings-widget">
      <div className="race-standings__head">
        <div className="widget__header">STANDINGS</div>
        {clock ? (
          <div className="race-standings__clock" data-low={clock.low ? "1" : "0"}>
            <span className="race-standings__clock-time">{clock.time}</span>
            <span className="race-standings__clock-cap">{clock.cap}</span>
            {clock.extra && <span className="race-standings__clock-extra">{clock.extra}</span>}
          </div>
        ) : null}
      </div>
      <div className={clsx("race-standings__table", multi && "race-standings__table--multi")}>
        <div className="race-standings__row race-standings__row--header">
          <span>POS</span>
          {multi && <span>CLS</span>}
          <span>#</span>
          <span>DRIVER</span>
          <span>iR</span>
          <span>BEST LAP</span>
          <span>GAP</span>
          <span className="race-standings__h-stint">STINT</span>
          <span className="race-standings__h-pit">LAST PIT</span>
        </div>

        {groups.map((g) => {
          const rawIndex = classColorIndexById[g.classId] ?? 0;
          const classColorIndex = rawIndex % 6;
          return (
            <div key={g.classId} className="race-standings__group">
              {multi && (
                <div className={clsx("race-standings__class", `race-standings__class--${classColorIndex}`)}>
                  <span className="race-standings__class-name">
                    {(classNames?.[g.classId] ?? `CLASS ${classColorIndex + 1}`).toUpperCase()}
                  </span>
                  <span className="race-standings__class-count">{g.total} {g.total === 1 ? "car" : "cars"}</span>
                </div>
              )}
              {g.items.map((item, i) => {
                if (item.kind === "gap") {
                  return (
                    <div key={`gap-${g.classId}-${i}`} className="race-standings__gap" aria-hidden="true">
                      ··· {item.hidden} more
                    </div>
                  );
                }
                const row = item.row;
                // Coche de delante en su clase (aunque no se muestre, p. ej. tras un hueco)
                const ahead = item.classPos > 1 ? classLists.get(g.classId)?.[item.classPos - 2] : undefined;
                const isMe = row.carNumber === myCarNumber;
                return (
                  <div
                    key={row.carNumber}
                    className={clsx(
                      "race-standings__row",
                      `race-standings__row--class-${classColorIndex}`,
                      isMe && "race-standings__row--me",
                    )}
                  >
                    <span className="race-standings__cell race-standings__cell--pos">{row.position}</span>
                    {multi && (
                      <span className={clsx("race-standings__cell race-standings__cell--cls", `race-standings__cls--${classColorIndex}`)}>
                        {item.classPos}
                      </span>
                    )}
                    <span className="race-standings__cell race-standings__cell--car">
                      <span className={clsx("class-badge", `class-badge--${classColorIndex}`)}>{row.carNumber}</span>
                    </span>
                    <span className="race-standings__cell race-standings__cell--driver">
                      {isMe && <span className="race-standings__me-mark" aria-hidden="true">▶</span>}
                      <span className="race-standings__name">{row.driverName}</span>
                      {row.inPit && <span className="race-standings__tag race-standings__tag--pit" title="En boxes">PIT</span>}
                      {row.penalty && (
                        <span className={clsx("race-standings__tag", `race-standings__tag--${PENALTY[row.penalty].cls}`)} title={PENALTY[row.penalty].title}>
                          {PENALTY[row.penalty].txt}
                        </span>
                      )}
                    </span>
                    <span className="race-standings__cell race-standings__cell--ir">
                      {row.iRating != null ? (row.iRating >= 1000 ? `${(row.iRating / 1000).toFixed(1)}k` : row.iRating) : "–"}
                    </span>
                    <span className="race-standings__cell race-standings__cell--best">
                      {formatLapTimeSeconds(row.bestLapTime)}
                    </span>
                    <span className="race-standings__cell race-standings__cell--gap">{formatInterval(row, ahead)}</span>
                    <span className="race-standings__cell race-standings__cell--stint">{row.stintLapCount}</span>
                    <span className="race-standings__cell race-standings__cell--pit">
                      {formatPit(row.lastPitDurationSeconds)}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
