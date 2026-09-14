import {
  getMaritimeBoundaries,
  listMaritimeBoundaryCatalog,
} from "../services/maritimeBoundariesProxy.service.js";
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

export const maritimeBoundariesController = {
  async catalog(_req, res) {
    try {
      return res.json({
        ok: true,
        catalog: listMaritimeBoundaryCatalog(),
        source: "MarineRegions / Flanders Marine Institute (VLIZ)",
      });
    } catch (e) {
      return handleError(res, e, "No se pudo listar los límites marítimos.");
    }
  },

  async layers(req, res) {
    try {
      const raw = req.query?.layers ?? req.body?.layers;
      let layers;
      if (typeof raw === "string") {
        layers = raw.split(",").map((s) => s.trim()).filter(Boolean);
      } else if (Array.isArray(raw)) {
        layers = raw;
      }
      const result = await getMaritimeBoundaries({ layers });
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(res, e, "No se pudieron obtener los límites marítimos.");
    }
  },
};
