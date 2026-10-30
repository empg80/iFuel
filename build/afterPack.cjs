// electron-builder descarta las carpetas node_modules de extraResources, y el servidor de telemetría
// (iFuel-telemetry-node, que Electron importa desde resources/) necesita ws e irsdk-node junto a él.
// Se copian aquí, tras empaquetar. Sin esto la app instalada arranca sin servidor de telemetría.
const fs = require("fs");
const path = require("path");

exports.default = async function afterPack(context) {
  const src = path.join(context.packager.projectDir, "iFuel-telemetry-node", "node_modules");
  const resources =
    context.electronPlatformName === "darwin"
      ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : path.join(context.appOutDir, "resources");
  const dest = path.join(resources, "iFuel-telemetry-node", "node_modules");
  if (!fs.existsSync(src)) {
    throw new Error(`Falta ${src}: ejecuta "npm install --prefix iFuel-telemetry-node" antes de empaquetar`);
  }
  fs.cpSync(src, dest, { recursive: true, dereference: true });
  // node_modules/**/.bin son enlaces simbólicos a scripts: Windows no los puede crear al descomprimir el zip
  // sin privilegios de administrador (error "Cannot create symbolic link") y en runtime no se usan.
  const removeBins = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.name === ".bin") fs.rmSync(full, { recursive: true, force: true });
      else if (entry.isDirectory() && !entry.isSymbolicLink()) removeBins(full);
    }
  };
  removeBins(dest);
  const native = path.join(dest, "@irsdk-node", "native", "prebuilds");
  if (context.electronPlatformName === "win32" && !fs.existsSync(path.join(native, "win32-x64"))) {
    throw new Error("Falta el binario win32-x64 de @irsdk-node/native");
  }
  console.log(`  • afterPack: node_modules del servidor copiados a ${dest}`);

  if (context.electronPlatformName === "win32") await patchWindowsExe(context);
};

// "signAndEditExecutable": false evita necesitar wine, pero entonces electron-builder no pone el icono ni
// los datos de versión: el .exe salía con el icono de Electron. Se parchean aquí con resedit (JS puro).
exports.patchWindowsExe = patchWindowsExe;
async function patchWindowsExe(context) {
  const { NtExecutable, NtExecutableResource, Resource, Data } = await import("resedit");
  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const icoPath = path.join(context.packager.projectDir, "build", "icon.ico");
  const exe = NtExecutable.from(fs.readFileSync(exePath));
  const res = NtExecutableResource.from(exe);

  const iconFile = Data.IconFile.from(fs.readFileSync(icoPath));
  const groups = Resource.IconGroupEntry.fromEntries(res.entries);
  const targets = groups.length ? groups.map((g) => ({ id: g.id, lang: g.lang })) : [{ id: 1, lang: 1033 }];
  for (const t of targets) {
    Resource.IconGroupEntry.replaceIconsForResource(
      res.entries, t.id, t.lang, iconFile.icons.map((i) => i.data),
    );
  }

  const infos = Resource.VersionInfo.fromEntries(res.entries);
  const version = context.packager.appInfo.version;
  const numeric = String(version).split(/[.-]/).filter((x) => /^\d+$/.test(x)).map(Number);
  while (numeric.length < 3) numeric.push(0);
  for (const info of infos) {
    info.setFileVersion(numeric[0], numeric[1] ?? 0, numeric[2] ?? 0, 0, info.lang?.[0]?.lang ?? 1033);
    info.setProductVersion(numeric[0], numeric[1] ?? 0, numeric[2] ?? 0, 0, info.lang?.[0]?.lang ?? 1033);
    info.setStringValues(
      { lang: info.lang?.[0]?.lang ?? 1033, codepage: 1200 },
      {
        FileDescription: "iFuel",
        ProductName: "iFuel",
        InternalName: "iFuel",
        OriginalFilename: "iFuel.exe",
        ProductVersion: String(version),
        FileVersion: String(version),
        CompanyName: "iFuel",
        LegalCopyright: "iFuel",
      },
    );
    info.outputToResourceEntries(res.entries);
  }

  res.outputResource(exe);
  fs.writeFileSync(exePath, Buffer.from(exe.generate()));
  console.log(`  • afterPack: icono y datos de versión de iFuel aplicados a ${exePath}`);
}
