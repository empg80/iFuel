import React, { useMemo } from "react";

type RelativeCar = {
  carNum: number | string | null;
  position?: number | null;
  gapSeconds: number | null;
  lastLap: number | null;
  bestLap: number | null;
  deltaLastToMe: number | null;
  classId?: number | null;
  classPosition?: number | null;
} | null;

type OnTrackCar = {
  carNum: number | string | null;
  gapSeconds: number | null;
  lapsDiff: number | null;
  classId?: number | null;
  classPosition?: number | null;
} | null;

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

type ClassColor = { bg: string; text: string };

const CLASS_COLORS: ClassColor[] = [
  { bg: "#4caf50", text: "#ffffff" },
  { bg: "#2196f3", text: "#ffffff" },
  { bg: "#ff9800", text: "#000000" },
  { bg: "#9c27b0", text: "#ffffff" },
  { bg: "#f44336", text: "#ffffff" },
  { bg: "#607d8b", text: "#ffffff" },
];

function getClassColor(
  classId?: number | null,
  classColorIndexById?: Record<number, number>,
): ClassColor {
  if (classId == null) return { bg: "#444", text: "#fff" };
  const idxRaw =
    classColorIndexById && classColorIndexById[classId] != null
      ? classColorIndexById[classId]
      : 0;
  const idx = idxRaw % CLASS_COLORS.length;
  return CLASS_COLORS[idx] ?? { bg: "#444", text: "#fff" };
}

function ClassBadge(props: {
  classId?: number | null;
  classPosition?: number | null;
  classColorIndexById?: Record<number, number>;
  small?: boolean;
}) {
  const { classId, classPosition, classColorIndexById, small } = props;
  if (classId == null || !classPosition || classPosition <= 0) return null;

  const { bg, text } = getClassColor(classId, classColorIndexById);
  const size = small ? { w: 20, h: 16, fs: 10 } : { w: 24, h: 20, fs: 12 };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size.w,
        height: size.h,
        borderRadius: 3,
        backgroundColor: bg,
        color: text,
        fontSize: size.fs,
        fontWeight: 600,
        marginLeft: 4,
      }}
    >
      {`P${classPosition}`}
    </div>
  );
}

function formatGap(seconds: number | null | undefined): string {
  if (!seconds || !Number.isFinite(seconds)) return "--";
  const sign = seconds >= 0 ? "" : "-";
  const abs = Math.abs(seconds);
  const ss = Math.floor(abs).toString().padStart(2, "0");
  const dcm = Math.round((abs % 1) * 1000)
    .toString()
    .padStart(3, "0");
  return `${sign}${ss}.${dcm}`;
}

