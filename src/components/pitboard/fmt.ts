export function lapStr(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s) || s <= 0) return "–:––.––";
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(2).padStart(5, "0")}`;
}
export function secStr(s: number | null | undefined): string {
  return s == null || !Number.isFinite(s) ? "––.––" : s.toFixed(2);
}
export function deltaStr(d: number | null | undefined): string {
  if (d == null || !Number.isFinite(d)) return "––";
  return `${d > 0 ? "+" : d < 0 ? "−" : ""}${Math.abs(d).toFixed(2)}`;
}
export function clockStr(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s) || s < 0 || s > 86400) return "––:––";
  const t = Math.floor(s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}
