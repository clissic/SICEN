---
name: authenticated-uploads
description: >-
  Archivos subidos en SICEN servidos por GET /api/files/:type/:filename con
  JWT, roles y magic bytes (no express.static público). Usar al mostrar
  avatares, pruebas de multas o PDFs de inspecciones, al agregar un tipo
  de upload, o al tocar multer / CSP / el volumen Docker de storage.
---

# Uploads autenticados

Los archivos en `SICEN-back/storage/` **no** se sirven con `express.static`.
El front pide el binario con `Authorization: Bearer` y lo muestra como
object URL (`blob:`).

## Piezas

| Pieza | Path |
|---|---|
| Ruta | `GET /api/files/:type/:filename` (`files.router.js`) |
| Guard + roles | `files.controller.js` + `checkLogin` |
| Magic bytes | `utils/fileValidation.js` (`file-type`) en cada multer |
| Front fetch→blob | `hooks/useAuthenticatedFile.jsx` |
| Conversión de URL | `utils/authenticatedFileUrl.js` |
| CSP | `middlewares/securityHeaders.js` (`imgSrc`/`frameSrc` + `blob:`) |
| Volumen Docker | `docker-compose.yml` → `./SICEN-back/storage:/app/storage:rw` |

## Tipos y roles

| `type` | Roles |
|---|---|
| `avatars` | cualquier usuario autenticado |
| `carFineProves` | admin / superAdmin / contable |
| `shipFineProves` | admin / superAdmin |
| `personalFineProves` | admin / superAdmin |
| `inspectionsERP` | cualquier usuario autenticado |

La BD sigue guardando paths `/uploads/<type>/<filename>`; el helper
`toAuthenticatedFileUrl` los traduce a `/api/files/...`.

## Reglas obligatorias

1. **No reintroducir** `app.use("/uploads/...", express.static(...))`.
2. **UI**: `<AuthenticatedImage>` para fotos y
   `<AuthenticatedDownloadLink>` para descargas/previews. Nunca
   `<img src={url}>` ni `<a href={url}>` crudos sobre `/uploads/` o
   `/api/files/` (el browser no manda el JWT).
3. **URLs públicas** (`/img/...`) no pasan por `/api/files`.
4. **Express 5**: la ruta usa params nombrados `/:type/:filename` (el
   punto de `.jpg`/`.pdf` va en `filename`). Prohibido `*` suelto.
5. **CSP**: `img-src` y `frame-src` con `blob:`; `object-src 'none'`;
   `connect-src 'self'` para el `fetch`. Ver `http-security-hardening`.
6. **Docker**: rootfs read-only; los uploads viven en el volumen
   `/app/storage`. `ensure*DirSync()` crea las subcarpetas al arrancar.
7. **Validar magic bytes** en el multer (JPEG / PDF / etc.) y borrar el
   archivo si no coincide.

## Antipatrones

- ❌ Servir `storage/` como estático público
- ❌ `<img src="/uploads/avatars/...">` o iframe a `/api/files/...`
- ❌ Wildcards Express 4 (`app.get("*")`) para el fallback SPA o files
- ❌ Guardar el filename original en procedimientos (usar UUID)

## Template UI

```jsx
import { AuthenticatedImage, AuthenticatedDownloadLink } from "../hooks/useAuthenticatedFile.jsx";
import { isProtectedFileUrl } from "../utils/authenticatedFileUrl.js";

<AuthenticatedImage src={user.avatar} alt="perfil" />

<AuthenticatedDownloadLink href={inspection.inspectionPDF} download="Inspeccion.pdf">
  Descargar PDF
</AuthenticatedDownloadLink>
```

## Ejemplos vivos

- `CarFineCard` / `ShipFineCard` / `PersonalFineCard` / `CarFineProveViewer`
- `HomePage` (avatar) y `InspectionCompletionModal` / `ConsultInspectionsListPage` (PDF)
- Tests: `files.controller.test.js`, `fileValidation.test.js`,
  `files.router.express5.test.js`, `securityHeaders.test.js`
