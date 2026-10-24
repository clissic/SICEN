import { logger } from "../utils/logger.js";
import { searchGfwEvents, getGfwStatus } from "../services/gfwEvents.service.js";

function handleError(res, e, fallbackMsg) {
  const code = e.status || e.statusCode || 500;
  if (code === 400 || code === 404 || code === 503) {
    return res.status(code).json({ ok: false, msg: e.message });
  }
  logger.error(fallbackMsg + ": " + (e?.message || e));
  return res.status(500).json({ ok: false, msg: fallbackMsg });
}

export const gfwEventsController = {
  async searchEvents(req, res) {
    try {
      const { eventTypes, bbox, limit } = req.body || {};
      const result = await searchGfwEvents({ eventTypes, bbox, limit });
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(res, e, "No se pudieron obtener eventos GFW.");
    }
  },

  async getStatus(req, res) {
    try {
      const status = await getGfwStatus();
      return res.json({ ok: true, ...status });
    } catch (e) {
      return handleError(res, e, "No se pudo obtener el estado de GFW.");
    }
  },
};
