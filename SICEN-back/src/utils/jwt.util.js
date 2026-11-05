import jwt from "jsonwebtoken";
import env from "../config/env.config.js";

/**
 * Genera un JWT con el userId y la versión actual del token del usuario.
 * @param {string} userId - ID del usuario
 * @param {number} tokenVersion - Versión del token (default 0)
 */
export function signAccessToken(userId, tokenVersion = 0) {
  return jwt.sign(
    { 
      sub: String(userId),
      tv: Number(tokenVersion) || 0
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
