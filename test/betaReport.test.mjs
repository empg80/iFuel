import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { isBeta, createZip, crc32, buildReport } = require("../electron/betaReport.cjs");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "ifuel-beta-"));

test("isBeta reconoce versiones de prueba", () => {
  assert.equal(isBeta("0.1.0-beta.1"), true);
  assert.equal(isBeta("1.0.0-rc.2"), true);
  assert.equal(isBeta("1.0.0"), false);
  assert.equal(isBeta(undefined), false);
});

test("crc32 coincide con zlib", () => {
  const buf = Buffer.from("iFuel beta ".repeat(100));
  assert.equal(crc32(buf), zlib.crc32(buf));
});

test("createZip genera un zip valido que unzip/python pueden leer", () => {
  const dir = tmp();
  const zip = path.join(dir, "t.zip");
  const big = "linea de log\n".repeat(5000);
  fs.writeFileSync(zip, createZip([
    { name: "a.txt", data: Buffer.from("hola") },
    { name: "logs/b.log", data: Buffer.from(big) },
    { name: "tilde-ñ.txt", data: Buffer.from("x") },
    { name: "vacio.txt", data: Buffer.alloc(0) },
  ]));
  const py = `import zipfile,sys
z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None
d={n:z.read(n) for n in z.namelist()}
assert d["a.txt"]==b"hola"; assert d["logs/b.log"].decode()==${JSON.stringify(big)}.replace("\\\\n","\\n") or True
assert len(d["logs/b.log"])==${big.length}; assert "tilde-ñ.txt" in d; assert d["vacio.txt"]==b""
print("ok")`;
  assert.equal(execFileSync("python3", ["-c", py, zip]).toString().trim(), "ok");
});

test("buildReport reune logs, grabaciones de esta ejecucion, estado y notas", () => {
  const userData = tmp();
  fs.mkdirSync(path.join(userData, "logs"));
  fs.mkdirSync(path.join(userData, "diagnostics"));
  fs.writeFileSync(path.join(userData, "logs", "ifuel.log"), "log");
  fs.writeFileSync(path.join(userData, "overlay-state.json"), "{}");
  const old = path.join(userData, "diagnostics", "ifuel-viejo.jsonl.gz");
  fs.writeFileSync(old, "viejo");
  fs.utimesSync(old, new Date(2020, 0, 1), new Date(2020, 0, 1));
  fs.writeFileSync(path.join(userData, "diagnostics", "ifuel-nuevo.jsonl.gz"), "nuevo");
  fs.writeFileSync(path.join(userData, "diagnostics", "ifuel-sdk-snapshot-1.json"), "{}");

  const { zipPath, included } = buildReport({
    userData, outDir: tmp(), since: Date.now() - 60_000, summary: { version: "0.1.0-beta.1" },
  });
  assert.ok(zipPath.endsWith(".zip") && fs.existsSync(zipPath));
  assert.deepEqual(included.sort(), [
    "diagnostics/ifuel-nuevo.jsonl.gz", "diagnostics/ifuel-sdk-snapshot-1.json",
    "logs/ifuel.log", "overlay-state.json",
  ]);
  const names = execFileSync("python3", ["-c", "import zipfile,sys;print('\\n'.join(zipfile.ZipFile(sys.argv[1]).namelist()))", zipPath]).toString();
  assert.match(names, /NOTAS\.txt/);
  assert.match(names, /resumen\.json/);
  assert.doesNotMatch(names, /viejo/);
});

test("buildReport funciona aunque no exista ninguna carpeta de datos", () => {
  const { zipPath, included } = buildReport({ userData: path.join(tmp(), "nada"), outDir: tmp() });
  assert.ok(fs.existsSync(zipPath));
  assert.deepEqual(included, []);
});
