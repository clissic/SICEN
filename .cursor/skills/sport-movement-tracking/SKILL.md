---
name: sport-movement-tracking
description: >-
  Seguimiento GPS de movimientos deportivos SICEN (posiciones persistentes,
  SSE tiempo real, alertas sin señal 5 min y ETA vencida unificada, emisor náuta,
  cola IndexedDB, capa Posicionamiento SICEN). Usar al tocar sportMovementPositions,
  tracking.active, recordPosition, useSportMovementPositionEmitter,
  SicenPositioningLayer o sportMovementTracking.service.js.
---

# Seguimiento GPS — movimientos deportivos

**Documentación completa (producto + roadmap móvil):** `docs/seguimiento-gps-movimientos-deportivos.md`

## Modelo

| Colección / campo | Uso |
|---|---|
| `sportMovementPositions` | Cada punto GPS (insert only, sin TTL) |
| `sportMovements.tracking` | `active`, `lastPosition`, `communicationState`, flags idempotencia |
| `tracking.noSignal5LastBucket` | Último bucket de 5 min alertado en el episodio actual |
| `sportMovementTrackingAlerts` | Trazabilidad (`dedupeKey` único) |
| `delayedNotifiedAt` | Idempotencia **unificada** de ETA vencida (con `tracking.etaOverdueAlertAt`) |

## Flujo

1. `confirmSportMovement` → `startTrackingOnConfirm` (`tracking.active = true`)
2. Náuta vinculado al buque (`skipperCanManageVessel`) → `POST /:id/positions` (~60 s)
3. Monitor server cada 60 s: sin señal **5 min**; ETA vencida vía `processEtaOverdueForMovement`
4. Stop: `reportArrivalBySkipper` (idempotente), `closeSportMovement`, `cancelConfirmedSportMovement`

## Alertas (inbox)

Todas las alertas de tracking usan `notifyUnitsForMovement` → **origen + destino + tránsito**.

| Tipo | Disparador |
|---|---|
| `sport_movement_tracking_started` | Al confirmar despacho |
| `sport_movement_eta_overdue` | ETA vencida (una vez; `materializeEtaOverdueAlerts`) |
| `sport_movement_no_signal_5` | > 5 min sin posición GPS (cada bucket de 5 min del episodio; se reinicia al recibir posición) |

Email `sportMovementTrackingEmails.service.js`: sin señal → contactos de **origen + destino + tránsito** (`collectUnitContactEmails`), un envío por bucket (`no_signal_5:{movementId}:{lastMs}:{bucket}`).

No usar alerta de 3 minutos (`no_signal_3` queda solo por datos legacy en BD).

## API

| Método | Ruta |
|---|---|
| POST | `/api/sportMovements/:id/positions` |
| GET | `/api/sportMovements/:id/positions` |
| GET | `/api/sportMovements/:id/last-position` |
| GET | `/api/sportMovements/:id/track` |
| GET | `/api/sportMovements/tracking/active-map` |
| GET | `/api/sportMovements/tracking/stream` (SSE) |
| GET | `/api/sportMovements/skipper/tracking-status` |

Rutas estáticas (`/tracking/*`, `/skipper/*`) **antes** de `/:id` en el router.

## Front

| Pieza | Path |
|---|---|
| Emisor GPS | `hooks/useSportMovementPositionEmitter.js` |
| Cola offline | `utils/sportMovementPositionQueue.js` (IndexedDB) |
| Stream mapa | `hooks/useSportMovementTrackingStream.js` |
| Capa Centinela | `components/centinela/SicenPositioningLayer.jsx` |
| Detalle PNN | `components/SportMovementTrackingPanel.jsx` |

## Reglas

1. Informar arribo sigue siendo solo el patrón del movimiento; emisor GPS puede ser otro náuta del buque.
2. Emails de arribo: solo `emailMarinaMercante` de destino + tránsito (`collectMarinaMercanteEmails`).
3. Posición tras cierre → `409`; cola offline descarta en `409`.
4. SSE filtra por unidad (origen/destino/tránsito) o náuta con buque gestionado.
5. `compression` y proxy Vite deben excluir `/api/sportMovements/tracking/stream`.
6. `materializeDelayedNotifications` en `sportMovements.service.js` delega a `materializeEtaOverdueAlerts` (no duplicar lógica).

## Ejemplos vivos

- Backend: `sportMovementTracking.service.js`, `sportMovementTrackingBridge.service.js`
- Centinela: `CentinelaPage.jsx` (capa primera, default on)
- Náuta: `HomePage.jsx` (banner + emisor)
- PNN: `SportMovementsArrivalsPage.jsx` (botón geo + badges comunicación)

## Emisión continua (no implementado)

El emisor web (`useSportMovementPositionEmitter`) **no** funciona con la app cerrada. Para background GPS ver §7 de `docs/seguimiento-gps-movimientos-deportivos.md`: apps nativas Android/iOS o Capacitor llamando `POST /:id/positions` con `source: android|ios` y `GET /skipper/tracking-status`.
