---
name: user-roles
description: >-
  Roles de usuario SICEN (BD + labels UI). Usar al crear/editar usuarios,
  filtros por rol, badges en Home, agregados del menú Usuarios, o al tocar
  el enum `role` del schema users / validaciones en users.controller.
---

# Roles de usuario

## Fuente de verdad

| Capa | Path |
|---|---|
| Front (labels + options) | `SICEN-front/src/constants/userRoles.js` |
| Back (valores BD) | `SICEN-back/src/constants/userRoles.js` |
| Schema Mongoose | `users.mongoose.js` → `enum: USER_ROLE_VALUES` |

## Denominaciones (BD) ↔ UI

| Valor BD | Label |
|---|---|
| `user` | Funcionario de PNN |
| `skipper` | Náuta deportivo |
| `seaman` | Gente de mar |
| `agency` | Agente Marítimo |
| `admin` | Administrador |
| `superAdmin` | Super administrador |

## Reglas

- Nunca hardcodear listas de roles en páginas: importar `USER_ROLES`,
  `CREATE_USER_ROLE_OPTIONS_*`, `ADMIN_EDIT_ROLES`, `ROLE_FILTER_OPTIONS`
  o `userRoleLabel()`.
- Solo `superAdmin` puede asignar `superAdmin` (create / update).
- Admin/superAdmin siguen siendo los únicos privilegiados para rutas
  `adminGuarded` / `ProtectedRoute admin` (no confundir con skipper/seaman/agency).
- Al agregar un rol nuevo: actualizar **ambos** constants (front y back) y el
  enum del schema (vía `USER_ROLE_VALUES`).
- **Nuevo usuario:** el rol se elige con **orejetas** (tabs) arriba del
  formulario (`new-user-page.css`). `roleUsesPnnFields` / `isSkipperRole`
  definen qué campos se muestran.
  - PNN / admin / agency / seaman (por ahora): Grado + Unidad + Email.
  - **Náuta deportivo** (`skipper`): DNI/Pasaporte + Fecha de nacimiento + Teléfono + Email (sin Grado/Unidad). Home con **Menú principal** (Solicitar despacho / Informar arribo), **Áreas de Gestión** (Mi documentación → `/skipper/mi-documentacion` con vinculación verificada a `seafarers`, Mis barcos → `/skipper/mis-barcos` con búsqueda y solicitud de administración — skill `skipper-vessel-admin`) y **Ayudas al navegante** (Sistemas externos → `/herramientas`). Persiste `documentId`, `phone`, `FN`; `rank` fijo `"Nauta"`; `unit` vacío. Vinculación formal ficha: skill `skipper-seafarer-link`.
- **Desde solicitud de cuenta:** el correo incluye CTA a
  `/usuarios/nuevo?prefill=<base64url>` (crear) y
  `/usuarios/rechazar-solicitud?token=<hmac>` (rechazar; 30 días).
  El rechazo exige admin y envía email al solicitante
  (`sendAccountRequestRejectedEmail`). Mapeo accountType → role en
  `newUserPrefill.js`. El login debe preservar `pathname+search` del `from`.

## Ejemplos vivos

- `NewUserPage.jsx` (orejetas + campos por rol + prefill desde email)
- `RejectAccountRequestPage.jsx` (confirmar rechazo)
- `SICEN-back/src/utils/newUserPrefill.js` + `accountRequestReject.js`
- `UpdateUserPage.jsx`, `UpdateDataPage.jsx`
- `AllUsersPage.jsx` (filtro + columna)
- `HomePage.jsx` (badge + menú por rol; náuta: despacho/arribo, gestión, herramientas)
- `SkipperMyDocumentationPage.jsx` + skill `skipper-seafarer-link`
- `summarizeUsersByRole` en `userAggregates.js`
- `users.controller.js` (`USER_ROLE_SET`, create skipper, reject)