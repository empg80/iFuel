export function formatGap(seconds: number | null | undefined): string {
  if (!seconds || !Number.isFinite(seconds)) return "--";
  const sign = seconds >= 0 ? "" : "-";
  const abs = Math.abs(seconds);
  const ss = Math.floor(abs).toString().padStart(2, "0");
  const dcm = Math.round((abs % 1) * 1000)
    .toString()
    .padStart(3, "0");
  return `${sign}${ss}.${dcm}`;
}

export function formatLapTimeSeconds(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "--:--.---";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

export function formatDelta(delta: number | null | undefined): string {
  if (!delta || !Number.isFinite(delta)) return "";
  const sign = delta > 0 ? "+" : "";
  const abs = delta;
  const dcm = Math.round(Math.abs(abs) * 1000)
    .toString()
    .padStart(3, "0");
  return `${sign}0.${dcm}`;
}

