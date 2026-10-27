// vite.config.ts
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

// Content-Security-Policy solo para el build empaquetado (en dev Vite necesita scripts inline
// para el hot reload). La UI solo habla con el servidor WS local de iFuel.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // React usa atributos style
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src ws://127.0.0.1:7071",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

function cspForBuild(): Plugin {
  return {
    name: "ifuel-csp",
    apply: "build",
    transformIndexHtml(html) {
      // Tras <meta charset>, que debe ir lo primero del <head>
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

export default defineConfig({
  // Rutas relativas: Electron carga dist/index.html con loadFile (file://), donde
  // "/assets/..." (base por defecto) no resuelve y la ventana quedaba en blanco.
  base: "./",
  plugins: [
    react(),
    cspForBuild(),
    // El informe de tamaño solo se genera a demanda: ANALYZE=1 npm run build
    ...(process.env.ANALYZE
      ? [
          visualizer({
            filename: "stats.html",
            open: false,
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
  ],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
        },
      },
    },
  },
});
