---
name: sicen-pwa
description: >-
  Progressive Web App de SICEN (manifest standalone, meta Apple, service worker
  vía vite-plugin-pwa). Usar al tocar instalabilidad mobile, pantalla completa
  sin chrome del navegador, index.html meta PWA, VitePWA, virtual:pwa-register,
  display standalone, Añadir a inicio / Install app, o El Centinela en iOS/Android
  sin barra de Safari/Chrome.
---

# SICEN como PWA (standalone)

## Qué hace

Con `display: "standalone"` y “Añadir a pantalla de inicio” / Instalar app, SICEN
abre **sin la barra del navegador** (como Osiris). El mapa de El Centinela ya es
full-bleed; el PWA aporta el envoltorio de sistema.

## Piezas

| Pieza | Path |
|---|---|
| Meta + viewport-fit | `SICEN-front/index.html` |
| Plugin + manifest | `SICEN-front/vite.config.js` → `VitePWA({...})` |
| Registro SW | `SICEN-front/src/main.jsx` → `registerSW` de `virtual:pwa-register` |
| Ícono | `public/img/Franja-PNN-CUADRADO.png` (+ apple-touch-icon) |

## Reglas

- Mantener `display: "standalone"` (no `browser`).
- `start_url` / `scope`: `"/"` (toda la SPA).
- `/api/*` y `/uploads/*`: **NetworkOnly** (nunca cachear datos de sesión).
- En **`build:watch`** (dev con Express): PWA **off** (`disable: true`), se
  borran `sw.js`/`workbox-*.js` y el bundle desregistra SW + limpia caches
  (`__SICEN_ENABLE_PWA__=false`). Evita la SPA colgada al refrescar tras un
  rebuild. PWA real solo con `npm run build` (sin `--watch`).
- No precachear `index.html` ni `assets/**`. Navegación y JS/CSS: **NetworkFirst**.
  `/api/*` y `/uploads/*`: **NetworkOnly**.
- `devOptions.enabled: false` (el flujo local no usa el server de Vite).
- Flag: `__SICEN_ENABLE_PWA__` (false en watch, true en build prod).

## Cómo probar (mobile / simulador)

1. Servir por **HTTPS** o `localhost` (requisito de SW).
2. iOS Safari → Compartir → **Añadir a pantalla de inicio** → abrir el ícono.
3. Android Chrome → **Instalar aplicación** / Añadir a inicio.
4. Abrir desde el ícono (no desde una pestaña normal): ahí desaparece el chrome.

## Antipatrones

- Esperar standalone solo con CSS `100vh` o DevTools “mobile”.
- Cachear endpoints autenticados en el service worker.
- Precachear todo `public/` (rompe el build / infla el SW).
