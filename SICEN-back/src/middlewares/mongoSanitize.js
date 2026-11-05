import { logger } from "../utils/logger.js";

const DANGEROUS_KEY_CHARS = /[$.]/g;

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Reemplaza `$` y `.` en claves (operadores / path traversal NoSQL) por `_`.
 * Mutación in-place: no reemplaza el objeto raíz (Express 5: `req.query` es getter).
 */
export function sanitizeObjectInPlace(value, onSanitize) {
  if (Array.isArray(value)) {
    for (const item of value) {
      sanitizeObjectInPlace(item, onSanitize);
    }
    return value;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  for (const key of Object.keys(value)) {
    const sanitizedKey = key.replace(DANGEROUS_KEY_CHARS, "_");
    if (sanitizedKey !== key) {
      onSanitize?.(key);
      const nested = value[key];
      delete value[key];
      if (!Object.prototype.hasOwnProperty.call(value, sanitizedKey)) {
        value[sanitizedKey] = nested;
      }
      sanitizeObjectInPlace(value[sanitizedKey], onSanitize);
    } else {
      sanitizeObjectInPlace(value[key], onSanitize);
    }
  }

  return value;
}

function reportSanitizedKey(req, key) {
  logger.warning(
    `NoSQL injection detectada y sanitizada — IP: ${req.ip}, key: ${key}`
  );
}

/**
 * Sanitiza body, params y query sin asignar `req.query`
 * (`req.query = …` lanza en Express 5).
 *
 * Express 5 re-parsea el query en cada acceso al getter: se fija el objeto
 * ya sanitizado en la instancia con `defineProperty` (no es una asignación).
 */
export function mongoSanitizeMiddleware(req, _res, next) {
  const onSanitize = (key) => reportSanitizedKey(req, key);

  if (req.body && typeof req.body === "object") {
    sanitizeObjectInPlace(req.body, onSanitize);
  }

  if (req.params && typeof req.params === "object") {
    sanitizeObjectInPlace(req.params, onSanitize);
  }

  const query = req.query;
  if (query && typeof query === "object") {
    sanitizeObjectInPlace(query, onSanitize);
    Object.defineProperty(req, "query", {
      value: query,
      writable: false,
      configurable: true,
      enumerable: true,
    });
  }

  next();
}
