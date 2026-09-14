import {
  getGfwStatus,
  getGfwVesselInsights,
  searchGfwEvents,
} from "../services/gfwProxy.service.js";
import { logger } from "../utils/logger.js";

function handleError(res, e, fallbackMsg) {
  const code = e.status || e.statusCode || 500;
  if (
    code === 400 ||
    code === 403 ||
    code === 404 ||
    code === 409 ||
    code === 429 ||
    code === 502 ||
    code === 503
  ) {
    return res.status(code).json({ ok: false, msg: e.message });
  }
  logger.error(fallbackMsg + ": " + (e?.message || e));
  return res.status(500).json({ ok: false, msg: e.message || fallbackMsg });
}

export const gfwController = {
  status(req, res) {
    try {
      return res.json({ ok: true, ...getGfwStatus() });
    } catch (e) {
      return handleError(res, e, "No se pudo obtener el estado de GFW.");
    }
  },

  async events(req, res) {
    try {
      const { eventTypes, bbox, lookbackDays, limit } = req.body ?? {};
      const result = await searchGfwEvents({
        eventTypes,
        bbox,
        lookbackDays,
        limit,
      });
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(res, e, "No se pudieron obtener eventos GFW.");
    }
  },

  async insights(req, res) {
    try {
      const mmsi = req.body?.mmsi ?? req.params?.mmsi;
      const result = await getGfwVesselInsights(mmsi);
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(res, e, "No se pudieron obtener insights GFW.");
    }
  },
};
