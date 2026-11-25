// electron/updateCheck.cjs
// Comprobación de versiones nuevas en los Releases públicos de GitHub (solo aviso: no descarga ni instala nada).
// Seguridad: la URL que se abre se reconstruye SIEMPRE desde el tag (validado); nunca se usa una URL de la respuesta.

const REPO = "empg80/iFuel";
const API_URL = `https://api.github.com/repos/${REPO}/releases?per_page=20`;
const MAX_BYTES = 1.5 * 1024 * 1024;
const TAG_RE = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?$/;

/** "v0.1.0-beta.67" -> { core:[0,1,0], pre:["beta",67] } o null si no es una versión válida. */
function parseVersion(tag) {
  if (typeof tag !== "string" || !TAG_RE.test(tag)) return null;
  const [core, pre] = tag.replace(/^v/, "").split(/-(.+)/);
  return {
    core: core.split(".").map(Number),
    pre: pre ? pre.split(".").map((p) => (/^\d+$/.test(p) ? Number(p) : p)) : [],
  };
}

/** <0 si a<b, 0 si iguales, >0 si a>b (orden semver: una versión estable es mayor que sus betas). */
function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) throw new Error("versión no válida");
  for (let i = 0; i < 3; i++) if (x.core[i] !== y.core[i]) return x.core[i] - y.core[i];
  if (!x.pre.length || !y.pre.length) return x.pre.length === y.pre.length ? 0 : x.pre.length ? -1 : 1;
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const p = x.pre[i];
    const q = y.pre[i];
    if (p === undefined) return -1;
    if (q === undefined) return 1;
    if (p === q) continue;
    if (typeof p === "number" && typeof q === "number") return p - q;
    if (typeof p === "number") return -1;
    if (typeof q === "number") return 1;
    return p < q ? -1 : 1;
  }
  return 0;
}

/** Página oficial del release, construida desde un tag ya validado. */
function releaseUrl(tag) {
  if (!parseVersion(tag)) throw new Error("tag no válido");
  return `https://github.com/${REPO}/releases/tag/${encodeURIComponent(tag)}`;
}

/** De la lista de releases devuelve el más nuevo que supere a `current`, o null. */
function pickUpdate(releases, current, includePrereleases) {
  if (!Array.isArray(releases)) return null;
  let best = null;
  for (const r of releases) {
    if (!r || typeof r !== "object" || r.draft === true) continue;
    if (r.prerelease === true && !includePrereleases) continue;
    if (!parseVersion(r.tag_name)) continue;
    if (compareVersions(r.tag_name, current) <= 0) continue;
    if (!best || compareVersions(r.tag_name, best.tag_name) > 0) best = r;
  }
  if (!best) return null;
  return {
    tag: best.tag_name,
    version: best.tag_name.replace(/^v/, ""),
    prerelease: best.prerelease === true,
    name: typeof best.name === "string" ? best.name.slice(0, 120) : best.tag_name,
    notes: typeof best.body === "string" ? best.body.slice(0, 2000) : "",
    url: releaseUrl(best.tag_name),
  };
}

/**
 * Consulta GitHub. Devuelve { ok:true, update:null|{...} } o { ok:false, error }.
 * `fetchImpl` y `timeoutMs` se pueden inyectar (tests).
 */
async function checkForUpdate({ currentVersion, includePrereleases, fetchImpl = globalThis.fetch, timeoutMs = 8000 }) {
  if (!parseVersion(`v${currentVersion}`)) return { ok: false, error: "versión actual no válida" };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(API_URL, {
      signal: ctrl.signal,
      headers: { Accept: "application/vnd.github+json", "User-Agent": `iFuel/${currentVersion}` },
    });
    if (!res.ok) return { ok: false, error: `GitHub respondió ${res.status}` };
    const len = Number(res.headers?.get?.("content-length") ?? 0);
    if (len > MAX_BYTES) return { ok: false, error: "respuesta demasiado grande" };
    const text = await res.text();
    if (text.length > MAX_BYTES) return { ok: false, error: "respuesta demasiado grande" };
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, error: "respuesta no válida" };
    }
    return { ok: true, update: pickUpdate(data, currentVersion, includePrereleases) };
  } catch (err) {
    return { ok: false, error: err?.name === "AbortError" ? "sin respuesta (tiempo agotado)" : String(err?.message ?? err) };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { parseVersion, compareVersions, releaseUrl, pickUpdate, checkForUpdate, API_URL };
