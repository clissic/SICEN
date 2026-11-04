---
name: js-major-deps
description: >-
  Versiones major actuales del stack JS de SICEN (Vite 8, Vitest 5, React 19,
  react-router-dom 7, Express 5, Mongoose 9, bcrypt 6, nodemailer 10). Usar al
  agregar o actualizar dependencias, tocar vite.config / vitest.config, el
  catch-all de Express, hooks Mongoose, o al limpiar `npm audit`.
---

# Majors JS de SICEN (front + back)

Última alineación: PR de majors (Vite 8 / Express 5 / Mongoose 9). Antes de
subir otro major, revisar este skill y `npm outdated` en cada paquete.

## Versiones objetivo

### SICEN-front

| Paquete | Major |
|---|---|
| `vite` | 8 |
| `@vitejs/plugin-react` | 6 |
| `vite-plugin-pwa` | 2 |
| `vitest` | 5 |
| `react` / `react-dom` | 19 |
| `react-leaflet` | 5 |
| `react-router-dom` | 7 |

`react-router` v8 existe pero **no** se usa: exige React 19.2.7+ y Node 22.22+,
y elimina `react-router-dom`. v7.18+ ya parchea el open-redirect de `@remix-run/router`.

### SICEN-back

| Paquete | Major |
|---|---|
| `express` | 5 |
| `mongoose` | 9 |
| `bcrypt` | 6 |
| `nodemailer` | 10 |
| `dotenv` | 18 |
| `commander` | 15 |
| `concurrently` | 10 |
| `vitest` | 5 |

## Reglas al tocar este stack

1. **Express 5**: el fallback SPA es `app.get("/{*splat}", …)`. No volver a
   `app.get("*")`. No asignar `req.query` (en v5 es getter).
2. **Mongoose 9**: `{ returnDocument: "after" }` en vez de `{ new: true }`.
   `schema.pre("save")` sin `next()`. Ver `backend-crud-module`.
3. **Vite 8**: Rolldown/Oxc. No reintroducir `build.rollupOptions` (usar
   `build.rolldownOptions`). El plugin React es `@vitejs/plugin-react@6`.
4. **Vitest 5**: peer de Vite ≥ 6.4; `clearMocks` default `true`; `vi.mock`
   solo a nivel de módulo. Front: `SICEN-front/vitest.config.js` + script
   `npm test`. Back: `SICEN-back/vitest.config.js`.
5. **PWA**: no bajar `vite-plugin-pwa` para “arreglar” audit. El `deepmerge`
   de `workbox-build` queda en low y no tiene parche upstream.
6. **Overrides** (audit): front fuerza `nanoid`, `postcss`, `glob`,
   `minimatch`, `@babel/core`, etc. Back fuerza `qs`, `tar`, `minimatch`,
   `ip-address`, `shell-quote`. No usar `npm audit fix --force`.

## Antipatrones

- ❌ Subir a `react-router@8` sin un PR dedicado (rompe imports en todo el front).
- ❌ `npm audit fix --force` sobre `vite-plugin-pwa` (te deja en 0.2 / 1.1).
- ❌ `{ new: true }` en updates Mongoose.
- ❌ Catch-all Express 4 (`*`) o wildcards sin nombre.

## Ejemplos vivos

- Catch-all SPA: `SICEN-back/src/app.js`
- Pre-hook Mongoose 9: `SICEN-back/src/DAO/models/mongoose/seafarers.mongoose.js`
- `returnDocument`: `mapMarkers.service.js`, DAOs de multas
- Vite 8 + PWA 2: `SICEN-front/vite.config.js`
- Vitest 5 front: `SICEN-front/vitest.config.js`
