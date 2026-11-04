# SICEN-back + SICEN-front — multi-stage Dockerfile
#
# Construye el frontend (React + Vite) y ejecuta el backend (Express) sirviendo
# los assets estáticos del build. El backend corre bajo usuario no-root, rootfs
# read-only con tmpfs donde hace falta, y solo storage/ como volumen escribible.
#
# Contexto de build: raíz del repo (padre de SICEN-back y SICEN-front).
#   docker build -f SICEN-back/Dockerfile -t sicen-back:latest .
#
# Correr:
#   docker run --rm \
#     --read-only --tmpfs /tmp:rw,noexec,nosuid \
#     -v ./storage:/app/storage:rw \
#     -p 127.0.0.1:3000:3000 \
#     --env-file .env.production \
#     sicen-back:latest

# ────────────────────────────────────────────────────────────────────────────
# Stage 1: Build frontend
# ────────────────────────────────────────────────────────────────────────────
FROM node:24.22.1-alpine AS frontend-builder

WORKDIR /build-front
COPY SICEN-front/package*.json ./
RUN npm ci --omit=dev --omit=optional

COPY SICEN-front/ ./
# Vite lee .env.production si existe en el contexto; armamos el build prod
RUN npm run build

# ────────────────────────────────────────────────────────────────────────────
# Stage 2: Backend runtime
# ────────────────────────────────────────────────────────────────────────────
FROM node:24.22.1-alpine

# Instalamos dumb-init para reaping correcto de procesos (PID 1)
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copiamos dependencias de prod del backend
COPY SICEN-back/package*.json ./
RUN npm ci --omit=dev --omit=optional && npm cache clean --force

# Copiamos el código fuente del backend
COPY SICEN-back/src ./src
COPY SICEN-back/nodemon.json ./
COPY SICEN-back/vitest.config.js ./

# Copiamos el build del frontend al directorio público del backend
COPY --from=frontend-builder /build-front/dist ./public

# Creamos directorios de storage (montados como volúmenes en runtime)
# y /tmp (montado como tmpfs read-only en runtime para logs transitorios)
RUN mkdir -p \
  storage/avatars \
  storage/carFineProves \
  storage/shipFineProves \
  storage/personalFineProves \
  storage/inspectionsERP \
  storage/seafarerLinkIdentity \
  storage/vesselAdminProof \
  /tmp

# Usuario no-root para ejecutar la app
RUN addgroup -g 10001 sicenapp && \
    adduser -D -u 10001 -G sicenapp -s /bin/sh sicenapp && \
    chown -R sicenapp:sicenapp /app /tmp

USER sicenapp

ENV NODE_ENV=production
ENV PORT=3000
ENV LOGGER_ENV=production

EXPOSE 3000

# Healthcheck: verifica que Express responda en /api/sessions/current
# (endpoint público que no requiere JWT, devuelve 401 si no hay sesión pero
# confirma que la app está viva)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/sessions/current', (res) => { process.exit(res.statusCode === 401 || res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "./src/app.js", "--mode", "PRODUCTION"]
