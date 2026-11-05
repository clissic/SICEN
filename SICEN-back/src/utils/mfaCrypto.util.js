import crypto from "crypto";
import env from "../config/env.config.js";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey() {
  const secret = env.mfaEncryptionKey || env.jwtSecret;
  if (!secret) {
    throw new Error("Falta la clave de cifrado MFA.");
  }
  return crypto.createHash("sha256").update(String(secret), "utf8").digest();
}

/**
 * Cifra el secreto TOTP en AES-256-GCM.
 * Formato persistido: `iv.tag.ciphertext` (cada parte en base64url).
 */
export function encryptTotpSecret(plain) {
  const text = String(plain ?? "");
  if (!text) throw new Error("Secreto TOTP vacío.");
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  if (tag.length !== TAG_LEN) {
    throw new Error("No se pudo cifrar el secreto TOTP.");
  }
  return [iv, tag, ciphertext].map((b) => b.toString("base64url")).join(".");
}

export function decryptTotpSecret(payload) {
  const raw = String(payload ?? "");
  const parts = raw.split(".");
  if (parts.length !== 3) {
    throw new Error("Secreto TOTP cifrado inválido.");
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN || !data.length) {
    throw new Error("Secreto TOTP cifrado inválido.");
  }
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return plain.toString("utf8");
}
