import {
  getFiuIuuStatus,
  searchFiuIuuEvents,
} from "../services/fiuIuuProxy.service.js";
import { logger } from "../utils/logger.js";

function handleError(res, e, fallbackMsg) {
  const code = e.status || e.statusCode || 500;
  if (
    code === 400 ||
    code === 403 ||
    code === 404 ||
    code === 409 ||
    code === 502 ||
    code === 503
  ) {
    return res.status(code).json({ ok: false, msg: e.message });
  }
  logger.error(fallbackMsg + ": " + (e?.message || e));
  return res.status(500).json({ ok: false, msg: e.message || fallbackMsg });
}

export const fiuIuuController = {
  status(req, res) {
    try {
      return res.json({ ok: true, ...getFiuIuuStatus() });
    } catch (e) {
      return handleError(res, e, "No se pudo obtener el estado de FIU IUU.");
    }
  },

  async events(req, res) {
    try {
      const { layerTypes, bbox, limit } = req.body ?? {};
      const result = await searchFiuIuuEvents({ layerTypes, bbox, limit });
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(
        res,
        e,
        "No se pudieron obtener eventos IUU LAC (FIU)."
      );
    }
  },
};
