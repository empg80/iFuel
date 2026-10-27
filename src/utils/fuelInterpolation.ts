// Solo sintaxis "borrable" (sin enums ni imports sin extensión): Node puede ejecutarlo
// directamente en los tests (node --test) sin compilar.

// Si entre dos lecturas se avanza más de esta fracción de vuelta, no se interpola (salto raro)
const MAX_INTERPOLATION_SPAN_PCT = 0.2;

/**
 * Combustible en el instante exacto de cruzar la línea de meta. El servidor emite ~4 veces por
 * segundo, así que el mensaje que detecta la nueva vuelta llega hasta 250 ms tarde (cientos de
 * metros): se interpola linealmente entre la lectura anterior (antes de la meta) y la actual.
 */
export function interpolateFuelAtLine(
  prevFuel: number | null,
  prevPct: number | null,
  fuel: number,
  pct: number | null | undefined,
): number {
  if (prevFuel === null || prevPct === null || typeof pct !== "number") return fuel;
  if (prevPct < 0.5 || pct > 0.5) return fuel; // no se cruzó la meta entre ambas lecturas
  const toLine = 1 - prevPct;
  const total = toLine + pct;
  if (total <= 0 || total > MAX_INTERPOLATION_SPAN_PCT) return fuel;
  return prevFuel + (fuel - prevFuel) * (toLine / total);
}
