---
name: skipper-seafarer-link
description: >-
  Vinculación formal cuenta skipper ↔ ficha seafarers (MI DOCUMENTACIÓN,
  Verificaciones, email Marina Mercante, documento adjunto, desvinculación).
  Usar al tocar /skipper/mi-documentacion, seafarer-links, SeafarerPendingActionsSection
  o verificación de identidad de náuta.
---

# Vinculación verificada náuta ↔ ficha PNN

## Piezas

| Pieza | Path |
|---|---|
| Schema requests | `SICEN-back/src/DAO/models/mongoose/seafarerLinkRequests.mongoose.js` |
| Campo user | `users.mongoose.js` → `seafarerLink` |
| Servicio | `seafarerLinks.service.js` |
| Emails | `seafarerLinkEmails.service.js` + token `seafarerLinkEmailToken.js` |
| Adjunto ID | `seafarerLinkIdentityFiles.js` + `seafarerLinkIdentityUpload.middleware.js` |
| API | `/api/seafarer-links` (`seafarerLinks.router.js`) |
| UI náuta | `SkipperMyDocumentationPage.jsx` |
| UI PNN | `SeafarerPendingActionsSection.jsx` en `SeafarerConsultPage.jsx` |

## Flujo

1. Náuta (`skipper`) en **MI DOCUMENTACIÓN**: match por `documentId` (DNI luego pasaporte) contra `seafarers`.
2. Adjunta foto/PDF del frente de cédula o hoja de datos del pasaporte + elige prefectura con `hasEmailMarinaMercante` → `POST /me/request-link` (multipart `identityDocument` + `unitAcronym`).
3. Email a `unit.emailMarinaMercante` **con el documento adjunto** y deep link:
   `/base-gente-mar/todos?seafarerId=…&focus=acciones-pendientes&token=…`
4. Funcionario abre ficha → **Verificaciones** → puede **Ver documento adjunto** → confirma identidad a distancia → **Vincular**.
5. Si el nombre de la cuenta no coincide con la ficha PNN, al aprobar se **alinean automáticamente** `first_name`/`last_name` del usuario al de la ficha.
6. Desvinculación (PNN o náuta): motivo obligatorio → email a MM de `linkedByUnit` → confirmar.
7. Mientras haya vínculo (`linked` / `pending_unlink`): **bloqueados** DNI, pasaporte, nombres y apellidos en ficha y en cuenta.

## Reglas anti-fraude

- Nunca auto-vincular por documento.
- Un `seafarerId` solo puede estar `linked` a una cuenta (índice único parcial).
- Checklist obligatorio `identityVerified` al aprobar (documento adjunto o verificado).
- Observación automática en la ficha al vincular/desvincular (incluye nota si se sincronizó el nombre).
- Máx. 3 solicitudes de link por usuario/semana.
- Coherencia nombre/FN/teléfono/email: badges; el nombre se corrige al aprobar.
- **Buscar cuenta para vincular** (`GET …/matching-accounts`): PNN busca skippers por documento; `POST …/link-user` + checklist.
- Identity lock hasta desvincular (backend + UI).

## Estados `users.seafarerLink.status`

`none` → `pending_link` → `linked` → `pending_unlink` → `none`

## Endpoints clave

- `GET /me/status`, `GET /me/profile`
- `POST /me/request-link` (multipart), `POST /me/cancel`, `POST /me/request-unlink`
- `GET /seafarer/:id/pending-actions`, `GET …/matching-accounts`
- `GET /requests/:id/identity-document`
- `POST /requests/:id/approve-link|reject-link|approve-unlink|reject-unlink`
- `POST /seafarer/:id/request-unlink`, `POST /seafarer/:id/link-user`

## Ejemplos vivos

- `SkipperMyDocumentationPage.jsx`
- `SeafarerPendingActionsSection.jsx`
- `SeafarerConsultPage.jsx` (deep link + identity lock)
- `SeafarerBasicDataEditModal.jsx` (`identityFieldsLocked`)
