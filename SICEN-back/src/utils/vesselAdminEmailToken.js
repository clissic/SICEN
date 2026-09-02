/**
 * Token firmado para deep links de solicitud de administración de buque.
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

export function buildVesselAdminEmailPayload({
  requestId,
  vesselId,
  vesselBusinessId,
}) {
  return {
    v: 1,
    requestId: str(requestId),
    vesselId: str(vesselId),
    vesselBusinessId: str(vesselBusinessId),
    exp: Date.now() + LINK_TTL_MS,
  };
}

export function encodeVesselAdminEmailToken(payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = signBody(body);
  return `${body}.${sig}`;
}

export function verifyVesselAdminEmailToken(token) {
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
    if (!data.requestId || !data.vesselId) return null;
    if (typeof data.exp === "number" && Date.now() > data.exp) return null;
    return {
      requestId: str(data.requestId),
      vesselId: str(data.vesselId),
      vesselBusinessId: str(data.vesselBusinessId),
      exp: data.exp,
    };
  } catch {
    return null;
  }
}

export function buildVesselAdminEditHref({
  requestId,
  vesselId,
  vesselBusinessId,
}) {
  const payload = buildVesselAdminEmailPayload({
    requestId,
    vesselId,
    vesselBusinessId,
  });
  const token = encodeVesselAdminEmailToken(payload);
  const base = String(env.publicAppUrl || "").replace(/\/+$/, "");
  const vid = str(vesselBusinessId) || str(vesselId);
  const q = new URLSearchParams({
    focus: "administradores",
    token,
  });
  return `${base}/base-buques/editar/${encodeURIComponent(vid)}?${q.toString()}`;
}
