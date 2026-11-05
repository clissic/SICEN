import {
  MFA_VERIFY_RATE_MAX,
  MFA_VERIFY_RATE_WINDOW_MS,
} from "../constants/mfa.js";
import { logger } from "../utils/logger.js";

export function clientIp(req) {
  const xf = req.headers?.["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) {
    return xf.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

/**
 * Limitador en memoria (sin dependencias). Independiente de express-rate-limit
 * del PR #10 para no chocar si ese PR no está mergeado.
 */
export function createMemoryRateLimiter({
  windowMs,
  max,
  keyFn,
  message,
  code,
} = {}) {
  const hits = new Map();

  function prune(now) {
    for (const [key, entry] of hits) {
      if (now - entry.start >= windowMs) hits.delete(key);
    }
  }

  function middleware(req, res, next) {
    const now = Date.now();
    if (hits.size > 8_000) prune(now);
    const key = keyFn(req);
    let entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      entry = { start: now, count: 0 };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      try {
        logger?.warning?.(
          `MFA rate limit excedido · ip=${clientIp(req)} · key=${key}`
        );
      } catch {
        /* logger opcional en tests */
      }
      return res.status(429).json({
        ok: false,
        msg: message,
        ...(code ? { code } : {}),
      });
    }
    return next();
  }

  middleware.reset = () => hits.clear();
  middleware._hits = hits;
  return middleware;
}

export const mfaVerifyRateLimit = createMemoryRateLimiter({
  windowMs: MFA_VERIFY_RATE_WINDOW_MS,
  max: MFA_VERIFY_RATE_MAX,
  keyFn: (req) => `mfa-verify:${clientIp(req)}`,
  message: "Demasiados intentos de verificación. Probá de nuevo en unos minutos.",
  code: "MFA_RATE_LIMIT",
});
