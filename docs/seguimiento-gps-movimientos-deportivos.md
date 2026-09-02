# Seguimiento GPS — movimientos deportivos (SICEN)

Documentación de lo **implementado hoy** en SICEN para el seguimiento, monitoreo y trazabilidad de posiciones de buques deportivos en tránsito entre prefecturas.

**Skills relacionados (agente / desarrollo):**

- `.cursor/skills/sport-movement-tracking/SKILL.md` — referencia rápida para cambios de código.
- `.cursor/skills/sport-movements-pattern/SKILL.md` — ciclo de vida del movimiento (DESPACHOS / ARRIBOS / DEMORADOS).
- `.cursor/skills/centinela-map-pattern/SKILL.md` — capa **Posicionamiento SICEN** en El Centinela.
- `.cursor/skills/geo-dms-format/SKILL.md` — formato DMS obligatorio para lat/long en UI y emails.

---

## 1. Resumen

| Capa | Qué hace |
|------|----------|
| **Backend** | Persiste cada posición GPS, actualiza estado del movimiento, monitoriza silencio y ETA, notifica inbox + email, expone API REST y SSE. |
| **Náuta (web)** | Emite posiciones ~cada 60 s desde el navegador mientras la sesión está activa (`HomePage`). |
| **PNN** | Ve arribos/demorados con badges de comunicación; consulta historial y contacto del patrón. |
| **El Centinela** | Capa **Posicionamiento SICEN** en tiempo real (mapa + popups + modales de contacto e historial). |

El seguimiento se **activa** al confirmar el despacho en origen (`inTransit` + `tracking.active = true`) y se **detiene** al informar arribo (náuta), cerrar caso (PNN) o anular confirmado (origen).

---

## 2. Integración con el ciclo de vida del movimiento

```
standBy / expired  →  confirm (origen)  →  inTransit + tracking.active
                                              ↓
                                    emisor GPS (náuta vinculado al buque)
                                              ↓
                         posiciones → sportMovementPositions (histórico)
                                              ↓
              monitor (60 s): sin señal 5 min · ETA vencida
                                              ↓
        stop: report-arrival | close | cancel  →  tracking.active = false
```

| Evento | Servicio / hook | Efecto en tracking |
|--------|-----------------|-------------------|
| Confirmar despacho | `startTrackingOnConfirm` | `tracking.active = true`, inbox «Seguimiento GPS activado» |
| Registrar posición | `recordPosition` | Insert en `sportMovementPositions`, actualiza `tracking.lastPosition` |
| Sin señal > 5 min | `evaluateMovementTracking` | Alerta inbox + email por **bucket** de 5 min (repite cada ventana; se reinicia al recibir posición) |
| ETA vencida | `processEtaOverdueForMovement` | Inbox + `delayedNotifiedAt` (idempotente) |
| Informar arribo (náuta) | `stopMovementTracking` + emails MM | Cierra movimiento; email solo Marina Mercante destino + tránsito |
| Cerrar caso (PNN destino) | `stopMovementTracking` | `tracking.active = false` |
| Anular confirmado (origen) | `stopMovementTracking` | Idem |

---

## 3. Modelo de datos

### Colección `sportMovementPositions`

Cada punto GPS (solo inserción, sin TTL).

| Campo | Tipo | Notas |
|-------|------|--------|
| `movementId` | ObjectId | Movimiento |
| `vesselId`, `userId` | ObjectId | Buque y náuta emisor |
| `latitude`, `longitude` | Number | Grados decimales (almacenamiento) |
| `accuracy`, `speed`, `heading`, `altitude`, `batteryLevel` | Number | Opcionales |
| `positionTimestamp` | Date | Hora del dispositivo |
| `receivedAt` | Date | Hora de recepción en servidor |
| `source` | String | `browser` \| `android` \| `ios` \| `other` |

### Subdocumento `sportMovements.tracking`

| Campo | Uso |
|-------|-----|
| `active` | Seguimiento en curso |
| `startedAt`, `stoppedAt`, `stoppedBy` | Auditoría de inicio/fin |
| `communicationState` | `normal` \| `no_signal_5` (legacy `no_signal_3`) |
| `lastPosition` | Snapshot de última posición (consulta rápida) |
| `noSignal5LastBucket` | Último bucket de 5 min ya alertado en el episodio actual |
| `lastNoSignal5AlertAt` | Timestamp de última alerta sin señal |
| `etaOverdueAlertAt` | ETA vencida materializada |
| `arrivalEmailsSentAt` | Idempotencia emails de arribo náuta |

### Colección `sportMovementTrackingAlerts`

Trazabilidad de alertas con `dedupeKey` único (p. ej. `no_signal_5:{movementId}:{lastMs}:{bucket}`).

