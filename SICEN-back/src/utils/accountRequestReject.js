/**
 * Token firmado + URL para rechazar una solicitud de cuenta desde el correo.
 * Payload: email, nombre, tipo; HMAC-SHA256 con JWT_SECRET; vigencia 30 días.
 */

import crypto from "crypto";
import env from "../config/env.config.js";

const REJECT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const ACCOUNT_TYPE_LABELS = Object.freeze({
  "pnn-funcionario": "Funcionario PNN",
  "nauta-deportivo": "Náuta deportivo",
  "agente-maritimo": "Agente Marítimo",
  "gente-de-mar": "Gente de mar",
});

function str(v) {
  return v == null ? "" : String(v).trim();
}

function signBody(bodyB64) {
  return crypto
    .createHmac("sha256", env.jwtSecret)
    .update(bodyB64)
    .digest("base64url");
}

export function accountTypeLabel(accountType) {
  return ACCOUNT_TYPE_LABELS[accountType] || "Solicitud de cuenta";
}

export function buildAccountRequestRejectPayload({
  accountType,
  first_name,
  last_name,
  email,
}) {
  return {
    v: 1,
    accountType: str(accountType) || "unknown",
    first_name: str(first_name),
    last_name: str(last_name),
    email: str(email).toLowerCase(),
    exp: Date.now() + REJECT_TTL_MS,
  };
}

export function encodeAccountRequestRejectToken(payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = signBody(body);
  return `${body}.${sig}`;
}

/**
 * @returns {object|null} payload o null si inválido / expirado
 */
export function verifyAccountRequestRejectToken(token) {
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
    if (!data.email || typeof data.email !== "string") return null;
    if (typeof data.exp === "number" && Date.now() > data.exp) return null;
    return {
      accountType: str(data.accountType),
      first_name: str(data.first_name),
      last_name: str(data.last_name),
      email: str(data.email).toLowerCase(),
      typeLabel: accountTypeLabel(data.accountType),
      exp: data.exp,
    };
  } catch {
    return null;
  }
}

export function buildRejectAccountRequestHref(fields) {
  const payload = buildAccountRequestRejectPayload(fields);
  const token = encodeAccountRequestRejectToken(payload);
  const base = String(env.publicAppUrl || "").replace(/\/+$/, "");
  return `${base}/usuarios/rechazar-solicitud?token=${encodeURIComponent(token)}`;
}
