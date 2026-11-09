// Lógica pura del spotter (sin audio): qué decir y por qué lado, a partir de CarLeftRight de iRacing.
// irsdk_CarLeftRight: 0 apagado, 1 libre, 2 coche a la izquierda, 3 a la derecha, 4 a ambos lados,
// 5 dos coches a la izquierda, 6 dos coches a la derecha.

import { getPhrases } from "./phrases.ts";

export type Side = "left" | "right" | "both" | "clear";
export type Callout = { text: string; side: Side; kind: "occupied" | "clear" };

const SIDE: Record<number, Side> = { 1: "clear", 2: "left", 3: "right", 4: "both", 5: "left", 6: "right" };
const KEY: Record<number, "left" | "right" | "both" | "twoLeft" | "twoRight"> = {
  2: "left", 3: "right", 4: "both", 5: "twoLeft", 6: "twoRight",
};

/** Qué avisar al pasar de `prev` a `next`; null si no hay nada nuevo que decir. */
export function calloutFor(prev: number | null, next: number): Callout | null {
  if (!(next in SIDE)) return null; // 0 = spotter apagado / valor desconocido
  const prevOccupied = prev != null && prev >= 2;
  if (next === 1) return prevOccupied ? { text: getPhrases().clear, side: "clear", kind: "clear" } : null;
  if (prev === next) return null;
  // solo se avisa de lo que empeora: pasar de "dos" a "uno" por el mismo lado no dice nada
  if (prev === 5 && next === 2) return null;
  if (prev === 6 && next === 3) return null;
  if (prev === 4 && (next === 2 || next === 3)) return null; // de ambos lados a uno: sigue ocupado
  return { text: getPhrases()[KEY[next]], side: SIDE[next], kind: "occupied" };
}

/** "Libre" solo si el lado se queda libre de forma estable (evita "libre-izquierda-libre" por rebotes). */
export const CLEAR_HOLD_MS = 350;
