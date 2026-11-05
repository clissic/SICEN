# SICEN-back + SICEN-front — multi-stage Dockerfile
#
# Construye el frontend (React 19 + Vite 8) y ejecuta el backend (Express 5)
# sirviendo los estáticos. Node 24.22.1-alpine, usuario no-root, rootfs
# read-only con tmpfs, y solo storage/ como volumen escribible.
#
# Contexto de build: raíz del repo (padre de SICEN-back y SICEN-front).
#   docker build -f SICEN-back/Dockerfile -t sicen-back:latest .
#
# Vite 8 escribe a `../SICEN-back/public` (outDir en vite.config.js) y usa
# `build.cssMinify: "esbuild"` (devDependency) para conservar backdrop-filter.
# Por eso el stage de front:
#   - conserva el layout del monorepo (`/repo/SICEN-front` → `/repo/SICEN-back/public`)
#   - corre `npm ci` CON devDependencies (vite, plugin-react, esbuild, PWA)

# ────────────────────────────────────────────────────────────────────────────
# Stage 1: Build frontend (Vite 8)
# ────────────────────────────────────────────────────────────────────────────
FROM node:24.22.1-alpine AS frontend-builder

WORKDIR /repo/SICEN-front
COPY SICEN-front/package.json SICEN-front/package-lock.json ./
# Vite 8, @vitejs/plugin-react, esbuild y vite-plugin-pwa viven en devDependencies.
# No omitir optional: esbuild/rolldown traen bindings musl por optionalDependencies.
RUN npm ci

COPY SICEN-front/ ./
RUN npm run build

# ────────────────────────────────────────────────────────────────────────────
# Stage 2: Backend runtime (Express 5, Node 24.22.1)
# ────────────────────────────────────────────────────────────────────────────
FROM node:24.22.1-alpine

# dumb-init: reaping correcto de procesos (PID 1)
# python3/make/g++: bcrypt 6 puede necesitar compile nativo en musl; se borran después
RUN apk add --no-cache dumb-init python3 make g++

WORKDIR /app

COPY SICEN-back/package.json SICEN-back/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force \
  && apk del python3 make g++

COPY SICEN-back/src ./src

# Vite 8 outDir: /repo/SICEN-back/public (no dist/)
COPY --from=frontend-builder /repo/SICEN-back/public ./public

RUN mkdir -p \
  storage/avatars \
  storage/carFineProves \
  storage/shipFineProves \
  storage/personalFineProves \
  storage/inspectionsERP \
  storage/seafarerLinkIdentity \
  storage/vesselAdminProof \
  /tmp

RUN addgroup -g 10001 sicenapp && \
    adduser -D -u 10001 -G sicenapp -s /bin/sh sicenapp && \
    chown -R sicenapp:sicenapp /app /tmp

USER sicenapp

ENV NODE_ENV=production
ENV PORT=3000
ENV LOGGER_ENV=production
# Rootfs read-only: Winston no puede crear errors.log. docker logs lee stdout.
ENV LOG_TO_FILE=false

EXPOSE 3000

# Healthcheck: GET /api/sessions/me es público (200 + user:null sin JWT = app viva)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/sessions/me', (res) => { process.exit(res.statusCode === 401 || res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "./src/app.js", "--mode", "PRODUCTION"]
