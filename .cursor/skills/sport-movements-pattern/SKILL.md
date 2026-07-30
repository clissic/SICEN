---
name: sport-movements-pattern
description: >-
  Implementa o extiende el módulo de movimientos deportivos entre prefecturas
  en SICEN (colección sportMovements, estados standBy/expired/inTransit,
  DESPACHOS/ARRIBOS/DEMORADOS, notificaciones de demora). Usar cuando se
  modifique el flujo de despacho/confirmación/renovación, se agregue confirmar
  arribo, o se toquen pantallas bajo /mi-unidad/areas/movimientos-deportivos.
---

# Movimientos deportivos (Mi Unidad)

## Modelo de estados

| status | standBy | Significado | UI |
|---|---|---|---|
| `standBy` | true | Pendiente de confirmar salida (válido 24 h) | DESPACHOS origen |
| `expired` | true | No confirmado a tiempo | DESPACHOS + Renovar |
| `inTransit` | false | Confirmado | ARRIBOS si ETA futura; DEMORADOS si ETA pasada |
| `closed` | false | Caso cerrado por destino | Tabla «Buques arribados» dentro de ARRIBOS (Arribado / Siniestrado) |
| `cancelled` | false | Confirmado anulado por origen (motivo obligatorio) | Sale de confirmados/arribos/demorados; libera buque/patrón |

- `originUnit` = `req.user.unit` al crear.
- `destinationUnit` = **Prefectura de destino** (sigla de `units`).
- `informedUnits[]` = prefecturas adicionales a informar durante el tránsito;
  no admite duplicados ni repetir `destinationUnit`.
- Vencimiento lazy en `listDispatchesForUser` / `expireStaleStandByForOrigin`.
- Cierre: `POST /:id/close` con `{ outcome: "arrived"|"maritimeIncident", observations }` → `closureOutcome`, `closureNotes`, `closedAt`. UI muestra **Arribado** o **Siniestrado**.
- Anulación de confirmado: `POST /:id/cancel` con `{ reason }` → `status: cancelled`, `cancellationReason`, `cancelledAt`. Modal `SportMovementCancelConfirmedModal` (no usar `confirmDelete` aquí: hace falta el motivo).
- Demora: al pasar ETA sin cierre, `materializeDelayedNotifications` crea
  notificaciones (destino + tránsito) una sola vez y setea `delayedNotifiedAt`.
  Ver skill `notifications-pattern`.

## Capas

- Modelo: `SICEN-back/src/DAO/models/mongoose/sportMovements.mongoose.js`
- Servicio / controller / router: `sportMovements.*`
- Cliente: `createSportMovement`, `sportMovementsDispatches`, `…Arrivals`, `…Delayed`, `confirmSportMovement`, `renewSportMovement`, `cancelConfirmedSportMovement`, `deleteSportMovement` en `client.js`
- Front: `SportMovementsMenuPage`, `SportMovementsDispatchesPage` (pendientes + confirmados con eliminar), `SportMovementsArrivalsPage` (en tránsito + arribados), `SportMovementsDelayedPage` (cerrar caso + contacto patrón), `SportMovementFormModal`, `SportMovementCloseModal`, `SportMovementCancelConfirmedModal`, `SportMovementSkipperContactModal`
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
5. Demorados → notificaciones persistentes (una por usuario de destino y de
   cada `informedUnits`) vía `materializeDelayedNotifications` + `dedupeKey`.
   Idempotente con `delayedNotifiedAt`. Listado DEMORADOS incluye destino **y**
   tránsito; solo la unidad destino ve «Cerrar caso». Historial de demorados
   resueltos: `GET /closed?onlyDelayed=true` (cerrados con `closedAt >= eta`);
   los arribos a tiempo siguen en ARRIBOS sin mezclarse.
6. Respuestas API `{ ok, msg, ... }`. DELETE pendiente y POST cancel confirmado con `guarded` (unidad origen), no hace falta admin.
7. Cerrar caso desde DEMORADOS (unidad destino): `SportMovementCloseModal` modo `close`. Confirmar arribo desde ARRIBOS: mismo modal modo `confirmArrival` (outcome fijo `arrived`). Contacto del patrón (`bi-person-lines-fill` → `SportMovementSkipperContactModal`) en tablas de tránsito (Arribos) y demorados pendientes.
8. Un buque o patrón con movimiento abierto (`standBy`/`expired`/`inTransit`) no puede entrar en otro despacho. `closed` y `cancelled` liberan. La disponibilidad del **buque** se verifica al click de «Registrar movimiento» (`GET /availability/vessel/:vesselId`); el patrón se valida al guardar.
9. Orden del formulario en `SportMovementFormModal`: Fecha → Hora de ingreso →
   ETA → Prefectura de destino → Puerto despacho → Puerto destino. Luego la
   sección **Prefecturas a informar** solo con filas de tránsito (sin destino).
   Puerto despacho = `portsUnderJurisdiction` de la unidad del usuario;
   Puerto destino = puertos de la unidad elegida en Prefectura de destino.
   Al cambiar el destino se limpia el puerto destino.
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
- Listados destino: `SportMovementsListPage.jsx`
- Formulario: `SportMovementFormModal.jsx`
