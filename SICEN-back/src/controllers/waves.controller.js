import { getWavePoints } from "../services/wavesProxy.service.js";
import { logger } from "../utils/logger.js";

function handleError(res, e, fallbackMsg) {
  const code = e.status || e.statusCode || 500;
  if (
    code === 400 ||
    code === 403 ||
    code === 404 ||
    code === 409 ||
    code === 502
  ) {
    return res.status(code).json({ ok: false, msg: e.message });
  }
  logger.error(fallbackMsg + ": " + (e?.message || e));
  return res.status(500).json({ ok: false, msg: fallbackMsg });
}

export const wavesController = {
  async points(req, res) {
    try {
      const { points, forecastHoursOffset } = req.body ?? {};
      const result = await getWavePoints({ points, forecastHoursOffset });
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(res, e, "No se pudo obtener el oleaje.");
    }
  },
};
