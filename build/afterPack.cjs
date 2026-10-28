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
  const native = path.join(dest, "@irsdk-node", "native", "prebuilds");
  if (context.electronPlatformName === "win32" && !fs.existsSync(path.join(native, "win32-x64"))) {
    throw new Error("Falta el binario win32-x64 de @irsdk-node/native");
  }
  console.log(`  • afterPack: node_modules del servidor copiados a ${dest}`);
};
