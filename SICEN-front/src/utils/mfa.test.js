import { describe, expect, it } from "vitest";
import {
  formatRecoveryCode,
  isRecoveryCode,
  isTotpCode,
  loginStepFromResponse,
  normalizeMfaCode,
} from "./mfa.js";
import { roleRequiresMfa } from "../constants/userRoles.js";

describe("códigos MFA", () => {
  it("reconoce TOTP de 6 dígitos y códigos de recuperación", () => {
    expect(isTotpCode("123456")).toBe(true);
    expect(isTotpCode("12 34 56")).toBe(true);
    expect(isTotpCode("12345")).toBe(false);
    expect(isRecoveryCode("ABCD-EF01")).toBe(true);
    expect(isRecoveryCode("abcdef01")).toBe(true);
    expect(isRecoveryCode("123456")).toBe(false);
    expect(normalizeMfaCode(" ab cd ")).toBe("ABCD");
    expect(formatRecoveryCode("abcdef01")).toBe("ABCD-EF01");
  });
});

describe("loginStepFromResponse", () => {
  it("pasa a enrolamiento si el admin todavía no activó MFA", () => {
    expect(
      loginStepFromResponse({
        ok: true,
        mfaRequired: true,
        mfaEnrollmentRequired: true,
        mfaToken: "t",
      })
    ).toBe("enroll");
  });

  it("pide el código si MFA ya está activa", () => {
    expect(
      loginStepFromResponse({
        ok: true,
        mfaRequired: true,
        mfaEnrollmentRequired: false,
        mfaToken: "t",
      })
    ).toBe("verify");
  });

  it("termina si vino el JWT de acceso", () => {
    expect(loginStepFromResponse({ ok: true, token: "jwt", user: {} })).toBe(
      "done"
    );
    expect(loginStepFromResponse({})).toBe("credentials");
  });
});

describe("roleRequiresMfa", () => {
  it("solo admin y superAdmin", () => {
    expect(roleRequiresMfa("admin")).toBe(true);
    expect(roleRequiresMfa("superAdmin")).toBe(true);
    expect(roleRequiresMfa("user")).toBe(false);
    expect(roleRequiresMfa("skipper")).toBe(false);
  });
});
