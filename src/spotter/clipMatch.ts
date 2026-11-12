// Montaje de frases a partir de trozos pregrabados (puro, testeable).
export type Manifest = { chunks: Record<string, string>; classes: Record<string, string>; nums: Record<string, string> };

const norm = (t: string) => t.toLowerCase().replace(/[.,;:!¡¿?]/g, " ").replace(/\s+/g, " ").trim();

/** Convierte el texto en una lista de archivos de audio, o null si algo no está grabado. */
export function matchClips(text: string, m: Manifest): string[] | null {
  const words = norm(text).split(" ").filter(Boolean);
  if (words.length === 0) return null;
  const out: string[] = [];
  let i = 0;
  while (i < words.length) {
    let hit: string | null = null;
    let used = 1;
    for (let n = Math.min(8, words.length - i); n >= 1; n--) {
      const key = words.slice(i, i + n).join(" ");
      if (m.chunks[key]) { hit = m.chunks[key]; used = n; break; }
    }
    if (!hit) {
      const w = words[i];
      if (/^\d+$/.test(w)) {
        const n = parseInt(w, 10);
        if (m.nums[String(n)]) out.push(m.nums[String(n)]);
        else for (const d of w) { if (!m.nums[d]) return null; out.push(m.nums[d]); }
        i++;
        continue;
      }
      const cls = m.classes[w.toUpperCase().replace(/[^A-Z0-9]/g, "")];
      if (cls) { out.push(cls); i++; continue; }
      return null;
    }
    out.push(hit);
    i += used;
  }
  return out;
}

