import { describe, expect, it } from "vitest";
import { decryptTotpSecret, encryptTotpSecret } from "./mfaCrypto.util.js";

describe("cifrado del secreto TOTP", () => {
  it("cifra y descifra el mismo valor", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const packed = encryptTotpSecret(secret);
    expect(packed).not.toContain(secret);
    expect(packed.split(".")).toHaveLength(3);
    expect(decryptTotpSecret(packed)).toBe(secret);
  });

  it("usa IV distinto en cada cifrado", () => {
    const a = encryptTotpSecret("ABCDE");
    const b = encryptTotpSecret("ABCDE");
    expect(a).not.toBe(b);
    expect(decryptTotpSecret(a)).toBe("ABCDE");
    expect(decryptTotpSecret(b)).toBe("ABCDE");
  });

  it("falla si el payload está alterado", () => {
    const packed = encryptTotpSecret("SECRET");
    const [iv, tag, data] = packed.split(".");
    expect(() => decryptTotpSecret(`${iv}.${tag}.${data}aa`)).toThrow();
    expect(() => decryptTotpSecret("no-es-valido")).toThrow();
    expect(() => encryptTotpSecret("")).toThrow();
  });
});
