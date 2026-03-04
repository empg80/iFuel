import React, { useMemo } from "react";
import type { RelativeCar, OnTrackCar } from "../types/relative";
import {
  formatGap,
  formatLapTimeSeconds,
  formatDelta,
} from "../utils/relativeFormat";
import { ClassBadge } from "./ClassBadge";

type RelativeWidgetProps = {
  ahead: RelativeCar;
  behind: RelativeCar;
  myPosition?: number | null;
  myLastLap?: number | null;
  myBestLap?: number | null;
  onTrackAhead?: OnTrackCar | null;
  onTrackBehind?: OnTrackCar | null;
  classColorIndexById?: Record<number, number> | undefined;
};

export const RelativeWidget = React.memo(function RelativeWidget({
  ahead,
  behind,
  myPosition,
  myLastLap,
  myBestLap,
  onTrackAhead,
  onTrackBehind,
  classColorIndexById,
}: RelativeWidgetProps) {
  const { aheadPos, behindPos } = useMemo(() => {
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const MAX_GAP = 5; // segundos

    const aheadGap = ahead?.gapSeconds ?? null;
    const behindGap = behind?.gapSeconds ?? null;

    let aheadPos = 0.5;
    let behindPos = 0.5;

    if (aheadGap != null) {
      const mag = clamp01(Math.abs(aheadGap) / MAX_GAP);
      // de centro (0.5) hacia la derecha (1) según gap
      aheadPos = 0.5 + mag * 0.5;
    }

    if (behindGap != null) {
      const mag = clamp01(Math.abs(behindGap) / MAX_GAP);
      // de centro (0.5) hacia la izquierda (0) según gap
      behindPos = 0.5 - mag * 0.5;
    }

    return { aheadPos, behindPos };
  }, [ahead, behind]);

  const behindDeltaText = formatDelta(behind?.deltaLastToMe ?? null);
  const aheadDeltaText = formatDelta(ahead?.deltaLastToMe ?? null);

  const renderOnTrackCar = (label: string, car: OnTrackCar) => {
    if (!car) {
      return (
        <div className="relative-ontrack relative-ontrack--empty">
          <div className="label">{label}</div>
          <div>-- / --</div>
        </div>
      );
    }

    let colorClass = "relative-ontrack__text";
    if (car.lapsDiff != null) {
      if (car.lapsDiff < 0) colorClass += " relative-ontrack__text--lapped";
      else if (car.lapsDiff > 0)
        colorClass += " relative-ontrack__text--ahead-lap";
    }

    return (
      <div className="relative-ontrack">
        <div className="label">{label}</div>
        <div className="relative-ontrack__row">
          <span className={`relative-ontrack__car ${colorClass}`}>
            {car.carNum ?? "--"}
            <ClassBadge
              small
              classId={car.classId ?? null}
              classPosition={car.classPosition ?? null}
              classColorIndexById={classColorIndexById}
            />
          </span>

          <span className={`relative-ontrack__gap ${colorClass}`}>
            {formatGap(car.gapSeconds)}
          </span>

          <span className={`relative-ontrack__laps ${colorClass}`}>
            {car.lapsDiff == null
              ? ""
              : car.lapsDiff === 0
                ? "same lap"
                : car.lapsDiff > 0
                  ? `+${car.lapsDiff}L`
                  : `${car.lapsDiff}L`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="fuel-widget relative-widget">
      {/* Fila 1: BEHIND / YOU / AHEAD */}
      <div className="relative-row relative-row--top">
        {/* BEHIND */}
        <div className="relative-cell relative-cell--behind">
          <div className="label">BEHIND</div>
          <div className="relative-car-row">
            <span className="relative-car relative-car--behind">
              {behind?.carNum ?? "--"}
              <ClassBadge
                classId={behind?.classId ?? null}
                classPosition={behind?.classPosition ?? null}
                classColorIndexById={classColorIndexById}
              />
            </span>
            <span className="relative-gap">
              {formatGap(behind?.gapSeconds ?? null)}
            </span>
          </div>
        </div>

        {/* YOU */}
        <div className="relative-cell relative-cell--you">
          <div className="label">POS</div>
          <div className="relative-pos">{myPosition ?? "--"}</div>
        </div>

        {/* AHEAD */}
        <div className="relative-cell relative-cell--ahead">
          <div className="label">AHEAD</div>
          <div className="relative-car-row relative-car-row--right">
            <span className="relative-gap">
              {formatGap(ahead?.gapSeconds ?? null)}
            </span>
            <span className="relative-car relative-car--ahead">
              {ahead?.carNum ?? "--"}
              <ClassBadge
                classId={ahead?.classId ?? null}
                classPosition={ahead?.classPosition ?? null}
                classColorIndexById={classColorIndexById}
              />
            </span>
          </div>
        </div>
      </div>

      {/* Fila 2: barra central */}
      <div className="relative-bar">
        <div className="relative-bar__center" />
        {behind && (
          <div
            className="relative-bar__marker relative-bar__marker--behind"
            style={{ left: `${behindPos * 100}%` }}
          />
        )}
        {ahead && (
          <div
            className="relative-bar__marker relative-bar__marker--ahead"
            style={{ left: `${aheadPos * 100}%` }}
          />
        )}
      </div>

      {/* Fila 3: tiempos/deltas */}
      <div className="relative-row relative-row--times">
        {/* BEHIND */}
        <div className="relative-times relative-times--behind">
          <div
            className={
              behind?.deltaLastToMe && behind?.deltaLastToMe > 0
                ? "relative-delta relative-delta--bad"
                : "relative-delta"
            }
          >
            {behindDeltaText || "--"}
          </div>
          <div className="label">LAST / BEST</div>
          <div className="relative-laptimes">
            {formatLapTimeSeconds(behind?.lastLap ?? null)}{" "}
            <span className="relative-laptimes__best">
              ({formatLapTimeSeconds(behind?.bestLap ?? null)})
            </span>
          </div>
        </div>

        {/* YOU */}
        <div className="relative-times relative-times--you">
          <div className="label">YOU</div>
          <div className="relative-laptimes">
            {formatLapTimeSeconds(myLastLap)}{" "}
            <span className="relative-laptimes__best">
              ({formatLapTimeSeconds(myBestLap)})
            </span>
          </div>
        </div>

        {/* AHEAD */}
        <div className="relative-times relative-times--ahead">
          <div
            className={
              ahead?.deltaLastToMe != null && ahead?.deltaLastToMe < 0
                ? "relative-delta relative-delta--good"
                : "relative-delta"
            }
          >
            {aheadDeltaText || "--"}
          </div>
          <div className="label">LAST / BEST</div>
          <div className="relative-laptimes">
            {formatLapTimeSeconds(ahead?.lastLap ?? null)}{" "}
            <span className="relative-laptimes__best">
              ({formatLapTimeSeconds(ahead?.bestLap ?? null)})
            </span>
          </div>
        </div>
      </div>

      <div className="fuel-separator" />

      {/* On-track relative */}
      <div className="relative-ontrack-grid">
        {renderOnTrackCar("ON-TRACK BEHIND", onTrackBehind ?? null)}
        {renderOnTrackCar("ON-TRACK AHEAD", onTrackAhead ?? null)}
      </div>
    </div>
  );
});
