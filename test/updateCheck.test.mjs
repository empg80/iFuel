import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const u = require("../electron/updateCheck.cjs");

test("orden semver con betas", () => {
  assert.ok(u.compareVersions("v0.1.0-beta.10", "0.1.0-beta.9") > 0);
  assert.ok(u.compareVersions("0.1.0", "0.1.0-beta.99") > 0);
  assert.ok(u.compareVersions("0.1.1", "0.1.0") > 0);
  assert.equal(u.compareVersions("v0.1.0-beta.5", "0.1.0-beta.5"), 0);
});
test("tags no válidos se rechazan", () => {
  for (const t of ["", "latest", "v1.2", "v1.2.3; rm -rf", "v1.2.3-beta/../x", null, 5]) assert.equal(u.parseVersion(t), null);
  assert.throws(() => u.releaseUrl("../evil"));
});
const rel = (tag, extra = {}) => ({ tag_name: tag, prerelease: /-/.test(tag), draft: false, html_url: "https://evil.example/x", ...extra });
test("pickUpdate: solo estables por defecto, betas si se piden", () => {
  const list = [rel("v0.1.0-beta.70"), rel("v0.1.0-beta.68"), rel("v0.0.9")];
  assert.equal(u.pickUpdate(list, "0.1.0-beta.67", false), null);
  assert.equal(u.pickUpdate(list, "0.1.0-beta.67", true).tag, "v0.1.0-beta.70");
  assert.equal(u.pickUpdate([rel("v0.1.0"), ...list], "0.1.0-beta.67", false).tag, "v0.1.0");
});
test("pickUpdate ignora drafts, tags raros y reconstruye la URL", () => {
  const list = [rel("v9.9.9", { draft: true }), rel("bad"), rel("v0.2.0")];
  const r = u.pickUpdate(list, "0.1.0", false);
  assert.equal(r.url, "https://github.com/empg80/iFuel/releases/tag/v0.2.0");
  assert.equal(u.pickUpdate("x", "0.1.0", true), null);
});
test("checkForUpdate con fetch simulado", async () => {
  const ok = async () => ({ ok: true, headers: new Map(), text: async () => JSON.stringify([rel("v0.3.0")]) });
  assert.equal((await u.checkForUpdate({ currentVersion: "0.1.0", includePrereleases: false, fetchImpl: ok })).update.tag, "v0.3.0");
  const ko = async () => ({ ok: false, status: 403, headers: new Map() });
  assert.equal((await u.checkForUpdate({ currentVersion: "0.1.0", fetchImpl: ko })).ok, false);
  const bad = async () => ({ ok: true, headers: new Map(), text: async () => "<html>" });
  assert.equal((await u.checkForUpdate({ currentVersion: "0.1.0", fetchImpl: bad })).ok, false);
});
