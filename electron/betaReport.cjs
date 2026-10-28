// Informe de la prueba beta: reúne los archivos de diagnóstico en un único .zip para enviarlo.
// Sin dependencias: escribe el zip a mano (zlib + CRC32). Se testea sin Electron.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const isBeta = (version) => /-(beta|alpha|rc)/i.test(String(version ?? ""));

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((Math.max(d.getFullYear(), 1980) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

// entries: [{ name, data: Buffer, date?: Date }] -> Buffer con un zip válido
function createZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name.replace(/\\/g, "/"), "utf8");
    const raw = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data);
    const deflated = zlib.deflateRawSync(raw, { level: 6 });
    const useDeflate = deflated.length < raw.length;
    const body = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;
    const { time, date } = dosDateTime(e.date ?? new Date());
    const crc = crc32(raw);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6); // nombres UTF-8
    lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(time, 10);
    lh.writeUInt16LE(date, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(body.length, 18);
    lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(name.length, 26);
    lh.writeUInt16LE(0, 28);
    locals.push(lh, name, body);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(method, 10);
    ch.writeUInt16LE(time, 12);
    ch.writeUInt16LE(date, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(body.length, 20);
    ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(offset, 42);
    centrals.push(ch, name);

    offset += lh.length + name.length + body.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

const pad = (n) => String(n).padStart(2, "0");
const stamp = (d) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

function listFiles(dir, { since = 0, filter = () => true } = {}) {
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .map((n) => path.join(dir, n))
    .filter((f) => {
      try {
        const st = fs.statSync(f);
        return st.isFile() && st.mtimeMs >= since && filter(f);
      } catch {
        return false;
      }
    });
}

const NOTES_TEMPLATE = `NOTAS DE LA PRUEBA (rellénalo si puedes; cuanto más concreto, mejor)

Coche y pista:
Tipo de sesión (práctica / test / carrera):
Capacidad del depósito que ves en el garaje (L):
Consumo por vuelta que indica iRacing o tu dash:

Qué ha pasado y a qué vuelta/hora (paradas, amarillas, replay, cierre y reapertura de iRacing):

Qué has visto raro o no te ha gustado (cifras, colores, tamaños, posición de los widgets):

¿Se veía sobre iRacing sin parpadeos y los clics llegaban al sim? (sí/no, modo de ventana de iRacing):
`;

// Construye el informe y devuelve la ruta del .zip.
//   userData  carpeta de datos de la app (logs/, diagnostics/, overlay-state.json)
//   outDir    dónde dejar el zip
//   since     epoch ms: solo se incluyen grabaciones/volcados de esta ejecución
//   summary   objeto con datos de la ejecución (versión, SO, duración...)
function buildReport({ userData, outDir, since = 0, summary = {}, now = new Date(), extraFiles = [], fileName = null }) {
  const entries = [];
  const included = [];
  const add = (file, zipName) => {
    try {
      entries.push({ name: zipName, data: fs.readFileSync(file), date: fs.statSync(file).mtime });
      included.push(zipName);
    } catch {
      /* archivo que desaparece: se omite */
    }
  };

  for (const f of listFiles(path.join(userData, "logs"))) add(f, `logs/${path.basename(f)}`);
  for (const f of listFiles(path.join(userData, "diagnostics"), { since }))
    add(f, `diagnostics/${path.basename(f)}`);
  const stateFile = path.join(userData, "overlay-state.json");
  if (fs.existsSync(stateFile)) add(stateFile, "overlay-state.json");
  for (const f of extraFiles) add(f, path.basename(f));

  const resumen = {
    generadoEn: now.toISOString(),
    archivos: included,
    ...summary,
  };
  entries.push({ name: "resumen.json", data: Buffer.from(JSON.stringify(resumen, null, 2)), date: now });
  entries.push({ name: "NOTAS.txt", data: Buffer.from(NOTES_TEMPLATE, "utf8"), date: now });

  fs.mkdirSync(outDir, { recursive: true });
  const zipPath = path.join(outDir, fileName || `ifuel-beta-${stamp(now)}.zip`);
  // escritura atómica: un cierre a mitad no deja un zip corrupto
  const tmpPath = `${zipPath}.tmp`;
  fs.writeFileSync(tmpPath, createZip(entries));
  fs.renameSync(tmpPath, zipPath);
  return { zipPath, included };
}

module.exports = { isBeta, createZip, crc32, buildReport, stamp, NOTES_TEMPLATE };
