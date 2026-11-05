import { describe, expect, it } from "vitest";
import {
  findRecoveryCodeIndex,
  formatRecoveryCode,
  generateRecoveryCodes,
  hashRecoveryCode,
  hashRecoveryCodes,
  looksLikeRecoveryCode,
  normalizeRecoveryCode,
} from "./recoveryCodes.util.js";

describe("códigos de recuperación", () => {
  it("genera 10 códigos únicos con formato XXXX-XXXX", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) {
      expect(c).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
      expect(looksLikeRecoveryCode(c)).toBe(true);
    }
  });

  it("hashea de forma determinística y no reversible", () => {
    const code = "ABCD-EF01";
    const hash = hashRecoveryCode(code);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashRecoveryCode("abcd ef01"));
    expect(hash).not.toContain("ABCD");
    expect(normalizeRecoveryCode(code)).toBe("ABCDEF01");
    expect(formatRecoveryCode("abcdef01")).toBe("ABCD-EF01");
  });

  it("encuentra y distingue el código entre hashes", () => {
    const codes = generateRecoveryCodes(4);
    const hashes = hashRecoveryCodes(codes);
    expect(findRecoveryCodeIndex(codes[2], hashes)).toBe(2);
    expect(findRecoveryCodeIndex("0000-0000", hashes)).toBe(-1);
    expect(looksLikeRecoveryCode("123456")).toBe(false);
  });
});
