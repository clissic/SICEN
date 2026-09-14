import {
  enqueueSarSimulation,
  getSarJob,
  getSarStatus,
} from "../services/sarSim.service.js";
import { logger } from "../utils/logger.js";

function handleError(res, e, fallbackMsg) {
  const code = e.status || e.statusCode || 500;
  if (
    code === 400 ||
    code === 403 ||
    code === 404 ||
    code === 409 ||
    code === 502 ||
    code === 503 ||
    code === 504
  ) {
    return res.status(code).json({ ok: false, msg: e.message });
  }
  logger.error(fallbackMsg + ": " + (e?.message || e));
  return res.status(500).json({ ok: false, msg: fallbackMsg });
}

export const sarController = {
  async status(_req, res) {
    try {
      const data = await getSarStatus();
      return res.json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo obtener el estado del simulador SAR.");
    }
  },

  async simulate(req, res) {
    try {
      const out = enqueueSarSimulation(req.body ?? {}, {
        userId: req.user?._id ? String(req.user._id) : null,
      });
      return res.status(202).json({ ok: true, ...out });
    } catch (e) {
      return handleError(res, e, "No se pudo iniciar la simulación SAR.");
    }
  },

  async job(req, res) {
    try {
      const data = getSarJob(req.params.id);
      return res.json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo obtener el job SAR.");
    }
  },
};
