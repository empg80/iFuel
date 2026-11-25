// src/utils/driverName.ts
// Nombre corto del piloto en formato "N. Apellido". iRacing añade un número a los nombres repetidos
// ("Cristiano Queiroz3"); se quita para mostrar. Con un solo término se devuelve tal cual.
export function shortDriverName(name?: string | null): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  const surname = parts.slice(1).join(" ").replace(/(?<=\p{L})\d+$/u, "");
  return `${parts[0].charAt(0).toUpperCase()}. ${surname}`;
}
