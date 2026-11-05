---
name: http-security-hardening
description: >-
  Hardening HTTP de SICEN-back (helmet CSP compatible con Leaflet, CORS_ORIGIN
  obligatorio en producción, MONGO_URI sin Atlas hardcodeado, sanitización
  NoSQL compatible con Express 5, rate limit de login, rechazo Brotli). Usar
  al tocar app.js, securityHeaders, mongoSanitize, db-connection, CORS,
  docker-compose, .env.example o al agregar CDNs/tiles/APIs externas.
---

# Hardening HTTP de SICEN-back

El backend sirve la SPA y la API. Cualquier cambio de headers, CORS, Mongo
o sanitización de input tiene que respetar Express 5 y el mapa de El
Centinela (tiles Leaflet).

## Piezas

| Pieza | Path |
|---|---|
| Helmet / CSP | `SICEN-back/src/middlewares/securityHeaders.js` |
| Sanitización NoSQL | `SICEN-back/src/middlewares/mongoSanitize.js` |
| Rechazo Brotli | `SICEN-back/src/middlewares/rejectBrotli.js` |
| Rate limit login/recovery | `SICEN-back/src/middlewares/rateLimiting.js` |
| Error handler | `SICEN-back/src/middlewares/errorHandler.js` |
| CORS + montaje | `SICEN-back/src/app.js` |
| URI Mongo | `SICEN-back/src/utils/db-connection.js` (`MONGO_URI`) |
| Fail-fast prod | `SICEN-back/src/config/env.config.js` |
| Compose | `docker-compose.yml` (`MONGO_URI`, `CORS_ORIGIN`) |
| Plantillas env | `.env.example` (raíz) y `SICEN-back/.env.example` |

## Reglas obligatorias

1. **`MONGO_URI`**: URI completa. No armar `mongodb+srv://…` con cluster,
   usuario o password hardcodeados. En producción, si falta, el proceso
   termina.
2. **`CORS_ORIGIN`**: obligatorio en producción (lista separada por coma).
   En desarrollo, fallback a localhost + warning.
3. **No `express-mongo-sanitize`**: reasigna `req.query` y Express 5 lo
   expone como getter. Usar `mongoSanitizeMiddleware` (mutación in-place
   de body/params/query; `defineProperty` para fijar query sanitizado).
4. **CSP Leaflet**: `imgSrc`/`connectSrc` deben incluir tiles
   CARTO (`*.basemaps.cartocdn.com`), OpenSeaMap (`tiles.openseamap.org`)
   y OSM (`*.tile.openstreetmap.org`). `workerSrc` incluye `'self'` y
   `blob:` (PWA / canvas). Si se agrega un CDN o capa de mapa, actualizar
   `LEAFLET_TILE_ORIGINS` o `connectSrc`.
5. **Logger**: los niveles custom de Winston definen `warning`, no `warn`.
   `logger.js` alias `warn` → `warning`. Preferir `logger.warning`.
6. **Docker**: `docker-compose.yml` interpola `${MONGO_URI:?…}` y
   `${CORS_ORIGIN:?…}` (sin default). El `.env.example` de la raíz debe
   documentar ambas.

## Antipatrones

- ❌ `req.query = sanitizedQuery`
- ❌ `mongodb+srv://usuario:${password}@cluster0.…` en código
- ❌ CSP sin hosts de tiles (rompe El Centinela y el mapa de tracking)
- ❌ Tratar `CORS_ORIGIN` como opcional en producción
- ❌ Reintroducir `express-mongo-sanitize`

## Template sanitizer (Express 5)

```js
import { mongoSanitizeMiddleware } from "./middlewares/mongoSanitize.js";

app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended: true, limit: "3mb" }));
app.use(mongoSanitizeMiddleware);
```

## Variables de deploy

Obligatorias en producción / Compose:

```bash
MONGO_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/SIGMU_DB?retryWrites=true&w=majority
CORS_ORIGIN=https://sicen.dominio.com,https://www.sicen.dominio.com
JWT_SECRET=...
```

## Ejemplos vivos

- CSP tiles: `securityHeaders.js` (`LEAFLET_TILE_ORIGINS`)
- Sanitización: `mongoSanitize.js` + `mongoSanitize.test.js`
- URI Mongo: `db-connection.js` + `db-connection.test.js`
- CORS fail-fast: `app.js` + `env.config.js`
- Compose: `docker-compose.yml` environment del servicio `back`
