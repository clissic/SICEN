/**
 * Token firmado para deep links de vinculación náuta ↔ seafarer.
 * Payload: requestId, seafarerId, type; HMAC-SHA256; vigencia 30 días.
 */

import crypto from "crypto";
import env from "../config/env.config.js";

const LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function str(v) {
  return v == null ? "" : String(v).trim();
}

function signBody(bodyB64) {
  return crypto
    .createHmac("sha256", env.jwtSecret)
    .update(bodyB64)
    .digest("base64url");
}

export function buildSeafarerLinkEmailPayload({
  requestId,
  seafarerId,
  type,
}) {
  return {
    v: 1,
    requestId: str(requestId),
    seafarerId: str(seafarerId),
    type: str(type) || "link",
    exp: Date.now() + LINK_TTL_MS,
  };
}

export function encodeSeafarerLinkEmailToken(payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = signBody(body);
  return `${body}.${sig}`;
}

/**
 * @returns {object|null}
 */
export function verifySeafarerLinkEmailToken(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = signBody(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!data || typeof data !== "object") return null;
    if (!data.requestId || !data.seafarerId) return null;
    if (typeof data.exp === "number" && Date.now() > data.exp) return null;
    return {
      requestId: str(data.requestId),
      seafarerId: str(data.seafarerId),
      type: str(data.type) || "link",
      exp: data.exp,
    };
  } catch {
    return null;
  }
}

export function buildSeafarerLinkConsultHref({
  requestId,
  seafarerId,
  type,
}) {
  const payload = buildSeafarerLinkEmailPayload({
    requestId,
    seafarerId,
    type,
  });
  const token = encodeSeafarerLinkEmailToken(payload);
  const base = String(env.publicAppUrl || "").replace(/\/+$/, "");
  const q = new URLSearchParams({
    seafarerId: str(seafarerId),
    focus: "acciones-pendientes",
    token,
  });
  return `${base}/base-gente-mar/todos?${q.toString()}`;
}
