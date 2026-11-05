import jwt from "jsonwebtoken";
import env from "../config/env.config.js";

export const MFA_TOKEN_PURPOSE = "mfa";

export function signMfaChallengeToken(userId) {
  return jwt.sign(
    { sub: String(userId), purpose: MFA_TOKEN_PURPOSE },
    env.jwtSecret,
    { expiresIn: env.mfaChallengeExpiresIn }
  );
}

export function verifyMfaChallengeToken(token) {
  const payload = jwt.verify(String(token || ""), env.jwtSecret);
  if (payload?.purpose !== MFA_TOKEN_PURPOSE || !payload?.sub) {
    const err = new Error("Token MFA inválido.");
    err.status = 401;
    throw err;
  }
  return payload;
}

export function isMfaChallengePayload(payload) {
  return payload?.purpose === MFA_TOKEN_PURPOSE;
}
