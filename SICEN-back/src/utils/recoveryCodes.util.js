import crypto from "crypto";
import env from "../config/env.config.js";
import { MFA_RECOVERY_CODE_COUNT } from "../constants/mfa.js";

function pepper() {
  return String(env.mfaEncryptionKey || env.jwtSecret || "mfa-dev");
}

export function normalizeRecoveryCode(code) {
  return String(code ?? "")
    .toUpperCase()
    .replace(/[\s-]/g, "");
}

export function formatRecoveryCode(code) {
  const n = normalizeRecoveryCode(code);
  if (n.length !== 8) return n;
  return `${n.slice(0, 4)}-${n.slice(4)}`;
}

export function looksLikeRecoveryCode(code) {
  return /^[A-F0-9]{8}$/.test(normalizeRecoveryCode(code));
}

export function hashRecoveryCode(code) {
  const normalized = normalizeRecoveryCode(code);
  return crypto.createHmac("sha256", pepper()).update(normalized, "utf8").digest("hex");
}

export function generateRecoveryCodes(count = MFA_RECOVERY_CODE_COUNT) {
  const codes = [];
  const seen = new Set();
  while (codes.length < count) {
    const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
    if (seen.has(raw)) continue;
    seen.add(raw);
    codes.push(formatRecoveryCode(raw));
  }
  return codes;
}

export function hashRecoveryCodes(codes) {
  return codes.map((c) => hashRecoveryCode(c));
}

/**
 * Busca un código entre hashes HMAC. Devuelve el índice o -1.
 * Recorre todos para no filtrar por tiempo si hay match temprano.
 */
export function findRecoveryCodeIndex(code, hashes) {
  const target = hashRecoveryCode(code);
  const targetBuf = Buffer.from(target, "hex");
  let found = -1;
  const list = Array.isArray(hashes) ? hashes : [];
  for (let i = 0; i < list.length; i++) {
    const candidate = String(list[i] || "");
    if (!/^[0-9a-f]{64}$/i.test(candidate)) continue;
    const candBuf = Buffer.from(candidate, "hex");
    if (candBuf.length !== targetBuf.length) continue;
    if (crypto.timingSafeEqual(candBuf, targetBuf) && found === -1) {
      found = i;
    }
  }
  return found;
}
