---
name: sport-movements-pattern
description: >-
  Implementa o extiende el módulo de movimientos deportivos entre prefecturas
  en SICEN (colección sportMovements, estados standBy/expired/inTransit,
  DESPACHOS/ARRIBOS/DEMORADOS, notificaciones de demora). Usar cuando se
  modifique el flujo de despacho/confirmación/renovación, se agregue confirmar
  arribo, flujo náuta (skipper), o se toquen pantallas bajo
  /mi-unidad/areas/movimientos-deportivos o /skipper/solicitar-despacho.
---

# Movimientos deportivos (Mi Unidad)

## Flujo náuta (rol `skipper`)

| Estado del náuta | SOLICITAR DESPACHO | INFORMAR ARRIBO |
|---|---|---|
| Sin movimiento abierto | Habilitado (nueva solicitud) | Deshabilitado |
| `standBy` / `expired` (pendiente prefectura) | **Habilitado** (gestionar / cancelar) | Deshabilitado |
| `inTransit` | Deshabilitado | Habilitado |

- Menú: `HomePage.jsx` (solo dos tiles para skipper).
- Solicitud: `SkipperDispatchPage` + `SportMovementFormModal` con `mode="skipper"`.
- Buques: `GET /api/vessels/deportivo/by-owner` (propietario = documento/nombre del usuario).
- Alta náuta: `POST /api/sportMovements/skipper/request` con `originUnit` (prefectura de despacho) + mismos campos del formulario. Campo `requestedBySkipper: true`.
- `originUnit` = prefectura elegida en el formulario (no `user.unit`).
- Estado menú: `GET /api/sportMovements/skipper/status` → `{ canRequestDispatch, canCreateDispatchRequest, canCancelDispatchRequest, canReportArrival, movement }`.
- Cancelar solicitud pendiente: `POST /api/sportMovements/skipper/cancel-request` con `{ movementId }` → elimina el movimiento `standBy`/`expired` creado por náuta.
- Informar arribo: `POST /api/sportMovements/:id/report-arrival` → cierra como `arrived`, detiene tracking y envía email solo a `emailMarinaMercante` de destino + tránsito (`sportMovementArrivalEmails.service.js`).
- Emisión GPS: cualquier náuta vinculado al buque (`skipperCanManageVessel`) puede enviar posiciones; `GET /api/sportMovements/skipper/tracking-status` → `{ shouldEmit, movementId, movement }`. Hook front `useSportMovementPositionEmitter`.
- Pendientes prefectura: aparecen en DESPACHOS de `originUnit` con badge «Náuta» si `requestedBySkipper`.

## Modelo de estados

| status | standBy | Significado | UI |
|---|---|---|---|
| `standBy` | true | Pendiente de confirmar salida (válido 24 h) | DESPACHOS origen |
| `expired` | true | No confirmado a tiempo | DESPACHOS + Renovar |
| `inTransit` | false | Confirmado | ARRIBOS si ETA futura; DEMORADOS si ETA pasada |
| `closed` | false | Caso cerrado por destino | Tabla «Buques arribados» dentro de ARRIBOS (Arribado / Siniestrado) |
| `cancelled` | false | Confirmado anulado por origen (motivo obligatorio) | Sale de confirmados/arribos/demorados; libera buque/patrón |

- `originUnit` = `req.user.unit` al crear (funcionario) o `body.originUnit` (náuta).
- `destinationUnit` = **Prefectura de destino** (sigla de `units`).
- `informedUnits[]` = prefecturas adicionales a informar durante el tránsito;
  no admite duplicados ni repetir `destinationUnit`.
- Vencimiento lazy en `listDispatchesForUser` / `expireStaleStandByForOrigin`.
- Cierre: `POST /:id/close` con `{ outcome: "arrived"|"maritimeIncident", observations }` → `closureOutcome`, `closureNotes`, `closedAt`. UI muestra **Arribado** o **Siniestrado**.
- Anulación de confirmado: `POST /:id/cancel` con `{ reason }` → `status: cancelled`, `cancellationReason`, `cancelledAt`. Modal `SportMovementCancelConfirmedModal` (no usar `confirmDelete` aquí: hace falta el motivo).
- Demora: al pasar ETA sin cierre, `materializeDelayedNotifications` (delegado a
  `materializeEtaOverdueAlerts`) notifica **origen + destino + tránsito** una sola
  vez y setea `delayedNotifiedAt` + `tracking.etaOverdueAlertAt`.
- **Seguimiento GPS:** ver skill `sport-movement-tracking` (`tracking.active`, posiciones, sin señal 5 min, ETA unificada).

## Capas

- Modelo: `SICEN-back/src/DAO/models/mongoose/sportMovements.mongoose.js`
  (+ `sportMovementPositions`, `sportMovementTrackingAlerts`)
