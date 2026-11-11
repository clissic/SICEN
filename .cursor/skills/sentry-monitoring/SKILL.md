---
name: sentry-monitoring
description: >-
  Integración Sentry en SICEN (back @sentry/node + front @sentry/react). Usar al
  tocar instrument.js, scrubEvent, variables SENTRY_*/VITE_SENTRY_*, ErrorBoundary,
  Dockerfile build args de Sentry, o al depurar por qué no llegan eventos.
---

# Sentry en SICEN

## Reglas obligatorias

1. **DSN solo por env**: `SENTRY_DSN` (back) / `VITE_SENTRY_DSN` (front). Nunca hardcodear.
2. **Sin DSN = no-op**: no llamar `Sentry.init`; la app debe comportarse igual (sin warnings). Log solo con `SENTRY_DEBUG=1` / `VITE_SENTRY_DEBUG=1`.
3. **Privacidad**: `sendDefaultPii: false`; `beforeSend` / `beforeBreadcrumb` en `scrubEvent.js` (Authorization, Cookie, JWT, passwords, MFA/TOTP, bodies). Sin Session Replay. Sin upload de source maps.
4. **Back ESM**: `node --import ./src/instrument.js` + primer import en `app.js`. En dev, nodemon usa `exec` en `nodemon.json` (multiplataforma; no usar `NODE_OPTIONS='...'` estilo POSIX en scripts npm). Error handler con `registerSentryExpressErrorHandler(app)` **después de las rutas** y **antes** de `globalErrorHandler`.
5. **Front**: `initSentry()` en `main.jsx`; `VITE_*` en **build time** (Docker ARG).
6. Logger del back: niveles `fatal|error|warning|info|debug` (+ alias `warn` → `warning`). No usar APIs que no existan.
7. **Tests deterministas**: no depender de `.env.development` local. En back, stubear `SENTRY_DSN=""` (no `delete`) y mockear `dotenv`. En front, pasar env vacío a `initSentry(env)`.

## Archivos

| Pieza | Path |
|-------|------|
| Init back | `SICEN-back/src/instrument.js` |
| Scrub / config back | `SICEN-back/src/sentry/` |
| Init front | `SICEN-front/src/sentry.js` |
| Scrub / config front | `SICEN-front/src/sentry/` |
| Entrypoint front | `SICEN-front/src/main.jsx` |

## Env

```bash
# back
SENTRY_DSN=
SENTRY_ENVIRONMENT=
SENTRY_TRACES_SAMPLE_RATE=   # default 0.1

# front (build time)
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=
VITE_SENTRY_TRACES_SAMPLE_RATE=
```

## Cómo probar (sin endpoints de prueba en prod)

1. Sin DSN: `npm test` en back/front + `npm run build` en front; la app arranca igual.
2. Con DSN de proyecto de prueba: setear env, provocar un `throw` en un handler de desarrollo o `Sentry.captureException(new Error('ping'))` en consola del browser; verificar el evento **sin** headers Authorization ni body.
3. Docker: rebuild con `--build-arg VITE_SENTRY_DSN=...` (o via compose args); el DSN del back va en runtime (`SENTRY_DSN` en `.env`).

## Antipatrones

- ❌ DSN en el repo o en el código
- ❌ Session Replay / `sendDefaultPii: true`
- ❌ Subir source maps con auth token en CI
- ❌ Endpoints `/debug-sentry` expuestos en producción
- ❌ Inicializar Sentry cuando el DSN está vacío
