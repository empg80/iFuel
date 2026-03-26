// src/components/ReplayTowerWidget.tsx
import React, { useMemo, useEffect, useRef } from "react";
import type { CSSProperties } from "react";

import type { StandingsRow } from "../types/standings";
import type { IfuelState } from "../useIfuelWebSocket";

type YellowWarning = {
  active: boolean;
  distanceMeters: number | null;
  timeSeconds: number | null;
  carNum: number | string | null;
  classId: number | null;
  classPosition: number | null;
} | null;

type ReplayTowerState = Pick<
  IfuelState,
  | "classColorIndexById"
  | "sessionLapsRemainEx"
  | "sessionTimeRemain"
  | "yellowWarning"
>;

type Props = {
  state: ReplayTowerState;
  rows: StandingsRow[];
  highlightCarNumber?: string | null;
  seriesName: string;
};

function formatShortName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];

  const last = parts[parts.length - 1];
  const first = parts[0];
  const initial = first.charAt(0).toUpperCase() + ".";
  return `${initial} ${last}`;
}

function formatGapCombined(car: StandingsRow): string {
  if (car.lapsDown > 0) return `L${car.lapsDown}`;
  if (car.gapToLeader == null) return "--";
  if (car.gapToLeader <= 0.001) return "LEAD";
  return `+${car.gapToLeader.toFixed(3)}`;
}

export const ReplayTowerWidget: React.FC<Props> = ({
  state,
  rows,
  highlightCarNumber = null,
  seriesName,
}) => {
  const standings = useMemo<StandingsRow[]>(() => {
    return [...rows].sort((a, b) => a.position - b.position);
  }, [rows]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const lapsRemain = state.sessionLapsRemainEx ?? null;
  const timeRemain = state.sessionTimeRemain ?? null;
  const yellowWarning: YellowWarning = state.yellowWarning ?? null;

  function isRaceFinished() {
    const hasLaps = lapsRemain != null && lapsRemain > 0 && lapsRemain < 1000;
    const hasTime = timeRemain != null && timeRemain > 0;
    return !hasLaps && !hasTime;
  }

  function isWhiteFlagLap() {
    if (lapsRemain != null && lapsRemain === 1) return true;
    if (timeRemain != null && timeRemain > 0 && timeRemain <= 90) return true;
    return false;
  }

  function getFlagStatus() {
    if (isRaceFinished()) return "replay-nascar-flag--checkered";
    if (isWhiteFlagLap()) return "replay-nascar-flag--white";
    if (yellowWarning?.active) return "replay-nascar-flag--yellow";
    return "replay-nascar-flag--green";
  }

  const flagClass = getFlagStatus();

  const sessionLabel = useMemo(() => {
    if (lapsRemain != null && lapsRemain > 0 && lapsRemain < 1000) {
      return `-${lapsRemain} LAPS`;
    }
    if (timeRemain != null && timeRemain > 0) {
      const mm = Math.floor(timeRemain / 60)
        .toString()
        .padStart(2, "0");
      const ss = Math.floor(timeRemain % 60)
        .toString()
        .padStart(2, "0");
      return `${mm}:${ss} REM`;
    }
    return "-- / -- LAPS";
  }, [lapsRemain, timeRemain]);

  const CLASS_PALETTE = [
    "#1c92ff",
    "#ff7a1c",
    "#9b59ff",
    "#2ecc71",
    "#f1c40f",
    "#e74c3c",
  ];

  const getClassColor = (classId: number): string => {
    const idx = state.classColorIndexById?.[classId];
    if (idx == null) return "#777";
    return CLASS_PALETTE[idx % CLASS_PALETTE.length];
  };

  const rowStyle = (classId: number): CSSProperties => ({
    ["--class-color" as string]: getClassColor(classId),
  });

  const isMe = (car: StandingsRow) =>
    !!highlightCarNumber &&
    car.carNumber.replace(/^0+/, "") === highlightCarNumber.replace(/^0+/, "");

  // scroll solo para los que van del 11º en adelante
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let direction = 1;
    const step = 0.8; // más pequeño
    const delay = 30; // volvemos a 30 ms

    const interval = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;

      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) return;

      el.scrollTop += step * direction;

      if (el.scrollTop >= maxScroll) {
        el.scrollTop = maxScroll;
        direction = -1;
      } else if (el.scrollTop <= 0) {
        el.scrollTop = 0;
        direction = 1;
      }
    }, delay);

    return () => clearInterval(interval);
  }, [standings.length]);

  const top10 = standings.slice(0, 10);
  const rest = standings.slice(10);

  return (
    <div className="replay-nascar-card">
      <header className="replay-nascar-header">
        <div className={`replay-nascar-flag-bar ${flagClass}`} />
        <div className="replay-nascar-header-main">
          <div className="replay-nascar-series-logo-slot" />
          <div className="replay-nascar-series-info">
            <div className="replay-nascar-series-name">{seriesName}</div>
            <div className="replay-nascar-session-meta">
              <span>{sessionLabel}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="replay-nascar-table">
        <div className="replay-nascar-table-header">
          <span className="col-cat">CAT</span>
          <span className="col-pos">POS</span>
          <span className="col-num">CAR</span>
          <span className="col-name">DRIVER</span>
          <span className="col-gap">GAP</span>
        </div>

        <div className="replay-nascar-table-body">
          {/* Top 10 fijos */}
          {top10.map((car, idx) => (
            <div
              key={`${car.position}-${car.carNumber}`}
              className={
                "replay-nascar-row" +
                (idx === 9 ? " is-divider" : "") +
                (isMe(car) ? " is-focus" : "")
              }
              style={rowStyle(car.classId)}
            >
              <span className="cell-pos">{car.position}</span>
              <span className="cell-num">{car.carNumber}</span>
              <span className="cell-name">
                {formatShortName(car.driverName)}
              </span>
              <span className="cell-gap">{formatGapCombined(car)}</span>
            </div>
          ))}

          {/* Resto con scroll */}
          <div className="replay-nascar-scroll-rest" ref={scrollRef}>
            {rest.map((car) => (
              <div
                key={`${car.position}-${car.carNumber}`}
                className={"replay-nascar-row" + (isMe(car) ? " is-focus" : "")}
                style={rowStyle(car.classId)}
              >
                <span className="cell-pos">{car.position}</span>
                <span className="cell-num">{car.carNumber}</span>
                <span className="cell-name">
                  {formatShortName(car.driverName)}
                </span>
                <span className="cell-gap">{formatGapCombined(car)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`replay-nascar-footer-flag ${flagClass}`} />
    </div>
  );
};
