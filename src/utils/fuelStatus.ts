// Nivel de alerta del combustible para el overlay: "ok" (calma), "warn" (atención) o "crit".
// Solo sintaxis borrable (sin enums ni imports): se prueba directamente con node --test.

export type FuelLevel = "ok" | "warn" | "crit";

export type FuelLevelInput = {
  /** Vueltas de combustible restantes según el consumo medio (sin sentido si !hasEstimate). */
  estLaps: number;
  /** Fracción del depósito lleno, 0–1. */
  ratio: number;
  /** ¿Hay un consumo medio fiable? Antes de las primeras vueltas válidas no lo hay. */
  hasEstimate: boolean;
};

export const FUEL_CRIT_LAPS = 1.2; // se acaba en menos de ~1 vuelta
export const FUEL_WARN_LAPS = 3; // hay que ir pensando en parar
export const FUEL_CRIT_RATIO = 0.07;
export const FUEL_WARN_RATIO = 0.2;

export function fuelLevel({ estLaps, ratio, hasEstimate }: FuelLevelInput): FuelLevel {
  if (ratio < FUEL_CRIT_RATIO || (hasEstimate && estLaps < FUEL_CRIT_LAPS)) return "crit";
  if (ratio < FUEL_WARN_RATIO || (hasEstimate && estLaps < FUEL_WARN_LAPS)) return "warn";
  return "ok";
}
