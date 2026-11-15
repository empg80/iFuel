/** Chip del neumático de cada coche: letra y clase de color a partir del nombre del compuesto (o del índice si no hay nombre). */
export function tireChip(tire: number | null | undefined, name: string | null | undefined): { letter: string; kind: string; title: string } | null {
  if (tire == null && !name) return null;
  const n = (name ?? "").toLowerCase();
  if (/wet|rain|lluvia/.test(n)) return { letter: "W", kind: "wet", title: name ?? "Lluvia" };
  if (/inter/.test(n)) return { letter: "I", kind: "inter", title: name ?? "Intermedio" };
  if (/soft|blando|super/.test(n)) return { letter: "S", kind: "soft", title: name ?? "Blando" };
  if (/med/.test(n)) return { letter: "M", kind: "medium", title: name ?? "Medio" };
  if (/hard|duro/.test(n)) return { letter: "H", kind: "hard", title: name ?? "Duro" };
  if (name) return { letter: name.trim().charAt(0).toUpperCase(), kind: "dry", title: name };
  // sin nombres en la sesión: iRacing usa 0 = seco, 1 = lluvia en la mayoría de coches
  return tire === 1 ? { letter: "W", kind: "wet", title: "Lluvia" } : { letter: "D", kind: "dry", title: "Seco" };
}
