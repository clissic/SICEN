import { logger } from "../utils/logger.js";
import env from "../config/env.config.js";

export function globalErrorHandler(err, req, res, next) {
  const isProduction =
    process.env.NODE_ENV === "production" || env.mode === "PRODUCTION";

  logger.error(
    `Error no capturado — ${req.method} ${req.originalUrl} — IP: ${req.ip} — Error: ${err.message || err}`
  );

  if (err.stack) {
    logger.debug(err.stack);
  }

  if (isProduction) {
    return res.status(500).json({
      ok: false,
      msg: "Ocurrió un error interno. Intentá nuevamente más tarde.",
    });
  }

  return res.status(500).json({
    ok: false,
    msg: err.message || "Error interno del servidor.",
    stack: err.stack,
  });
}
