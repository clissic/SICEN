import { logger } from "../utils/logger.js";
import {
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  unreadCountForUser,
} from "../services/notifications.service.js";
import { materializeDelayedNotifications } from "../services/sportMovements.service.js";

function handleError(res, e, fallbackMsg) {
  const code = e.status || e.statusCode || 500;
  if (code === 400 || code === 403 || code === 404 || code === 409) {
    return res.status(code).json({ ok: false, msg: e.message });
  }
  logger.error(fallbackMsg + ": " + (e?.message || e));
  return res.status(500).json({ ok: false, msg: fallbackMsg });
}

export const notificationsController = {
  async list(req, res) {
    try {
      /* Lazy: al abrir la campanita también materializa demorados. */
      await materializeDelayedNotifications();
      const result = await listNotificationsForUser(req.user, req.query || {});
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(res, e, "No se pudieron listar las notificaciones.");
    }
  },

  async unreadCount(req, res) {
    try {
      await materializeDelayedNotifications();
      const result = await unreadCountForUser(req.user);
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(res, e, "No se pudo obtener el conteo de no leídas.");
    }
  },

  async markRead(req, res) {
    try {
      const notification = await markNotificationRead(req.params.id, req.user);
      return res.json({
        ok: true,
        msg: "Notificación marcada como leída.",
        notification,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo marcar la notificación como leída.");
    }
  },

  async markAllRead(req, res) {
    try {
      const result = await markAllNotificationsRead(req.user);
      return res.json({
        ok: true,
        msg: "Todas las notificaciones se marcaron como leídas.",
        ...result,
      });
    } catch (e) {
      return handleError(
        res,
        e,
        "No se pudieron marcar las notificaciones como leídas."
      );
    }
  },
};
