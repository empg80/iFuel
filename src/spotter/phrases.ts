// Frases del spotter. El usuario puede cambiarlas editando spotter-frases.json (menú Spotter > Edit phrases).
// En las frases con huecos: {clase} {numero} {metros}.
export type Phrases = {
  left: string; right: string; both: string; twoLeft: string; twoRight: string; clear: string;
  fastClass: string; fastClassNoName: string;
  debris: string; incident: string; yellow: string; distance: string;
  fuelCritical: string; windowOpen: string; boxNow: string; lastLap: string; checkered: string; test: string;
};

export const DEFAULT_PHRASES: Phrases = {
  left: "Izquierda",
  right: "Derecha",
  both: "Tres en línea",
  twoLeft: "Dos a la izquierda",
  twoRight: "Dos a la derecha",
  clear: "Libre",
  fastClass: "{clase} por detrás, número {numero}",
  fastClassNoName: "Clase rápida por detrás, número {numero}",
  debris: "Debris",
  incident: "Coche parado",
  yellow: "Amarilla",
  distance: " a {metros} metros",
  fuelCritical: "Combustible crítico",
  windowOpen: "Ventana de parada abierta",
  boxNow: "Entra a boxes esta vuelta",
  lastLap: "Última vuelta",
  checkered: "Bandera a cuadros",
  test: "Spotter activo. Izquierda. Derecha. Libre.",
};

let current: Phrases = { ...DEFAULT_PHRASES };
export const getPhrases = (): Phrases => current;
/** Mezcla lo que haya en el archivo del usuario con los valores por defecto (ignora claves o tipos raros). */
export function setPhrases(custom: unknown) {
  const next = { ...DEFAULT_PHRASES };
  if (custom && typeof custom === "object") {
    for (const k of Object.keys(DEFAULT_PHRASES) as (keyof Phrases)[]) {
      const v = (custom as Record<string, unknown>)[k];
      if (typeof v === "string" && v.trim().length > 0 && v.length < 120) next[k] = v;
    }
  }
  current = next;
}
export const fill = (tpl: string, vars: Record<string, string | number>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
