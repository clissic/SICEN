import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/logger.js", () => ({
  logger: { info: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

vi.mock("../DAO/models/mongoose/users.mongoose.js", () => ({
  UserMongoose: { findOne: vi.fn(), findById: vi.fn() },
}));

vi.mock("../services/users.service.js", () => ({
  userService: { create: vi.fn(), findById: vi.fn() },
}));

vi.mock("../utils/Bcrypt.js", () => ({
  createHash: vi.fn((p) => `hashed:${p}`),
  isValidPassword: vi.fn((plain, hashed) => hashed === `hashed:${plain}`),
}));

vi.mock("../utils/mfaQr.util.js", () => ({
  otpauthToDataUrl: vi.fn(async () => "data:image/png;base64,QQ"),
}));

import { UserMongoose } from "../DAO/models/mongoose/users.mongoose.js";
import { isValidPassword } from "../utils/Bcrypt.js";
import { sessionsController } from "./sessions.controller.js";
import { signMfaChallengeToken } from "../utils/mfaJwt.util.js";
import { generateTotp } from "../utils/totp.util.js";
import { encryptTotpSecret } from "../utils/mfaCrypto.util.js";
import { generateTotpSecret } from "../utils/totp.util.js";
import { verifyAccessToken } from "../utils/jwt.util.js";

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function mockUser(overrides = {}) {
  const secret = generateTotpSecret();
  const user = {
    _id: "507f1f77bcf86cd799439011",
    email: "admin@sicen.test",
    first_name: "Ada",
    last_name: "Lovelace",
    rank: "CN",
    unit: "PREMO",
    role: "admin",
    password: "hashed:secret",
    fines: [],
    states: [],
    userTutorial: true,
    tokenVersion: 3,
    loginAttempts: 0,
    lockUntil: null,
    isLocked: false,
    mfa: {
      enabled: true,
      secretEncrypted: encryptTotpSecret(secret),
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
        fines: [],
        states: [],
        userTutorial: true,
        tokenVersion: user.tokenVersion,
        mfa: { ...user.mfa },
      };
    },
    __totpSecret: secret,
    ...overrides,
  };
  return user;
}

describe("login MFA (admins)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isValidPassword.mockImplementation(
      (plain, hashed) => hashed === `hashed:${plain}`
    );
  });

  it("un admin no recibe JWT hasta pasar TOTP", async () => {
    const user = mockUser();
    UserMongoose.findOne.mockResolvedValue(user);
    const res = mockRes();
    await sessionsController.login(
      { body: { email: "admin@sicen.test", password: "secret" } },
      res
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.mfaRequired).toBe(true);
    expect(res.body.mfaEnrollmentRequired).toBe(false);
    expect(res.body.token).toBeUndefined();
    expect(res.body.mfaToken).toEqual(expect.any(String));
  });

  it("un funcionario recibe JWT directo", async () => {
    const user = mockUser({
      role: "user",
      mfa: { enabled: false, secretEncrypted: "" },
    });
    UserMongoose.findOne.mockResolvedValue(user);
    const res = mockRes();
    await sessionsController.login(
      { body: { email: "user@sicen.test", password: "secret" } },
      res
    );
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.mfaRequired).toBeUndefined();
    expect(res.body.user.role).toBe("user");
    expect(verifyAccessToken(res.body.token).tv).toBe(3);
  });

  it("verify emite el JWT con un TOTP válido", async () => {
    const user = mockUser();
    UserMongoose.findById.mockResolvedValue(user);
    const mfaToken = signMfaChallengeToken(user._id);
    const code = generateTotp(user.__totpSecret);
    const res = mockRes();
    await sessionsController.mfaVerify(
      { body: { mfaToken, code }, headers: {} },
      res
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.mfaEnabled).toBe(true);
    const payload = verifyAccessToken(res.body.token);
    expect(payload.sub).toBe(String(user._id));
    expect(payload.tv).toBe(3);
    expect(payload.purpose).toBeUndefined();
  });

  it("tras password válida resetea lockout de cuenta y desafía MFA (sin JWT)", async () => {
    const user = mockUser({
      loginAttempts: 3,
      lockUntil: new Date(Date.now() - 1000),
    });
    UserMongoose.findOne.mockResolvedValue(user);
    const res = mockRes();
    await sessionsController.login(
      { body: { email: "admin@sicen.test", password: "secret" } },
      res
    );
    expect(user.loginAttempts).toBe(0);
    expect(user.lockUntil).toBeNull();
    expect(res.statusCode).toBe(200);
    expect(res.body.mfaRequired).toBe(true);
    expect(res.body.token).toBeUndefined();
  });

  it("un admin sin MFA recibe enrolamiento obligatorio", async () => {
    const user = mockUser({
      mfa: {
        enabled: false,
        secretEncrypted: "",
        pendingSecretEncrypted: "",
        recoveryCodeHashes: [],
        pendingRecoveryCodeHashes: [],
        failedAttempts: 0,
        lockUntil: null,
      },
    });
    UserMongoose.findOne.mockResolvedValue(user);
    const res = mockRes();
    await sessionsController.login(
      { body: { email: "admin@sicen.test", password: "secret" } },
      res
    );
    expect(res.body.mfaEnrollmentRequired).toBe(true);
    expect(res.body.token).toBeUndefined();
  });

  it("enroll con mfaToken devuelve QR y secreto", async () => {
    const user = mockUser({
      mfa: {
        enabled: false,
        secretEncrypted: "",
        pendingSecretEncrypted: "",
        recoveryCodeHashes: [],
        pendingRecoveryCodeHashes: [],
        failedAttempts: 0,
        lockUntil: null,
      },
    });
    UserMongoose.findById.mockResolvedValue(user);
    const mfaToken = signMfaChallengeToken(user._id);
    const res = mockRes();
    await sessionsController.mfaEnroll(
      { body: { mfaToken }, headers: {} },
      res
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.qrDataUrl).toMatch(/^data:image\/png/);
    expect(res.body.secret).toEqual(expect.any(String));
    expect(res.body.recoveryCodes).toHaveLength(10);
    expect(res.body.otpauthUrl).toContain("otpauth://totp/");
  });

  it("verify rechaza un código inválido", async () => {
    const user = mockUser();
    UserMongoose.findById.mockResolvedValue(user);
    const mfaToken = signMfaChallengeToken(user._id);
    const res = mockRes();
    await sessionsController.mfaVerify(
      { body: { mfaToken, code: "000000" }, headers: {} },
      res
    );
    expect(res.statusCode).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.token).toBeUndefined();
  });
});
