import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken } from "./jwt.util.js";
import {
  isMfaChallengePayload,
  MFA_TOKEN_PURPOSE,
  signMfaChallengeToken,
  verifyMfaChallengeToken,
} from "./mfaJwt.util.js";

describe("token de desafío MFA", () => {
  it("firma un JWT con purpose=mfa y lo verifica", () => {
    const token = signMfaChallengeToken("user-1");
    const payload = verifyMfaChallengeToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.purpose).toBe(MFA_TOKEN_PURPOSE);
    expect(isMfaChallengePayload(payload)).toBe(true);
  });

  it("un JWT de acceso no sirve como desafío MFA", () => {
    const access = signAccessToken("user-1");
    expect(() => verifyMfaChallengeToken(access)).toThrow();
    expect(isMfaChallengePayload(verifyAccessToken(access))).toBe(false);
  });

  it("rechaza tokens basura", () => {
    expect(() => verifyMfaChallengeToken("nope")).toThrow();
    expect(() => verifyMfaChallengeToken("")).toThrow();
  });
});
