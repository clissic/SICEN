import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { logger } from "../utils/logger.js";

const MESSAGE_TOO_MANY_REQUESTS =
  "Demasiados intentos desde esta IP. Intentá nuevamente más tarde.";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, msg: MESSAGE_TOO_MANY_REQUESTS },
  handler(req, res) {
    logger.warning(
      `Rate limit excedido en login — IP: ${req.ip}, email intento: ${req.body?.email || "sin email"}`
    );
    return res.status(429).json({ ok: false, msg: MESSAGE_TOO_MANY_REQUESTS });
  },
  keyGenerator(req) {
    const ip = ipKeyGenerator(req);
    const email = req.body?.email
      ? String(req.body.email).trim().toLowerCase()
      : "";
    return `${ip}:${email}`;
  },
  skip(req) {
    return !req.body?.email || !req.body?.password;
  },
});

export const passwordRecoveryRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, msg: MESSAGE_TOO_MANY_REQUESTS },
  handler(req, res) {
    logger.warning(
      `Rate limit excedido en recuperación de contraseña — IP: ${req.ip}, email intento: ${req.body?.email || "sin email"}`
    );
    return res.status(429).json({ ok: false, msg: MESSAGE_TOO_MANY_REQUESTS });
  },
  keyGenerator(req) {
    const ip = ipKeyGenerator(req);
    const email = req.body?.email
      ? String(req.body.email).trim().toLowerCase()
      : "";
    return `${ip}:${email}`;
  },
  skip(req) {
    return !req.body?.email;
  },
});
