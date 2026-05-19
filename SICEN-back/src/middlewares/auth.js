import { userService } from "../services/users.service.js";
import { logger } from "../utils/logger.js";
import { verifyAccessToken } from "../utils/jwt.util.js";

export function toPublicUser(doc) {
  if (!doc) return null;
  const u = doc.toObject ? doc.toObject() : { ...doc };
  delete u.password;
  return u;
}

function bearerToken(req) {
  const h = req.headers.authorization;
  if (!h || typeof h !== "string" || !h.startsWith("Bearer ")) {
    return null;
  }
  return h.slice(7).trim();
}

/** Para rutas públicas que pueden llevar JWT: sin header → `req.user = null`; token inválido → 401. */
export async function optionalJwt(req, res, next) {
  try {
    const token = bearerToken(req);
    if (!token) {
      req.user = null;
      return next();
    }
    const { sub } = verifyAccessToken(token);
    const userDoc = await userService.findById(sub);
    if (!userDoc) {
      return res.status(401).json({
        ok: false,
        msg: "Usuario del token no encontrado.",
      });
    }
    req.user = toPublicUser(userDoc);
    return next();
  } catch (e) {
    logger.info("optionalJwt: " + e.message);
    return res.status(401).json({
      ok: false,
      msg: "Token inválido o expirado.",
    });
  }
}

/** Rutas que exigen usuario autenticado (JWT). */
export async function checkLogin(req, res, next) {
  try {
    const token = bearerToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, msg: "Debe iniciar sesión." });
    }
    const { sub } = verifyAccessToken(token);
    const userDoc = await userService.findById(sub);
    if (!userDoc) {
      return res.status(401).json({ ok: false, msg: "Sesión inválida." });
    }
    req.user = toPublicUser(userDoc);
    return next();
  } catch (e) {
    logger.info("checkLogin: " + e.message);
    return res.status(401).json({
      ok: false,
      msg: "Token inválido o expirado.",
    });
  }
}

export function checkAdmin(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, msg: "Debe iniciar sesión." });
  }
  if (user.role !== "admin" && user.role !== "superAdmin") {
    return res.status(403).json({
      ok: false,
      msg: `Se requiere rol de administrador. Su rol actual es ${user.role}.`,
    });
  }
  return next();
}

/** Tras `checkLogin`: solo el propio usuario o admin/superAdmin pueden acceder a `req.params.id`. */
export function checkSelfOrAdmin(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, msg: "Debe iniciar sesión." });
  }
  const targetId = req.params.id;
  if (targetId == null || targetId === "") {
    return res.status(400).json({ ok: false, msg: "ID requerido." });
  }
  const isAdmin = user.role === "admin" || user.role === "superAdmin";
  const sameUser = String(user._id) === String(targetId);
  if (isAdmin || sameUser) {
    return next();
  }
  logger.info("checkSelfOrAdmin: acceso denegado a usuario ajeno");
  return res.status(403).json({
    ok: false,
    msg: "No está autorizado a consultar los datos de este usuario.",
  });
}

const FINE_MODIFY_ROLES = new Set(["admin", "superAdmin", "contable"]);

/**
 * Debe ejecutarse después de `checkLogin` (y de middlewares de rol si aplican).
 * Bloquea el acceso si `userTutorial` no es true.
 */
export function checkUserTutorial(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, msg: "Debe iniciar sesión." });
  }
  if (user.userTutorial === true) {
    return next();
  }
  return res.status(403).json({
    ok: false,
    code: "USER_TUTORIAL_REQUIRED",
    msg:
      'Para utilizar el sistema debe completar el curso "Manual usuario", disponible en las opciones del menú ubicado debajo de sus datos personales.',
  });
}

export function checkAdminOrContable(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, msg: "Debe iniciar sesión." });
  }
  if (FINE_MODIFY_ROLES.has(user.role)) {
    return next();
  }
  return res.status(403).json({
    ok: false,
    msg: "No tiene permisos para operar sobre multas vehiculares.",
  });
}
