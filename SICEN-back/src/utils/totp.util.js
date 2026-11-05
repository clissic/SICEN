import crypto from "crypto";
import {
  MFA_DIGITS,
  MFA_ISSUER,
  MFA_PERIOD_SECONDS,
  MFA_WINDOW,
} from "../constants/mfa.js";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a), "utf8");
  const right = Buffer.from(String(b), "utf8");
  if (left.length !== right.length) {
    const dummy = Buffer.alloc(left.length);
    crypto.timingSafeEqual(left, dummy);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

export function base32Encode(buf) {
  const bytes = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(secret) {
  const cleaned = String(secret || "")
    .toUpperCase()
    .replace(/=+$/g, "")
    .replace(/[\s-]/g, "");
  if (!cleaned || /[^A-Z2-7]/.test(cleaned)) {
    throw new Error("Secreto TOTP inválido.");
  }
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(bytes = 20) {
  return base32Encode(crypto.randomBytes(bytes));
}

function counterBuffer(counter) {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  return buf;
}

export function generateHotp(secret, counter, digits = MFA_DIGITS) {
  const key = Buffer.isBuffer(secret) ? secret : base32Decode(secret);
  const hmac = crypto.createHmac("sha1", key).update(counterBuffer(counter)).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const mod = 10 ** digits;
  return String(bin % mod).padStart(digits, "0");
}

export function generateTotp(
  secret,
  { time = Date.now(), period = MFA_PERIOD_SECONDS, digits = MFA_DIGITS } = {}
) {
  const counter = Math.floor(time / 1000 / period);
  return generateHotp(secret, counter, digits);
}

export function normalizeTotpCode(code) {
  return String(code ?? "").replace(/\s/g, "");
}

export function verifyTotp(
  secret,
  token,
  {
    time = Date.now(),
    period = MFA_PERIOD_SECONDS,
    digits = MFA_DIGITS,
    window = MFA_WINDOW,
  } = {}
) {
  const code = normalizeTotpCode(token);
  if (!new RegExp(`^\\d{${digits}}$`).test(code)) return false;
  let decoded;
  try {
    decoded = Buffer.isBuffer(secret) ? secret : base32Decode(secret);
  } catch {
    return false;
  }
  const counter = Math.floor(time / 1000 / period);
  for (let i = -window; i <= window; i++) {
    const expected = generateHotp(decoded, counter + i, digits);
    if (timingSafeEqualString(expected, code)) return true;
  }
  return false;
}

export function buildOtpauthUrl({
  secret,
  email,
  issuer = MFA_ISSUER,
  digits = MFA_DIGITS,
  period = MFA_PERIOD_SECONDS,
} = {}) {
  const account = String(email || "usuario").trim() || "usuario";
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret: String(secret),
    issuer,
    algorithm: "SHA1",
    digits: String(digits),
    period: String(period),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