function formatLapTime(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "--:--.---";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

function formatDelta(delta: number | null | undefined): string {
  if (!delta || !Number.isFinite(delta)) return "";
  const sign = delta > 0 ? "+" : "";
  const abs = delta;
  const dcm = Math.round(Math.abs(abs) * 1000)
    .toString()
    .padStart(3, "0");
  return `${sign}0.${dcm}`;
}

export const RelativeWidget: React.FC<RelativeWidgetProps> = React.memo(
  function RelativeWidget({
    ahead,
    behind,
    myPosition,
    myLastLap,
    myBestLap,
    onTrackAhead,
    onTrackBehind,
    classColorIndexById,
  }) {
    const { aheadPos, behindPos } = useMemo(() => {
      const clamp = (v: number) => Math.max(0, Math.min(1, v));
      const MAX_GAP = 5;

      const aheadGap = ahead?.gapSeconds ?? null;
      const behindGap = behind?.gapSeconds ?? null;

      const aheadPos =
        aheadGap != null
          ? 0.5 + clamp(Math.min(aheadGap / MAX_GAP, 1)) * 0.5
          : 0.5;
      const behindPos =
        behindGap != null
          ? 0.5 - clamp(Math.min(behindGap / MAX_GAP, 1)) * 0.5
          : 0.5;

      return { aheadPos, behindPos };
    }, [ahead, behind]);

    const behindDeltaText = formatDelta(behind?.deltaLastToMe ?? null);
    const aheadDeltaText = formatDelta(ahead?.deltaLastToMe ?? null);

    const renderOnTrackCar = (label: string, car: OnTrackCar) => {
      if (!car) {
        return (
          <div
            style={{
              fontSize: 12,
              color: "#777",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div className="label">{label}</div>
            <div>-- / --</div>
          </div>
        );
      }

      let color = "#f5f5f5";
      if (car.lapsDiff != null) {
        if (car.lapsDiff < 0) color = "#4da3ff";
        else if (car.lapsDiff > 0) color = "#ff5252";
      }

      return (
        <div
          style={{
            fontSize: 12,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <div className="label">{label}</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto auto auto",
              alignItems: "center",
              columnGap: 6,
            }}
          >
            {/* CarNum + clase */}
            <span
              style={{
                minWidth: 36,
                background: "#222",
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                color,
              }}
            >
              {car.carNum ?? "--"}
              <ClassBadge
                small
                classId={car.classId ?? null}
                classPosition={car.classPosition ?? null}
                classColorIndexById={classColorIndexById}
              />
            </span>

            {/* Gap */}
            <span style={{ color, fontSize: 12, fontWeight: 600 }}>
              {formatGap(car.gapSeconds)}
            </span>

            {/* Laps diff */}
            <span style={{ fontSize: 11, color }}>
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
      <div
        className="fuel-widget relative-widget"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minWidth: 340,
          fontSize: 12,
        }}
      >
        {/* Fila 1: BEHIND / YOU / AHEAD */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 0.7fr 1fr",
            alignItems: "center",
            columnGap: 8,
          }}
        >
          {/* BEHIND */}
          <div style={{ minWidth: 0 }}>
            <div className="label">BEHIND</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  minWidth: 36,
                  background: "#222",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                {behind?.carNum ?? "--"}
                <ClassBadge
                  classId={behind?.classId ?? null}
                  classPosition={behind?.classPosition ?? null}
                  classColorIndexById={classColorIndexById}
                />
              </span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {formatGap(behind?.gapSeconds ?? null)}
              </span>
            </div>
          </div>

          {/* YOU */}
          <div style={{ textAlign: "center", minWidth: 0 }}>
            <div className="label">POS</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#4da3ff",
              }}
            >
              {myPosition ?? "--"}
            </div>
          </div>

          {/* AHEAD */}
          <div style={{ minWidth: 0, textAlign: "right" }}>
            <div className="label">AHEAD</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                justifyContent: "flex-end",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {formatGap(ahead?.gapSeconds ?? null)}
              </span>
              <span
                style={{
                  minWidth: 36,
                  background: "#222",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
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
        <div
          style={{
            position: "relative",
            height: 12,
            marginTop: 2,
            background:
              "linear-gradient(to right, #444 0%, #777 50%, #444 100%)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              bottom: 0,
              width: 2,
              background: "#ff9100",
              transform: "translateX(-50%)",
            }}
          />
          {behind && (
            <div
              style={{
                position: "absolute",
                left: `${behindPos * 100}%`,
                top: 1,
                transform: "translateX(-50%)",
                fontSize: 10,
                color: "#ff5252",
              }}
            >
              ◀
            </div>
          )}
          {ahead && (
            <div
              style={{
                position: "absolute",
                left: `${aheadPos * 100}%`,
                top: 1,
                transform: "translateX(-50%)",
                fontSize: 10,
                color: "#4caf50",
              }}
            >
              ▶
            </div>
          )}
        </div>

        {/* Fila 3: tiempos/deltas */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 2,
            gap: 8,
          }}
        >
          {/* BEHIND */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color:
                  behind?.deltaLastToMe && behind?.deltaLastToMe > 0
                    ? "#f44336"
                    : "#b0b0b0",
              }}
            >
              {behindDeltaText || "--"}
            </div>
            <div className="label">LAST / BEST</div>
            <div style={{ fontSize: 12 }}>
              {formatLapTime(behind?.lastLap ?? null)}{" "}
              <span style={{ opacity: 0.7 }}>
                ({formatLapTime(behind?.bestLap ?? null)})
              </span>
            </div>
          </div>

          {/* YOU */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: "center",
            }}
          >
            <div className="label">YOU</div>
            <div style={{ fontSize: 12 }}>
              {formatLapTime(myLastLap)}{" "}
              <span style={{ opacity: 0.7 }}>
                ({formatLapTime(myBestLap)})
              </span>
            </div>
          </div>

          {/* AHEAD */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: "right",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color:
                  ahead?.deltaLastToMe != null && ahead?.deltaLastToMe < 0
                    ? "#4caf50"
                    : "#b0b0b0",
              }}
            >
              {aheadDeltaText || "--"}
            </div>
            <div className="label">LAST / BEST</div>
            <div style={{ fontSize: 12 }}>
              {formatLapTime(ahead?.lastLap ?? null)}{" "}
              <span style={{ opacity: 0.7 }}>
                ({formatLapTime(ahead?.bestLap ?? null)})
              </span>
            </div>
          </div>
        </div>

        {/* Separador glass */}
        <div className="fuel-separator" />

        {/* On-track relative */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            columnGap: 8,
            marginTop: 4,
          }}
        >
          {renderOnTrackCar("ON-TRACK BEHIND", onTrackBehind ?? null)}
          {renderOnTrackCar("ON-TRACK AHEAD", onTrackAhead ?? null)}
        </div>
      </div>
    );
  },
);
