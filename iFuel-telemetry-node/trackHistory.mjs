// Histórico por circuito + coche: mejores vueltas (carrera / qualy / práctica) y consumo por vuelta.
// Se guarda en trackHistory.json (userData) y sirve de semilla del cálculo de combustible en sesiones futuras.
import fs from "node:fs";

const FUEL_ALPHA = 0.3;
const MAX_ENTRIES = 300;

export const sessionKind = (type) => (/race/i.test(type ?? "") ? "race" : /qual/i.test(type ?? "") ? "quali" : "practice");
export const historyKey = (track, car) => (track && car ? `${track}|${car}` : null);

export function createTrackHistory(file) {
  let data = {};
  try {
    if (file && fs.existsSync(file)) data = JSON.parse(fs.readFileSync(file, "utf8")) ?? {};
  } catch {
    data = {};
  }
  let dirty = false;

  const entry = (key) => (data[key] ??= { best: {}, fuelPerLap: null, fuelSamples: 0, updated: 0 });
  return {
    get(key) {
      return key ? (data[key] ?? null) : null;
    },
    /** Devuelve true si es un nuevo récord de ese tipo de sesión. */
    recordLap(key, kind, lapTime) {
      if (!key || !(lapTime > 20) || !(lapTime < 1200)) return false;
      const e = entry(key);
      const prev = e.best[kind];
      e.updated = Date.now();
      if (prev == null || lapTime < prev) {
        e.best[kind] = lapTime;
        dirty = true;
        return true;
      }
      return false;
    },
    recordFuel(key, perLap) {
      if (!key || !(perLap > 0.05) || !(perLap < 50)) return;
      const e = entry(key);
      e.fuelPerLap = e.fuelPerLap == null ? perLap : e.fuelPerLap * (1 - FUEL_ALPHA) + perLap * FUEL_ALPHA;
      e.fuelSamples += 1;
      e.updated = Date.now();
      dirty = true;
    },
    save() {
      if (!dirty || !file) return;
      try {
        const keys = Object.keys(data);
        if (keys.length > MAX_ENTRIES) {
          keys.sort((a, b) => (data[a].updated ?? 0) - (data[b].updated ?? 0));
          for (const k of keys.slice(0, keys.length - MAX_ENTRIES)) delete data[k];
        }
        fs.writeFileSync(file, JSON.stringify(data, null, 1), "utf8");
        dirty = false;
      } catch (e) {
        console.error("Error guardando trackHistory:", e);
      }
    },
  };
}
