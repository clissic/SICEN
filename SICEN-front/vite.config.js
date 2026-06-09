import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { writeOserpManifestFile } from "./scripts/generate-oserp-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OSERP_ROOT = path.resolve(__dirname, "public", "files", "OSERP");

/**
 * Regenera `src/generated/oserpFilesManifest.js` en cada build (y en dev al
 * arrancar / al cambiar archivos en `public/files/OSERP`). Evita módulos
 * virtuales que pueden fallar en `vite build --watch` y dejar `public/`
 * vacío cuando `emptyOutDir: true`.
 */
function oserpFilesManifestPlugin() {
  function regenerate() {
    writeOserpManifestFile();
  }

  return {
    name: "oserp-files-manifest",
    buildStart() {
      regenerate();
    },
    configureServer(server) {
      regenerate();
      server.watcher.add(OSERP_ROOT);
      server.watcher.on("add", (file) => {
        if (file.startsWith(OSERP_ROOT)) regenerate();
      });
      server.watcher.on("unlink", (file) => {
        if (file.startsWith(OSERP_ROOT)) regenerate();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), oserpFilesManifestPlugin()],
  build: {
    outDir: "../SICEN-back/public",
    /* No vaciar todo public/ en cada rebuild: en Windows + OneDrive el rmdir de
       carpetas grandes (files/OSERP, units, img) suele fallar con UNKNOWN y deja
       el build sin index.html. Los assets hashed se reemplazan solos al compilar. */
    emptyOutDir: false,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