### Campo `delayedNotifiedAt` (raíz del movimiento)

Idempotencia unificada de **ETA vencida** (sustituye duplicados legacy de demora).

---

## 4. Backend

### Archivos principales

| Archivo | Responsabilidad |
|---------|-----------------|
| `sportMovementTracking.service.js` | Lógica core: start/stop, `recordPosition`, monitor, alertas, historial |
| `sportMovementTrackingBridge.service.js` | Fan-out SSE (`position`, `tracking_state`, `alert`) |
| `sportMovementTrackingEmails.service.js` | Email sin señal 5 min |
| `sportMovementArrivalEmails.service.js` | Email arribo náuta (solo `emailMarinaMercante` destino + tránsito) |
| `sportMovementPositions.mongoose.js` | Schema posiciones |
| `sportMovementTrackingAlerts.mongoose.js` | Schema alertas |

### API REST (`/api/sportMovements`, JWT)

Rutas **estáticas** (`/tracking/*`, `/skipper/*`) declaradas **antes** de `/:id`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/:id/positions` | Registrar posición (náuta con buque gestionado) |
| GET | `/:id/positions` | Historial paginado |
| GET | `/:id/last-position` | Última posición |
| GET | `/:id/track` | Resumen + puntos para mapa |
| GET | `/tracking/active-map` | Snapshot movimientos activos para El Centinela |
| GET | `/tracking/stream` | SSE tiempo real (sin compresión en proxy) |
| GET | `/skipper/tracking-status` | `{ shouldEmit, movementId, tracking }` para el emisor |

**Body típico de posición:**

```json
{
  "latitude": -34.901,
  "longitude": -56.188,
  "accuracy": 12,
  "positionTimestamp": "2026-09-02T02:30:00.000Z",
  "source": "browser",
  "speed": null,
  "heading": null,
  "altitude": null,
  "batteryLevel": 87
}
```

`source` aceptado: `browser`, `android`, `ios`, `other`.

### Monitor servidor

- `startTrackingMonitor()` en `app.js`: intervalo **60 s**.
- `evaluateActiveMovementTracking()` revisa movimientos `inTransit` con `tracking.active`.
- **Sin señal:** si pasan más de 5 min desde `lastPosition.receivedAt`, dispara alerta por cada **bucket** adicional de 5 min (5, 10, 15…). Al llegar una posición nueva, el episodio se reinicia.
- **ETA vencida:** `processEtaOverdueForMovement` (una vez por movimiento vía `delayedNotifiedAt`).

### Alertas y notificaciones

Todas las alertas de tracking usan `notifyUnitsForMovement` → prefecturas **origen + destino + tránsito** (inbox).

| Tipo inbox | Disparador |
|------------|------------|
| `sport_movement_tracking_started` | Al confirmar despacho |
| `sport_movement_eta_overdue` | ETA vencida |
| `sport_movement_no_signal_5` | Sin posición GPS (cada bucket de 5 min) |

**Email sin señal:** `sportMovementTrackingEmails.service.js` → contactos de unidad (`collectUnitContactEmails`) en origen, destino y tránsito. Coordenadas en **formato DMS** en el cuerpo del correo.

### SSE (`/tracking/stream`)

- Filtra por unidad del usuario (origen / destino / tránsito) o náuta con `skipperCanManageVessel` sobre el buque.
- Eventos: `position`, `tracking_state`, `alert`.
- Vite: excluir esta ruta de compresión/timeout (igual que AIS).

### Permisos

| Acción | Quién |
|--------|--------|
| Emitir posición | Rol `skipper` + `skipperCanManageVessel` (no solo el patrón del movimiento) |
| Informar arribo | Solo el **patrón** del movimiento (snapshot) |
| Ver tracking / mapa / historial | Unidad origen/destino/tránsito o náuta del buque |
| Cerrar seguimiento | Arribo, cierre PNN, cancelación |

---

## 5. Frontend

### Emisor GPS (náuta)

| Pieza | Path |
|-------|------|
| Hook emisor | `hooks/useSportMovementPositionEmitter.js` |
| Cola offline | `utils/sportMovementPositionQueue.js` (IndexedDB) |
| Activación | `pages/HomePage.jsx` cuando `skipperTrackingStatus().shouldEmit` |

Comportamiento:

- `navigator.geolocation.watchPosition` con `enableHighAccuracy`.
- Máximo **1 envío cada 60 s** por movimiento.
- Si falla la red → encola en IndexedDB; al recuperar conexión o al volver visible la pestaña, hace flush.
- Si el servidor responde **409** (movimiento cerrado) → detiene emisor y descarta cola.
- `source: "browser"` en el payload.

### El Centinela

| Pieza | Path |
|-------|------|
| Capa mapa | `components/centinela/SicenPositioningLayer.jsx` |
| Stream SSE | `hooks/useSportMovementTrackingStream.js` |
| Tiles tema | `constants/centinelaMapTiles.js` |
| Página | `pages/CentinelaPage.jsx` (capa **Posicionamiento SICEN** activa por defecto, primera en el menú) |

Popup del marker: buque, patrón (modal contacto), ruta, ETA, estado comunicación, última posición en **DMS**, botón **Ver historial**.

Modales (portal a `document.body`, z-index sobre panel flotante):

- `SportMovementSkipperContactModal.jsx`
- `SportMovementPositionHistoryModal.jsx` (mapa + tabla de posiciones)

### PNN (Mi unidad)

| Pantalla | Tracking |
|----------|----------|
| `SportMovementsArrivalsPage.jsx` | Badges sin señal / ETA vencida; botón geo → panel |
| `SportMovementsDelayedPage.jsx` | Idem + contacto patrón |
| `SportMovementTrackingPanel.jsx` | Modal detalle con mapa e historial |

### Cliente API (`api/client.js`)

Funciones: `postSportMovementPosition`, `sportMovementTrack`, `sportMovementTrackingActiveMap`, `openSportMovementTrackingStream`, `skipperTrackingStatus`, etc.

### Formato de coordenadas

Toda lat/long **mostrada al usuario** (UI, popups, tablas, emails) usa **DMS** vía `utils/geoDms.js` (`formatCoordDms`). Los valores en BD y API siguen en grados decimales.

---

## 6. Limitaciones del emisor web actual

El emisor implementado hoy es **exclusivamente navegador** (SPA React):

| Situación | ¿Emite posición? |
|-----------|------------------|
| Pestaña activa en primer plano | Sí (comportamiento esperado) |
| Pestaña en segundo plano (móvil) | Limitado; iOS/Android frenan geolocalización y timers |
| Pantalla apagada / app minimizada mucho tiempo | Casi nunca de forma fiable |
| Pestaña o navegador cerrados | **No** |
| PWA instalada en el celular | Mismas limitaciones que la web; no hay GPS en background real |

La cola IndexedDB solo ayuda cuando **falla la red** con la app aún cargada; **no** reemplaza un cliente que siga vivo con la app cerrada.

**Recomendación operativa actual:** el náuta debe mantener SICEN abierto (idealmente en primer plano) durante el tránsito para un seguimiento confiable.

---

## 7. Emisión continua sin tener la web abierta

Esta sección documenta **opciones habituales** para superar las limitaciones del navegador. **Ninguna está implementada aún** en el repositorio; el backend ya está preparado para recibir clientes nativos (`source: android` / `ios`).

### 7.1 Por qué hace falta otro cliente

Los navegadores **no** ofrecen una API estándar de geolocalización continua en background con la aplicación cerrada. Service Workers pueden sincronizar datos cuando el SO despierta la app, pero **no leen GPS** de forma periódica. Por eso, para emitir posiciones con el teléfono en el bolsillo o la pantalla apagada, se necesita un **cliente nativo o híbrido** con permisos de ubicación en segundo plano.

### 7.2 Opción recomendada: apps nativas Android e iOS

**Idea:** una app móvil (o dos binarios) que autentique al náuta (mismo JWT / API SICEN) y llame periódicamente a:

```
POST /api/sportMovements/:id/positions
```

con `source: "android"` o `source: "ios"`.

#### Android

| Aspecto | Enfoque habitual |
|---------|------------------|
| Permisos | `ACCESS_FINE_LOCATION` + `ACCESS_BACKGROUND_LOCATION` (Android 10+) |
| Ejecución en background | **Foreground Service** con notificación persistente («SICEN — seguimiento activo») |
| Frecuencia | ~60 s (alineado al emisor web) o según distancia (`setMinUpdateDistanceMeters`) |
| Batería | Ajustar precisión (`PRIORITY_BALANCED_POWER_ACCURACY` vs `HIGH_ACCURACY`) |
| Offline | Cola local (Room/SQLite) + reintento al recuperar red; descartar en 409 |

Tecnologías posibles: **Kotlin nativo**, **React Native** + `@react-native-community/geolocation` + módulo background, o **Capacitor** (ver §7.3).

#### iOS

| Aspecto | Enfoque habitual |
|---------|------------------|
| Permisos | `NSLocationWhenInUseUsageDescription` + `NSLocationAlwaysAndWhenInUseUsageDescription` |
| Background | `CLLocationManager` con `allowsBackgroundLocationUpdates = true` y modo apropiado (`UIBackgroundModes`: `location`) |
| Revisión App Store | Apple exige justificar uso de ubicación en background (seguridad náutica / tránsito oficial) |
| Frecuencia | `distanceFilter` / `desiredAccuracy`; evitar sobrecargar batería |
| Offline | Misma estrategia de cola que Android |

#### Contrato con el backend existente

No requiere cambios de modelo si se respeta el payload actual. Reutilizar:

- `GET /api/sportMovements/skipper/tracking-status` → saber si debe emitir y qué `movementId` usar.
- `POST /api/sportMovements/:id/positions` → enviar posición.
- Detener emisión local cuando `shouldEmit === false` o al recibir 409.

Opcional futuro: endpoint de registro de **push token** para avisar al náuta que el seguimiento se cortó (no existe hoy).

#### Arquitectura sugerida (app dedicada mínima)

```
┌─────────────────┐     JWT      ┌──────────────────┐
│  App náuta      │ ───────────► │  SICEN API       │
│  (Android/iOS)  │   POST       │  /sportMovements │
│                 │   positions  │  /skipper/...    │
│  GPS background │ ◄─────────── │  tracking-status │
│  Cola offline   │              └──────────────────┘
└─────────────────┘
```

Pantallas mínimas v1:

1. Login (o deep link con token de sesión).
2. Estado: «Emitiendo posición del buque X» / «Sin movimiento activo».
3. Botón «Informar arribo» (opcional; hoy está en la web).

La web SICEN puede seguir siendo el canal principal de gestión; la app sería **cliente de emisión GPS**.

### 7.3 Opción intermedia: Capacitor (híbrido)

Envolver el build de `SICEN-front` con **Capacitor** y plugins:

- `@capacitor-community/background-geolocation` o equivalente mantenido.
- Mismo código React para login y home; reemplazar `useSportMovementPositionEmitter` por rama nativa cuando `Capacitor.isNativePlatform()`.

| Ventaja | Desventaja |
|---------|------------|
| Reutiliza UI y API client existentes | Background GPS sigue siendo delicado en iOS |
| Un solo equipo web+mobile | Tamaño de app y permisos store |
| Despliegue más rápido que dos nativos puros | Menos control fino que Kotlin/Swift |

Útil como **MVP móvil** antes de apps nativas dedicadas.

### 7.4 PWA y mejoras web (solo mitigación)

| Mejora | Efecto |
|--------|--------|
| Instalar PWA («Agregar a inicio») | Comodidad; **no** garantiza background GPS |
| Wake Lock API | Evita apagado de pantalla; náuta debe dejar app visible |
| Aviso en UI | «Mantenga SICEN abierto durante el tránsito» |
| Periodic Background Sync | **No** sirve para GPS; solo sync de cola cuando el SO lo permita |

No sustituyen apps nativas para emisión continua con app cerrada.

### 7.5 Otras alternativas (fuera del teléfono del náuta)

| Alternativa | Comentario |
|-------------|------------|
| Tracker GPS dedicado / AIS a bordo | Integración distinta (otro pipeline de datos); no usa el emisor náuta actual |
| SMS / posición manual | No automatizado; solo contingencia |
| Terceros (MarineTraffic, etc.) | No integrados; requeriría acuerdos y APIs |

### 7.6 Criterios para elegir camino

| Criterio | App nativa | Capacitor | Solo web |
|----------|------------|-----------|----------|
| App cerrada / pantalla apagada | Sí (con permisos) | Parcial | No |
| Tiempo de desarrollo | Mayor | Medio | Ya hecho |
| Mantenimiento | Dos stores + releases | Un wrapper + web | Un SPA |
| Fiabilidad operativa en tránsito | Alta | Media-alta | Baja sin app abierta |

**Recomendación de producto:** planificar **app náuta Android + iOS** (nativa o Capacitor v1) que consuma la API ya existente; mantener la web para prefecturas y gestión completa.

---

## 8. Tests y operación

- Tests unitarios backend: `sportMovementTracking.service.test.js` (permisos SSE / visibilidad).
- Proxy Vite: excluir `/api/sportMovements/tracking/stream` de compresión.
- Monitor: se inicia con el servidor (`startTrackingMonitor` en `app.js`).

---

## 9. Checklist para implementar cliente móvil (futuro)

- [ ] Autenticación JWT (login o refresh token seguro en almacenamiento nativo).
- [ ] Poll o push de `GET /skipper/tracking-status` al abrir app y tras eventos de red.
- [ ] Foreground service (Android) / background location (iOS).
- [ ] Envío `POST /:id/positions` con `source` correcto.
- [ ] Cola offline + flush; manejo 409.
- [ ] UX: permisos de ubicación explicados en español rioplatense.
- [ ] Política de privacidad y textos para tiendas (uso de ubicación en background).
- [ ] Pruebas en mar / tránsito real (batería, pérdida de señal, recuperación).

---

*Última actualización: documentación alineada al estado del repositorio SICEN (seguimiento GPS movimientos deportivos).*
