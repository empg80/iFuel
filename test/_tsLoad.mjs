// Carga módulos TypeScript puros de src/ en los tests (los empaqueta con esbuild).
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export async function loadTs(relPath) {
  const entry = new URL(relPath, import.meta.url).pathname;
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ifuel-ts-")), "m.mjs");
  await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent" });
  return import(pathToFileURL(out).href);
}
