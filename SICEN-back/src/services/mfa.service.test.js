import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/logger.js", () => ({
  logger: { info: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

vi.mock("../utils/mfaQr.util.js", () => ({
  otpauthToDataUrl: vi.fn(async (url) => `data:image/png;base64,QR:${url.length}`),
}));

import {
  buildMfaChallengeResponse,
  confirmEnrollment,
  disableMfa,
  loginRequiresMfaChallenge,
  startEnrollment,
  userHasMfaEnabled,
  verifyMfaChallenge,
} from "./mfa.service.js";
import { decryptTotpSecret } from "../utils/mfaCrypto.util.js";
import { generateTotp } from "../utils/totp.util.js";
import { hashRecoveryCode } from "../utils/recoveryCodes.util.js";
import { verifyAccessToken } from "../utils/jwt.util.js";
import { MFA_MAX_FAILED_ATTEMPTS } from "../constants/mfa.js";

function makeUser(overrides = {}) {
  const user = {
    _id: "507f1f77bcf86cd799439011",
    email: "admin@sicen.test",
    first_name: "Ada",
    last_name: "Lovelace",
    rank: "CN",
    unit: "PREMO",
    role: "admin",
    password: "hash",
    fines: [],
    states: [],
    userTutorial: true,
    tokenVersion: 0,
    mfa: {
      enabled: false,
      secretEncrypted: "",
      pendingSecretEncrypted: "",
      recoveryCodeHashes: [],
      pendingRecoveryCodeHashes: [],
      failedAttempts: 0,
      lockUntil: null,
    },
    markModified: vi.fn(),
    async save() {
      return user;
    },
    toObject() {
      return {
        _id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        rank: user.rank,
        unit: user.unit,
        role: user.role,
        password: user.password,
        fines: user.fines,
        states: user.states,
        userTutorial: user.userTutorial,
        tokenVersion: user.tokenVersion,
        mfa: { ...user.mfa },
      };
    },
    ...overrides,
  };
  if (!user.save) {
    user.save = async () => user;
  }
  return user;
}

describe("loginRequiresMfaChallenge", () => {
  it("es obligatorio para admin y superAdmin, no para user", () => {
    expect(loginRequiresMfaChallenge({ role: "admin" })).toBe(true);
    expect(loginRequiresMfaChallenge({ role: "superAdmin" })).toBe(true);
    expect(loginRequiresMfaChallenge({ role: "user" })).toBe(false);
    expect(
      loginRequiresMfaChallenge({
        role: "user",
        mfa: { enabled: true },
      })
    ).toBe(true);
  });
});

describe("enrolamiento y verificación MFA", () => {
  let user;

  beforeEach(() => {
    user = makeUser();
  });

  it("el desafío de login no emite JWT de acceso", async () => {
    const res = await buildMfaChallengeResponse(user);
    expect(res.ok).toBe(true);
    expect(res.mfaRequired).toBe(true);
    expect(res.mfaEnrollmentRequired).toBe(true);
    expect(res.token).toBeUndefined();
    expect(res.mfaToken).toEqual(expect.any(String));
  });

  it("enroll genera QR, secreto y códigos de un solo uso", async () => {
    const result = await startEnrollment(user);
    expect(result.secret).toMatch(/^[A-Z2-7]+$/);
    expect(result.otpauthUrl).toContain("otpauth://totp/");
    expect(result.qrDataUrl.startsWith("data:image/png")).toBe(true);
    expect(result.recoveryCodes).toHaveLength(10);
    expect(user.mfa.pendingSecretEncrypted).toBeTruthy();
    expect(user.mfa.pendingSecretEncrypted).not.toContain(result.secret);
    expect(decryptTotpSecret(user.mfa.pendingSecretEncrypted)).toBe(result.secret);
    expect(user.mfa.enabled).toBe(false);
  });

  it("verify con TOTP confirma el enrolamiento y emite JWT", async () => {
    const enrolled = await startEnrollment(user);
    const code = generateTotp(enrolled.secret);
    const issued = await verifyMfaChallenge(user, code);
    expect(issued.ok).toBe(true);
    expect(issued.token).toEqual(expect.any(String));
    const payload = verifyAccessToken(issued.token);
    expect(payload.sub).toBe(String(user._id));
    expect(payload.tv).toBe(0);
    expect(issued.user.mfaEnabled).toBe(true);
    expect(issued.user.password).toBeUndefined();
    expect(issued.user.mfa).toBeUndefined();
    expect(userHasMfaEnabled(user)).toBe(true);
    expect(user.mfa.pendingSecretEncrypted).toBe("");
  });

  it("rechaza un código TOTP incorrecto y cuenta el intento", async () => {
    await startEnrollment(user);
    await expect(verifyMfaChallenge(user, "000000")).rejects.toMatchObject({
      status: 401,
    });
    expect(user.mfa.failedAttempts).toBe(1);
    expect(userHasMfaEnabled(user)).toBe(false);
  });

  it("bloquea tras demasiados intentos fallidos", async () => {
    await startEnrollment(user);
    for (let i = 0; i < MFA_MAX_FAILED_ATTEMPTS; i++) {
      await verifyMfaChallenge(user, "000000").catch(() => {});
    }
    await expect(verifyMfaChallenge(user, "000000")).rejects.toMatchObject({
      status: 429,
      code: "MFA_LOCKED",
    });
    expect(user.mfa.lockUntil).toBeInstanceOf(Date);
  });

  it("acepta un código de recuperación y lo consume", async () => {
    const enrolled = await startEnrollment(user);
    const code = generateTotp(enrolled.secret);
    await verifyMfaChallenge(user, code);
    const recovery = enrolled.recoveryCodes[0];
    user.mfa.recoveryCodeHashes = [hashRecoveryCode(recovery)];
    const issued = await verifyMfaChallenge(user, recovery);
    expect(issued.ok).toBe(true);
    expect(user.mfa.recoveryCodeHashes).toHaveLength(0);
    await expect(verifyMfaChallenge(user, recovery)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("desactiva MFA con el código TOTP vigente", async () => {
    const enrolled = await startEnrollment(user);
    const code = generateTotp(enrolled.secret);
    await verifyMfaChallenge(user, code);
    const later = generateTotp(enrolled.secret);
    const result = await disableMfa(user, later);
    expect(result.mfaEnabled).toBe(false);
    expect(userHasMfaEnabled(user)).toBe(false);
    expect(user.mfa.secretEncrypted).toBe("");
  });

  it("el JWT de MFA incluye tokenVersion (tv) igual que el login normal", async () => {
    user.tokenVersion = 7;
    const enrolled = await startEnrollment(user);
    const issued = await verifyMfaChallenge(user, generateTotp(enrolled.secret));
    const payload = verifyAccessToken(issued.token);
    expect(payload.sub).toBe(String(user._id));
    expect(payload.tv).toBe(7);
    expect(payload.purpose).toBeUndefined();
  });

  it("no deja enrolar a un usuario que no es admin", async () => {
    const skipper = makeUser({ role: "skipper" });
    await expect(startEnrollment(skipper)).rejects.toMatchObject({ status: 403 });
  });

  it("confirmEnrollment exige un pending y el TOTP correcto", async () => {
    await expect(confirmEnrollment(user, "123456")).rejects.toMatchObject({
      status: 400,
    });
    const enrolled = await startEnrollment(user);
    await confirmEnrollment(user, generateTotp(enrolled.secret));
    expect(userHasMfaEnabled(user)).toBe(true);
  });
});
