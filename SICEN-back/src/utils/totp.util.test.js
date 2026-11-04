import { describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  buildOtpauthUrl,
  generateHotp,
  generateTotp,
  generateTotpSecret,
  verifyTotp,
} from "./totp.util.js";

describe("base32", () => {
  it("redondea encode/decode", () => {
    const buf = Buffer.from("12345678901234567890", "ascii");
    const encoded = base32Encode(buf);
    expect(base32Decode(encoded).equals(buf)).toBe(true);
  });

  it("ignora espacios, guiones y padding", () => {
    const secret = generateTotpSecret();
    const spaced = `${secret.slice(0, 4)}-${secret.slice(4)}====`;
    expect(base32Decode(spaced).equals(base32Decode(secret))).toBe(true);
  });
});

describe("HOTP RFC 4226", () => {
  const secret = Buffer.from("12345678901234567890", "ascii");

  it("vectores de 6 dígitos", () => {
    expect(generateHotp(secret, 0)).toBe("755224");
    expect(generateHotp(secret, 1)).toBe("287082");
    expect(generateHotp(secret, 2)).toBe("359152");
    expect(generateHotp(secret, 9)).toBe("520489");
  });
});

describe("TOTP", () => {
  it("genera un secreto y lo verifica en la ventana", () => {
    const secret = generateTotpSecret();
    const now = Date.parse("2026-03-01T12:00:00Z");
    const code = generateTotp(secret, { time: now });
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotp(secret, code, { time: now })).toBe(true);
    expect(verifyTotp(secret, code, { time: now + 29_000 })).toBe(true);
    expect(verifyTotp(secret, code, { time: now - 29_000 })).toBe(true);
    expect(verifyTotp(secret, code, { time: now + 90_000 })).toBe(false);
    expect(verifyTotp(secret, "000000", { time: now })).toBe(false);
    expect(verifyTotp(secret, "12 34 56", { time: now })).toBe(false);
  });

  it("rechaza códigos que no tienen 6 dígitos", () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, "12345")).toBe(false);
    expect(verifyTotp(secret, "1234567")).toBe(false);
    expect(verifyTotp(secret, "abcdef")).toBe(false);
    expect(verifyTotp("!!!", "123456")).toBe(false);
  });
});

describe("otpauth URL", () => {
  it("arma una URL compatible con Google Authenticator", () => {
    const url = buildOtpauthUrl({
      secret: "JBSWY3DPEHPK3PXP",
      email: "admin@sicen.test",
    });
    expect(url.startsWith("otpauth://totp/")).toBe(true);
    expect(url).toContain("SICEN");
    expect(url).toContain(encodeURIComponent("admin@sicen.test"));
    expect(url).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(url).toContain("digits=6");
    expect(url).toContain("period=30");
    expect(url).toContain("algorithm=SHA1");
  });
});
