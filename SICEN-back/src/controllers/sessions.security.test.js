import { describe, it, expect, beforeEach, vi } from "vitest";
import { UserMongoose } from "../DAO/models/mongoose/users.mongoose.js";
import { sessionsController } from "./sessions.controller.js";
import { createHash } from "../utils/Bcrypt.js";

vi.mock("../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../utils/jwt.util.js", () => ({
  signAccessToken: vi.fn(() => "mock-jwt-token"),
}));

describe("sessionsController - account lockout", () => {
  let req, res, mockUser;

  beforeEach(() => {
    req = {
      body: {
        email: "test@example.com",
        password: "wrong-password",
      },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockUser = {
      _id: "123",
      email: "test@example.com",
      password: createHash("correct-password"),
      first_name: "Test",
      last_name: "User",
      rank: "Oficial",
      role: "user",
      loginAttempts: 0,
      lockUntil: null,
      save: vi.fn().mockResolvedValue(undefined),
      isLocked: false,
    };
  });

  it("incrementa loginAttempts tras contraseña incorrecta", async () => {
    vi.spyOn(UserMongoose, "findOne").mockResolvedValue(mockUser);

    await sessionsController.login(req, res);

    expect(mockUser.loginAttempts).toBe(1);
    expect(mockUser.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      msg: "Email o contraseña incorrectos.",
    });
  });

  it("bloquea la cuenta tras 5 intentos fallidos", async () => {
    mockUser.loginAttempts = 4;
    vi.spyOn(UserMongoose, "findOne").mockResolvedValue(mockUser);

    await sessionsController.login(req, res);

    expect(mockUser.loginAttempts).toBe(5);
    expect(mockUser.lockUntil).toBeInstanceOf(Date);
    expect(mockUser.lockUntil.getTime()).toBeGreaterThan(Date.now());
    expect(mockUser.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(423);
  });

  it("rechaza login si la cuenta está bloqueada", async () => {
    mockUser.lockUntil = new Date(Date.now() + 10 * 60 * 1000);
    Object.defineProperty(mockUser, "isLocked", {
      get: () => !!(mockUser.lockUntil && mockUser.lockUntil > Date.now()),
    });

    vi.spyOn(UserMongoose, "findOne").mockResolvedValue(mockUser);

    await sessionsController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(423);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        msg: expect.stringContaining("bloqueada temporalmente"),
      })
    );
  });

  it("resetea loginAttempts tras login exitoso", async () => {
    mockUser.loginAttempts = 3;
    req.body.password = "correct-password";

    vi.spyOn(UserMongoose, "findOne").mockResolvedValue(mockUser);

    await sessionsController.login(req, res);

    expect(mockUser.loginAttempts).toBe(0);
    expect(mockUser.lockUntil).toBeNull();
    expect(mockUser.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        token: "mock-jwt-token",
      })
    );
  });

  it("rechaza login con 401 si el usuario no existe (sin enumerar cuentas)", async () => {
    vi.spyOn(UserMongoose, "findOne").mockResolvedValue(null);

    await sessionsController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      msg: "Email o contraseña incorrectos.",
    });
  });
});
