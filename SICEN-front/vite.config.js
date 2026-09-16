import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { writeOserpManifestFile } from "./scripts/generate-oserp-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OSERP_ROOT = path.resolve(__dirname, "public", "files", "OSERP");
const CLIENT_OUT = path.resolve(__dirname, "../SICEN-back/public");
/** `npm run build:watch` (dev local): sin PWA para no cachear la SPA. */
const isWatchBuild = process.argv.includes("--watch");

/**
 * Regenera `src/generated/oserpFilesManifest.js` en cada build (y en dev al
 * arrancar / al cambiar archivos en `public/files/OSERP`). Evita módulos
 * virtuales que pueden fallar en `vite build --watch` y dejar `public/`
 * vacío cuando `emptyOutDir: true`.
 */
function oserpFilesManifestPlugin() {
  let lastBuildStartRegen = 0;

  function regenerate() {
    writeOserpManifestFile();
  }

  return {
    name: "oserp-files-manifest",
    buildStart() {
      /* En --watch, buildStart corre en cada rebuild; evitar regenerar dos veces
         seguidas si el hook se dispara en cadena. */
      const now = Date.now();
      if (now - lastBuildStartRegen < 500) return;
      lastBuildStartRegen = now;
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

/** Borra sw.js / workbox residuales cuando el watch no genera PWA. */
function clearServiceWorkerArtifactsPlugin() {
  return {
    name: "clear-sw-artifacts-on-watch",
    closeBundle() {
      if (!isWatchBuild) return;
      try {
        for (const name of fs.readdirSync(CLIENT_OUT)) {
          if (
            name === "sw.js" ||
            name === "sw.js.map" ||
            /^workbox-.*\.js(\.map)?$/.test(name)
          ) {
            fs.unlinkSync(path.join(CLIENT_OUT, name));
          }
        }
      } catch {
        /* ignore */
      }
    },
  };
}

export default defineConfig({
  define: {
    __SICEN_ENABLE_PWA__: JSON.stringify(!isWatchBuild),
  },
  plugins: [
    react(),
    oserpFilesManifestPlugin(),
    clearServiceWorkerArtifactsPlugin(),
    VitePWA({
      /* En watch: plugin off (no injecta SW). Producción: PWA normal. */
      disable: isWatchBuild,
      registerType: "autoUpdate",
      includeAssets: [
        "img/favicon.png",
        "img/Franja-PNN-CUADRADO.png",
        "img/Logo-PNN.png",
      ],
      manifest: {
        id: "/",
        name: "SICEN — Sistema Centinela",
        short_name: "SICEN",
        description:
          "Sistema Centinela — Prefectura Nacional Naval (mapa, despachos, inspecciones).",
        lang: "es-UY",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#0b1220",
        theme_color: "#0b1220",
        categories: ["navigation", "government", "utilities"],
        icons: [
          {
            src: "/img/Franja-PNN-CUADRADO.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/img/Franja-PNN-CUADRADO.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/img/Franja-PNN-CUADRADO.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        /* No precachear index.html: el hash de assets cambia en cada build. */
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        globPatterns: ["manifest.webmanifest"],
        globIgnores: [
          "**/files/**",
          "**/units/**",
          "**/img/**",
          "**/assets/**",
        ],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/uploads/"),
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "sicen-nav",
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === "script" ||
              request.destination === "style",
            handler: "NetworkFirst",
            options: {
              cacheName: "sicen-shell",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 32,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "sicen-images",
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
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
      /* SSE de AIS: sin timeout; regla antes que /api genérico. */
      "/api/ais/stream": {
        target: "http://localhost:3000",
        changeOrigin: true,
        timeout: 0,
        proxyTimeout: 0,
        configure(proxy) {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("Connection", "keep-alive");
            proxyReq.setHeader("Cache-Control", "no-cache");
          });
          proxy.on("error", (err, _req, res) => {
            console.warn(`[vite] AIS stream proxy: ${err.message}`);
            if (res && !res.headersSent && typeof res.writeHead === "function") {
              res.writeHead(502, { "Content-Type": "text/plain" });
              res.end("AIS stream unavailable");
            }
          });
        },
      },
      "/api/sportMovements/tracking/stream": {
        target: "http://localhost:3000",
        changeOrigin: true,
        timeout: 0,
        proxyTimeout: 0,
        configure(proxy) {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("Connection", "keep-alive");
            proxyReq.setHeader("Cache-Control", "no-cache");
          });
          proxy.on("error", (err, _req, res) => {
            console.warn(`[vite] Tracking stream proxy: ${err.message}`);
            if (res && !res.headersSent && typeof res.writeHead === "function") {
              res.writeHead(502, { "Content-Type": "text/plain" });
              res.end("Tracking stream unavailable");
            }
          });
        },
      },
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
