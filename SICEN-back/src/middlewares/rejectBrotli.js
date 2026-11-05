import { logger } from "../utils/logger.js";

const ALLOWED_ENCODINGS = new Set(["gzip", "deflate", "identity", ""]);

export function rejectBrotliMiddleware(req, res, next) {
  const contentEncoding = req.get("Content-Encoding");

  if (contentEncoding) {
    const normalized = contentEncoding.trim().toLowerCase();
    if (normalized === "br") {
      logger.warning(
        `Rechazado Content-Encoding: br (Brotli) desde IP ${req.ip} — mitigación CVE-2026-111497`
      );
      return res.status(415).json({
        ok: false,
        msg: "Content-Encoding no soportado.",
      });
    }

    if (!ALLOWED_ENCODINGS.has(normalized)) {
      logger.warning(
        `Rechazado Content-Encoding desconocido: ${contentEncoding} desde IP ${req.ip}`
      );
      return res.status(415).json({
        ok: false,
        msg: "Content-Encoding no soportado.",
      });
    }
  }

  return next();
}