- Servicio / controller / router: `sportMovements.*`, `sportMovementTracking.service.js`
- Cliente: `createSportMovement`, `skipperMovementStatus`, `skipperTrackingStatus`,
  `postSportMovementPosition`, `sportMovementTrack`, `openSportMovementTrackingStream`, …
- Front: `SportMovementsMenuPage`, `SportMovementsDispatchesPage`, `SkipperDispatchPage`, `SkipperReportArrivalModal`, `HomePage` (menú skipper), …
- Aviso de demora: inbox (`NotificationsBell` + `notifyAudience`), no Swal.

## Reglas

1. Solo buques `vesselType === "Deportivo"`.
2. Patrón: seafarer con licencia catálogo `UY_BD` (brevet A–D).
3. Acciones en tabla DESPACHOS pendientes: íconos con `data-sicen-popover`
   (Confirmar, Renovar, Modificar, Eliminar). Eliminar pendiente/vencido con
   `confirmDelete`. En **confirmados**: ícono Eliminar →
   `SportMovementCancelConfirmedModal` con motivo obligatorio.
4. Búsqueda de buque en Despachos: **no** cargar el catálogo completo. Usar `GET /api/vessels/by-type/Deportivo/search` (`vesselsByTypeSearch`) con ≥ 2 caracteres en nombre o matrícula, debounce ~350 ms y `limit` 15. `vesselsByType` queda para pickers chicos (p. ej. Ultramar).
   Al seleccionar una coincidencia, la tarjeta previa a «Registrar movimiento»
   muestra matrícula, tipo, puerto, bandera, documentación/categoría,
   propietario, año, indicativo, dimensiones, arqueo y capacidad. Mantener esos
   campos en la proyección liviana de `searchVesselsByType`.
5. Demorados → inbox unificado **ETA vencida** a **origen + destino + tránsito**
   vía `materializeEtaOverdueAlerts` / `delayedNotifiedAt`. Listado DEMORADOS incluye destino **y**
   tránsito; solo la unidad destino ve «Cerrar caso». Historial de demorados
   resueltos: `GET /closed?onlyDelayed=true` (cerrados con `closedAt >= eta`);
   los arribos a tiempo siguen en ARRIBOS sin mezclarse.
6. Respuestas API `{ ok, msg, ... }`. DELETE pendiente y POST cancel confirmado con `guarded` (unidad origen), no hace falta admin.
7. Cerrar caso desde DEMORADOS (unidad destino): `SportMovementCloseModal` modo `close`. Confirmar arribo desde ARRIBOS: mismo modal modo `confirmArrival` (outcome fijo `arrived`). Contacto del patrón (`bi-person-lines-fill` → `SportMovementSkipperContactModal`) en tablas de tránsito (Arribos) y demorados pendientes.
8. Un buque o patrón con movimiento abierto (`standBy`/`expired`/`inTransit`) no puede entrar en otro despacho. `closed` y `cancelled` liberan. La disponibilidad del **buque** se verifica al click de «Registrar movimiento» (`GET /availability/vessel/:vesselId`); el patrón se valida al guardar.
9. Orden del formulario en `SportMovementFormModal`: Fecha → Hora de ingreso →
   ETA → Prefectura de destino → [Prefectura de despacho si `mode="skipper"`] →
   Puerto despacho → Puerto destino. Luego **Prefecturas a informar**.
   **Patrón**: búsqueda por CI en Gente de Mar (`findSeafarerByDocument`) en
   ambos modos (`unit` y `skipper`); validar existencia y brevet UY_BD en front;
   el backend revalida con `resolveSkipperFromBody`. El patrón **no** tiene que
   ser el propietario ni el usuario logueado. Modo skipper envía `body.skipper`
   + `originUnit`; la cuenta náuta solo debe poder despachar buques que administra
   (`skipperCanManageVessel`).
10. `SportMovementFormModal` debe mantener el formulario como flex column y
   `.modal-body` con `overflowY: auto`; el `<form>` intermedio impide que
   `modal-dialog-scrollable` de Bootstrap funcione por sí solo.

## Antipatrones

- No mapear puerto ↔ unidad; el destino operativo es `destinationUnit`.
- No confundir el desplegable «Incidente marítimo» con el badge de listado («Siniestrado»).
- No usar cron para expirar: lazy update al listar.
- No reintroducir Swal/poller de demorados; usar el inbox.

## Ejemplos vivos

- Alta/confirmación/renovación: `SportMovementsDispatchesPage.jsx`
- Solicitud náuta: `SkipperDispatchPage.jsx`, `HomePage.jsx`
- Formulario: `SportMovementFormModal.jsx` (`mode="unit"` | `"skipper"`)
