// N3: sirve la carpeta `dist` de la app por HTTP local para usar los widgets como fuente de navegador en OBS
// (http://127.0.0.1:7071/#/obs/fuel). Solo lectura, sin salir de la carpeta raíz.
import fs from "node:fs";
import path from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".wav": "audio/wav",
  ".ogg": "audio/ogg", ".txt": "text/plain; charset=utf-8",
};

/** @returns {(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => void} */
export function createStaticHandler(rootDir, { allowedHosts = null } = {}) {
  const root = path.resolve(rootDir);
  // Cabeceras que se añaden a toda respuesta: sin sniffing de tipo, sin referrer, sin incrustar en otras páginas
  const SEC = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": "frame-ancestors 'none'",
  };
  return (req, res) => {
    // Un sitio web externo que apunte su DNS a 127.0.0.1 (DNS rebinding) llegaría con otro Host: se rechaza
    if (allowedHosts && !allowedHosts.has(String(req.headers.host || "").toLowerCase())) {
      res.writeHead(403, SEC); res.end(); return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { ...SEC, Allow: "GET, HEAD" }); res.end(); return; }
    let rel;
    try { rel = decodeURIComponent((req.url || "/").split("?")[0].split("#")[0]); } catch { res.writeHead(400, SEC); res.end(); return; }
    if (rel.includes("\0")) { res.writeHead(400, SEC); res.end(); return; }
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.resolve(root, "." + path.posix.normalize("/" + rel));
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403, SEC); res.end(); return; }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, SEC); res.end("Not found"); return; }
      res.writeHead(200, { ...SEC, "Content-Type": MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream", "Content-Length": st.size, "Cache-Control": "no-cache" });
      if (req.method === "HEAD") { res.end(); return; }
      fs.createReadStream(file).on("error", () => res.destroy()).pipe(res);
    });
  };
}
