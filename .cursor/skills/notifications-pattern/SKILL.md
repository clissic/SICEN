---
name: notifications-pattern
description: >-
  Inbox de notificaciones en SICEN (colección notifications, fan-out por
  audience unit/user, campanita en Layout con badge de no leídas, dedupeKey).
  Usar al agregar un tipo nuevo de aviso, materializar eventos hacia usuarios,
  o tocar NotificationsBell /api/notifications.
---

# Notificaciones (inbox)

## Modelo

Colección **`notifications`** (un documento por destinatario). **No** embeber
en `users`.

| Campo | Uso |
|---|---|
| `userId` | Destinatario concreto |
| `audienceType` | `unit` \| `user` (cómo se eligió al crear) |
| `audienceValue` | Sigla de unidad o ObjectId de usuario |
| `type` | Ej. `sportMovement.delayed` |
| `title` / `body` / `href` | Contenido y navegación |
| `meta` | Payload libre (movementId, role, …) |
| `dedupeKey` | Idempotencia; índice único con `userId` |
| `readAt` | `null` = no leída |

## Capas

- Modelo: `SICEN-back/src/DAO/models/mongoose/notifications.mongoose.js`
- Servicio: `notifyAudience`, `listNotificationsForUser`, `unreadCountForUser`,
  `markNotificationRead`, `markAllNotificationsRead`
- Router: `/api/notifications` (`GET /`, `GET /unread-count`, `PATCH /:id/read`,
  `POST /read-all`) — `guarded`
- Front: `NotificationsBell.jsx` junto a `ThemeToggle` en `Layout.jsx`
- Cliente: `listNotifications`, `notificationsUnreadCount`,
  `markNotificationRead`, `markAllNotificationsRead`

## Reglas

1. Crear avisos solo con `notifyAudience({ audienceType, audienceValue, type,
   title, body, href, meta, dedupeKey })`. Fan-out a todos los usuarios de la
   unidad si `audienceType === "unit"`.
2. Anti-spam: `dedupeKey` estable + inserts `ordered: false` (ignora 11000).
3. Materialización lazy (sin cron): p. ej. demorados en
   `materializeDelayedNotifications` + flag `delayedNotifiedAt` en el
   movimiento. Se dispara desde unread-count / list / listDelayed.
4. Campanita: poller unread cada **5 min** + al montar / visibility; al abrir
   el dropdown carga el listado. Badge solo si `count > 0`.
5. No reintroducir Swal de demorados: el inbox reemplaza ese poller.
6. En escritorio `NotificationsBell` usa dropdown Bootstrap. Dentro del menú
   mobile de `NavbarToolbar`, pasar `embedded`: muestra un panel expandible
   controlado por React. No anidar dropdowns Bootstrap porque abrir el hijo
   cierra el menú padre. El toggle del menú padre debe llevar
   `data-bs-auto-close="outside"` (en el botón, no en el contenedor) y el panel
   embedded debe cortar la propagación de clicks. En ese menú ancho, los
   botones embedded muestran texto: «Notificaciones» y «Cerrar sesión».

## Template

```js
await notifyAudience({
  audienceType: "unit", // o "user"
  audienceValue: "PREMO", // o userId
  type: "sportMovement.delayed",
  title: "Buque demorado",
  body: "…",
  href: "/mi-unidad/areas/movimientos-deportivos/demorados",
  meta: { movementId, role: "destination" },
  dedupeKey: `sportMovement.delayed:${movementId}:PREMO`,
});
```

## Ejemplos vivos

- Demorados: `materializeDelayedNotifications` en `sportMovements.service.js`
- UI: `SICEN-front/src/components/NotificationsBell.jsx`
