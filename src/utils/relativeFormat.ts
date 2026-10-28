export function formatGap(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "--";
  // Redondear primero a milisegundos: antes 1.9996 daba "01.1000"
  const totalMs = Math.round(Math.abs(seconds) * 1000);
  const sign = seconds < 0 && totalMs > 0 ? "-" : "";
  const ss = Math.floor(totalMs / 1000).toString().padStart(2, "0");
  const dcm = (totalMs % 1000).toString().padStart(3, "0");
  return `${sign}${ss}.${dcm}`;
}

export function formatLapTimeSeconds(
  seconds: number | null | undefined,
): string {
  if (!seconds || seconds <= 0) return "--:--.---";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

export function formatDelta(delta: number | null | undefined): string {
  if (delta == null || !Number.isFinite(delta)) return "";
  // Signo explícito en ambos sentidos y parte entera incluida (antes -0.42 salía "0.420" y 1.5 salía "+0.500")
  const totalMs = Math.round(Math.abs(delta) * 1000);
  if (totalMs === 0) return "0.000";
  const sign = delta > 0 ? "+" : "-";
  const whole = Math.floor(totalMs / 1000);
  const dcm = (totalMs % 1000).toString().padStart(3, "0");
  return `${sign}${whole}.${dcm}`;
}
