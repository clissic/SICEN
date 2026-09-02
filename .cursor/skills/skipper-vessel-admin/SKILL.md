---
name: skipper-vessel-admin
description: >-
  Mis barcos: búsqueda de buque deportivo, solicitud de administración con
  documento, email Marina Mercante, administradores en ficha. Usar al tocar
  /skipper/mis-barcos, vesselAdminRequests, ownership.administrators o
  VesselAdministratorsSection.
---

# Administración de buques por náuta

## Piezas

| Pieza | Path |
|---|---|
| Schema requests | `vesselAdminRequests.mongoose.js` |
| Campo buque | `vessels.mongoose.js` → `ownership.administrators` |
| Servicio | `vesselAdmin.service.js` |
| Emails | `vesselAdminEmails.service.js` |
| Upload | `vesselAdminProofUpload.middleware.js` |
| UI náuta | `SkipperMyVesselsPage.jsx` |
| UI PNN | `VesselAdministratorsSection.jsx` en `EditShipPage.jsx` |

## Flujo

1. Náuta busca con nombre + documentación deportiva + matrícula + puerto.
2. Exacto (4 campos) o sugerencias parciales (≥1 campo) con badges.
3. Solicita admin: `claimType` owner|admin + prefectura MM + PDF/foto.
4. Email a `emailMarinaMercante` con adjunto → deep link `/base-buques/editar/:id?focus=administradores`.
5. PNN aprueba (checklist) o rechaza (email al náuta con motivo).
6. Al aprobar `owner`: actualiza `ownership.owner` + agrega a `administrators`.
7. PNN puede agregar/quitar administradores manualmente en la ficha.

## Endpoints

- `POST /api/vessels/deportivo/search-claim`
- `GET /api/vessels/deportivo/my-admin-status`
- `POST /api/vessels/deportivo/request-admin` (multipart `proofDocument`)
- `POST /api/vessels/deportivo/cancel-admin-request`
- `POST /api/vessels/deportivo/unlink-vessel` (náuta: desvincular buque de su cuenta)
- `GET /api/vessels/by-business-id/:id/admin-requests`
- `POST /api/vessels/admin-requests/:id/approve|reject`
- `POST|DELETE …/administrators`

## Reglas

- **Nunca** anidar `<form>` de búsqueda dentro de `ShipRegistrationForm` (el submit del botón Buscar recarga la página). Usar `div` + `type="button"` + Enter con `preventDefault` (ver `VesselAdministratorsSection`, `SkipperDocumentLookupField`).
- Al elegir un resultado de búsqueda, confirmar con `confirmSkipperVesselLink` indicando el rol buscado (`propietario` / `administrador`).
- Solo buques `vesselType: "Deportivo"`.
- Nunca auto-vincular sin aprobación PNN (salvo alta PNN con búsqueda por documento).
- Preservar `ownership.administrators` al editar el buque (`buildRegistrationSubdoc`).
- `listDeportivoByOwner` y despacho náuta usan `skipperCanManageVessel` (owner string **o** `administrators.userId`).
- Etiqueta de propietario: `ownerLabelFromSkipper` en `skipperVesselOwner.js`.
- **Alta PNN** (`NewShipPage` + `enableSkipperOwnershipLinking`): propietario y administradores solo por búsqueda (`SkipperDocumentLookupField`); sin inputs de texto Propietario/Operador. Un solo propietario; el resto administradores. Payload `ownerSkipperUserId` + `administratorSkipperUserIds`.
- **Edición PNN** (`enableVesselAdminManagement`): mismos campos de texto ocultos; gestión en `VesselAdministratorsSection` con `input-group` a ancho completo. Si ya hay propietario, el alta solo permite administradores.

## Ejemplos vivos

- `SkipperMyVesselsPage.jsx`
- `VesselAdministratorsSection.jsx`
- `EditShipPage.jsx` (`focus=administradores`, `enableVesselAdminManagement` en el fieldset Propiedad)
- `NewShipPage.jsx` / `ShipRegistrationForm.jsx` (vinculación en alta)
- `SkipperDocumentLookupField.jsx`
- `skipperVesselOwner.js` (`skipperCanManageVessel`)
