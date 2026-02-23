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
  const size = small ? { w: 18, h: 14, fs: 9 } : { w: 22, h: 18, fs: 11 };

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
    // Posiciones en la barra central: 0 = detrás máximo, 0.5 = tú, 1 = delante máximo
    const { aheadPos, behindPos } = useMemo(() => {
      const clamp = (v: number) => Math.max(0, Math.min(1, v));
      const MAX_GAP = 5; // segundos a cada lado para la barra

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
          flex: 1,
          textAlign: "center",
          fontSize: 12,          // antes 11
          color: "#777",
        }}
      >
        {label}: -- --
      </div>
    );
  }

  let color = "#f5f5f5";
  if (car.lapsDiff != null) {
    if (car.lapsDiff < 0) color = "#4da3ff";
    else if (car.lapsDiff > 0) color = "#ff5252";
  }

  return (
    <div style={{ flex: 1, textAlign: "center", fontSize: 12 }}>
      <div style={{ fontSize: 10, color: "#b0b0b0" }}>{label}</div>
      <div
        style={{ display: "flex", justifyContent: "center", gap: 6 }}
      >
        <span
          style={{
            background: "#222",
            padding: "2px 5px",    // un pelín más grande
            borderRadius: 3,
            fontSize: 11,          // antes 10
            color,
            display: "inline-flex",
            alignItems: "center",
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
        <span style={{ color, fontSize: 12 }}>
          {formatGap(car.gapSeconds)}
        </span>
      </div>
      {car.lapsDiff != null && (
        <div style={{ fontSize: 10, color }}>
          {car.lapsDiff === 0
            ? "same lap"
            : car.lapsDiff > 0
            ? `+${car.lapsDiff} lap`
            : `${car.lapsDiff} lap`}
        </div>
      )}
    </div>
  );
};


    return (
      <div
        className="relative-widget"
        style={{
          background: "#050505",
          color: "#f5f5f5",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minWidth: 360,
          borderRadius: 4,
          boxShadow: "0 0 12px rgba(0, 0, 0, 0.8)",
          fontFamily:
            '"Roboto Mono", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: 12,
        }}
      >
        {/* Línea 1: BEHIND / POSITION / AHEAD */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          {/* BEHIND */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: "#b0b0b0",
              }}
            >
              BEHIND
            </div>
            <div
              style={{ display: "flex", alignItems: "baseline", gap: 4 }}
            >
              <span
                style={{
                  background: "#222",
                  padding: "2px 4px",
                  borderRadius: 3,
                  fontSize: 10,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {behind?.carNum ?? "--"}
                <ClassBadge
                  classId={behind?.classId ?? null}
                  classPosition={behind?.classPosition ?? null}
                  classColorIndexById={classColorIndexById}
                />
              </span>
              <span style={{ fontSize: 18, fontWeight: 600 }}>
                {formatGap(behind?.gapSeconds ?? null)}
              </span>
            </div>
          </div>

          {/* POSITION */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: "#b0b0b0",
              }}
            >
              POSITION
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#4da3ff",
              }}
            >
              {myPosition ?? "--"}
            </div>
          </div>

          {/* AHEAD */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              textAlign: "right",
            }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: "#b0b0b0",
              }}
            >
              AHEAD
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 4,
                justifyContent: "flex-end",
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 600 }}>
                {formatGap(ahead?.gapSeconds ?? null)}
              </span>
              <span
                style={{
                  background: "#222",
                  padding: "2px 4px",
                  borderRadius: 3,
                  fontSize: 10,
                  display: "inline-flex",
                  alignItems: "center",
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

        {/* Línea 2: barra central con iconos */}
        <div
          style={{
            position: "relative",
            height: 16,
            marginTop: 4,
            marginBottom: 2,
            background:
              "linear-gradient(to right, #444 0%, #777 50%, #444 100%)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {/* Flecha central (tu coche) */}
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
          {/* Icono coche detrás */}
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
          {/* Icono coche delante */}
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

        {/* Línea 3: tiempos last/best y delta */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 2,
          }}
        >
          {/* BEHIND */}
          <div style={{ minWidth: 100 }}>
            <div
              style={{
                fontSize: 11,
                color:
                  behind?.deltaLastToMe && behind?.deltaLastToMe > 0
                    ? "#f44336"
                    : "#b0b0b0",
              }}
            >
              {behindDeltaText || "--"}
            </div>
            <div style={{ fontSize: 9, color: "#b0b0b0" }}>LAST</div>
            <div style={{ fontSize: 12 }}>
              {formatLapTime(behind?.lastLap ?? null)}
            </div>
            <div
              style={{ fontSize: 9, color: "#b0b0b0", marginTop: 2 }}
            >
              BEST
            </div>
            <div style={{ fontSize: 12 }}>
              {formatLapTime(behind?.bestLap ?? null)}
            </div>
          </div>

          {/* YOU */}
          <div style={{ textAlign: "center", minWidth: 110 }}>
            <div style={{ fontSize: 9, color: "#b0b0b0" }}>YOUR LAST</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {formatLapTime(myLastLap)}
            </div>
            <div
              style={{ fontSize: 9, color: "#b0b0b0", marginTop: 2 }}
            >
              YOUR BEST
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {formatLapTime(myBestLap)}
            </div>
          </div>

          {/* AHEAD */}
          <div style={{ textAlign: "right", minWidth: 100 }}>
            <div
              style={{
                fontSize: 11,
                color:
                  ahead?.deltaLastToMe != null &&
                  ahead?.deltaLastToMe < 0
                    ? "#4caf50"
                    : "#b0b0b0",
              }}
            >
              {aheadDeltaText || "--"}
            </div>
            <div style={{ fontSize: 9, color: "#b0b0b0" }}>LAST</div>
            <div style={{ fontSize: 12 }}>
              {formatLapTime(ahead?.lastLap ?? null)}
            </div>
            <div
              style={{ fontSize: 9, color: "#b0b0b0", marginTop: 2 }}
            >
              BEST
            </div>
            <div style={{ fontSize: 12 }}>
              {formatLapTime(ahead?.bestLap ?? null)}
            </div>
          </div>
        </div>

        {/* Separador */}
        <div
          style={{
            marginTop: 6,
            marginBottom: 4,
            height: 1,
            background: "#333",
          }}
        />

        {/* Línea nueva: On-track relative */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          {renderOnTrackCar("ON-TRACK BEHIND", onTrackBehind ?? null)}
          {renderOnTrackCar("ON-TRACK AHEAD", onTrackAhead ?? null)}
        </div>
      </div>
    );
  },
);
