import {
  getAisStatus,
  listVessels,
  subscribeSse,
} from "../services/aisBridge.service.js";
import { logger } from "../utils/logger.js";

function handleError(res, e, fallbackMsg) {
  const code = e.status || e.statusCode || 500;
  if (code === 400 || code === 403 || code === 404 || code === 409) {
    return res.status(code).json({ ok: false, msg: e.message });
  }
  logger.error(fallbackMsg + ": " + (e?.message || e));
  return res.status(500).json({ ok: false, msg: fallbackMsg });
}

export const aisController = {
  status(req, res) {
    try {
      return res.json({ ok: true, ...getAisStatus() });
    } catch (e) {
      return handleError(res, e, "No se pudo obtener el estado AIS.");
    }
  },

  vessels(req, res) {
    try {
      const vessels = listVessels();
      return res.json({
        ok: true,
        vessels,
        ...getAisStatus(),
      });
    } catch (e) {
      return handleError(res, e, "No se pudieron listar los buques AIS.");
    }
  },

  stream(req, res) {
    try {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      if (typeof res.flushHeaders === "function") res.flushHeaders();

      res.write(`: connected\n\n`);

      const unsubscribe = subscribeSse(res);

      const heartbeat = setInterval(() => {
        try {
          res.write(`: ping\n\n`);
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);

      req.on("close", () => {
        clearInterval(heartbeat);
        unsubscribe();
      });
    } catch (e) {
      return handleError(res, e, "No se pudo abrir el stream AIS.");
    }
  },
};
