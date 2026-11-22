// Lector de archivos .ibt de iRacing (telemetría a disco, 60 Hz). Solo lectura, sin dependencias.
// Formato: cabecera irsdk (112 B) + subcabecera de disco (32 B) + sessionInfo (YAML) + cabeceras de variables (144 B c/u) + registros.
import fs from "node:fs";

const TYPES = { 0: ["char", 1], 1: ["bool", 1], 2: ["int", 4], 3: ["bitfield", 4], 4: ["float", 4], 5: ["double", 8] };

/**
 * @param {string|Buffer} src ruta o buffer del .ibt
 * @param {{channels?: string[]}} [opts] canales a extraer (por defecto todos los escalares numéricos)
 */
export function readIbt(src, opts = {}) {
  const buf = typeof src === "string" ? fs.readFileSync(src) : src;
  if (buf.length < 144) throw new Error("Archivo .ibt demasiado corto");
  const tickRate = buf.readInt32LE(8);
  const sessionInfoLen = buf.readInt32LE(16);
  const sessionInfoOffset = buf.readInt32LE(20);
  const numVars = buf.readInt32LE(24);
  const varHeaderOffset = buf.readInt32LE(28);
  const bufLen = buf.readInt32LE(36);
  const dataOffset = buf.readInt32LE(52);
  const recordCount = buf.readInt32LE(112 + 28);
  if (!(tickRate > 0) || !(numVars > 0) || !(bufLen > 0) || numVars > 2000) throw new Error("Cabecera .ibt no válida (¿no es un archivo de telemetría de iRacing?)");

  const vars = new Map();
  for (let i = 0; i < numVars; i++) {
    const o = varHeaderOffset + i * 144;
    const type = buf.readInt32LE(o);
    const offset = buf.readInt32LE(o + 4);
    const count = buf.readInt32LE(o + 8);
    const name = buf.toString("latin1", o + 16, o + 48).split("\0")[0];
    vars.set(name, { type, offset, count });
  }
  const sessionYaml = buf.toString("latin1", sessionInfoOffset, sessionInfoOffset + sessionInfoLen).split("\0")[0];

  const records = Math.min(recordCount > 0 ? recordCount : Infinity, Math.floor((buf.length - dataOffset) / bufLen));
  const want = opts.channels ?? [...vars.keys()].filter((n) => vars.get(n).count === 1 && vars.get(n).type >= 2);
  const data = {};
  for (const name of want) {
    const v = vars.get(name);
    if (!v || v.count !== 1) continue;
    const arr = new Float64Array(records);
    const rd = v.type === 4 ? "readFloatLE" : v.type === 5 ? "readDoubleLE" : v.type === 1 ? "readUInt8" : "readInt32LE";
    for (let r = 0; r < records; r++) arr[r] = buf[rd](dataOffset + r * bufLen + v.offset);
    data[name] = arr;
  }
  return { tickRate, records, vars: [...vars.keys()], data, sessionYaml };
}

/** Extrae un escalar sencillo del YAML de sesión (p. ej. TrackLength: "5.89 km"). */
export function yamlValue(yaml, key) {
  const m = new RegExp(`^\\s*${key}:\\s*(.*)$`, "m").exec(yaml);
  return m ? m[1].trim().replace(/^"|"$/g, "") : null;
}
