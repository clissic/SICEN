---
name: http-security-hardening
description: >-
  Hardening HTTP de SICEN-back (helmet CSP compatible con Leaflet, CORS_ORIGIN
  obligatorio en producción, MONGO_URI sin credenciales embebidas +
  MONGO_USER/MONGO_PASSWORD, logger a stdout en Docker, sanitización
  NoSQL compatible con Express 5, rate limit de login, rechazo Brotli). Usar
  al tocar app.js, securityHeaders, mongoSanitize, db-connection, logger,
  CORS, docker-compose, .env.example o al agregar CDNs/tiles/APIs externas.
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
| Pin de Node | `.nvmrc` (`24.22.1`) + `engines.node` en los 3 `package.json` |
| Rate limit login/recovery | `SICEN-back/src/middlewares/rateLimiting.js` |
| Error handler | `SICEN-back/src/middlewares/errorHandler.js` |
| CORS + montaje | `SICEN-back/src/app.js` |
| URI Mongo | `SICEN-back/src/utils/db-connection.js` (`MONGO_URI` + `MONGO_USER` / `MONGO_PASSWORD`) |
| Logger | `SICEN-back/src/utils/logger.js` (`LOG_TO_FILE`, consola en Docker) |
| Fail-fast prod | `SICEN-back/src/config/env.config.js` |
| Compose | `docker-compose.yml` (`JWT_SECRET`, `MFA_ENCRYPTION_KEY`, `MONGO_URI`, `CORS_ORIGIN`, `LOG_TO_FILE`) |
| Plantillas env | `.env.example` (raíz) y `SICEN-back/.env.example` |

## Reglas obligatorias

1. **`MONGO_URI`**: host/esquema (`mongodb://` o `mongodb+srv://`) **sin**
   usuario ni contraseña en la URI. Las credenciales van en `MONGO_USER` /
   `MONGO_PASSWORD`; `resolveMongoUri` las inserta. En producción, si falta
   `MONGO_URI`, el proceso termina. No hardcodear cluster ni secretos.
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
5. **CSP archivos autenticados** (`/api/files`): el front descarga con
   `fetch` (`connect-src 'self'`) y muestra object URLs. `imgSrc` y
   `frameSrc` deben incluir `blob:`. No relajar `objectSrc` (`'none'`):
   no hay `<object>`/`<embed>` para esos archivos. Ver
   `authenticated-uploads`.
6. **Logger**: los niveles custom de Winston definen `warning`, no `warn`.
   `logger.js` alias `warn` → `warning`. Preferir `logger.warning`. En
   Docker/contenedor (`/.dockerenv` o `LOG_TO_FILE=false`) loguear a
   **stdout/stderr** (JSON). Archivo (`errors.log`) solo en producción
   local con `LOG_TO_FILE=true`. El rootfs del compose es read-only.
7. **Docker**: `docker-compose.yml` interpola `${JWT_SECRET:?…}`,
   `${MFA_ENCRYPTION_KEY:?…}`, `${MONGO_URI:?…}` y `${CORS_ORIGIN:?…}`
   (sin default). Pasa también `MONGO_USER`, `MONGO_PASSWORD` y
   `LOG_TO_FILE=false`. El `.env.example` de la raíz debe documentarlas
   **sin** el patrón credencial-en-URI (GitGuardian). El volumen
   `./SICEN-back/storage:/app/storage:rw` es el único path persistente
   escribible (uploads autenticados).
8. **Node parcheado**: runtime `>=24.22.1 <25 || >=26.12.1` (`.nvmrc` +
   `engines`). Complementa `rejectBrotli` contra CVE-2026-111497. Ver
   `js-major-deps`.

## Antipatrones

- ❌ `req.query = sanitizedQuery`
- ❌ Armar en código o ejemplos una URI Mongo con usuario y contraseña
  embebidos (GitGuardian lo marca; usar `MONGO_USER` / `MONGO_PASSWORD`)
- ❌ CSP sin hosts de tiles (rompe El Centinela y el mapa de tracking)
- ❌ CSP sin `blob:` en `imgSrc`/`frameSrc` (rompe avatares, pruebas y PDFs)
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
MONGO_URI=mongodb+srv://cluster.mongodb.net/SIGMU_DB?retryWrites=true&w=majority
MONGO_USER=...
MONGO_PASSWORD=...
CORS_ORIGIN=https://sicen.dominio.com,https://www.sicen.dominio.com
JWT_SECRET=...
MFA_ENCRYPTION_KEY=...
LOG_TO_FILE=false
```

## Ejemplos vivos

- CSP tiles: `securityHeaders.js` (`LEAFLET_TILE_ORIGINS`)
- CSP blob de uploads: `securityHeaders.js` + `securityHeaders.test.js`
- Sanitización: `mongoSanitize.js` + `mongoSanitize.test.js`
- URI Mongo: `db-connection.js` + `db-connection.test.js`
- CORS fail-fast: `app.js` + `env.config.js`
- Compose: `docker-compose.yml` environment del servicio `back`
