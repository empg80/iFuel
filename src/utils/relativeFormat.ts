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

// Hueco al líder para la torre: "LEAD", "L2" (vueltas), "+12.345" o "+1:05.4" a partir de 60 s
export function formatLeaderGap(
  gapSeconds: number | null | undefined,
  lapsDown: number,
): string {
  if (lapsDown > 0) return `L${lapsDown}`;
  if (gapSeconds == null || !Number.isFinite(gapSeconds)) return "--";
  if (gapSeconds <= 0.0005) return "LEAD";
  if (gapSeconds >= 60) {
    const totalTenths = Math.round(gapSeconds * 10);
    const m = Math.floor(totalTenths / 600);
    const s = (totalTenths % 600) / 10;
    return `+${m}:${s.toFixed(1).padStart(4, "0")}`;
  }
  return `+${gapSeconds.toFixed(3)}`;
}

// Tiempo restante de sesión: "-12 LAPS", "1:05:09" o "12:30"; null si no hay dato
export function formatSessionRemaining(
  lapsRemain: number | null | undefined,
  timeRemain: number | null | undefined,
): string | null {
  if (lapsRemain != null && lapsRemain > 0 && lapsRemain < 1000) {
    return lapsRemain === 1 ? "LAST LAP" : `-${lapsRemain} LAPS`;
  }
  if (timeRemain != null && timeRemain > 0 && timeRemain < 86400) {
    const t = Math.floor(timeRemain);
    const h = Math.floor(t / 3600);
    const mm = Math.floor((t % 3600) / 60).toString().padStart(2, "0");
    const ss = (t % 60).toString().padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }
  return null;
}
