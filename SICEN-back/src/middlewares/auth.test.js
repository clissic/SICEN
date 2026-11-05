import { describe, expect, it, vi, beforeEach } from "vitest";
import { checkLogin, optionalJwt } from "./auth.js";
import { signAccessToken } from "../utils/jwt.util.js";

vi.mock("../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../services/users.service.js", () => ({
  userService: {
    findById: vi.fn(),
  },
}));

describe("auth middlewares con tokenVersion", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null,
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  describe("checkLogin", () => {
    it("rechaza request sin token", async () => {
      await checkLogin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          msg: expect.stringContaining("iniciar sesión"),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("rechaza token con formato inválido", async () => {
      req.headers.authorization = "Bearer token-invalido";
      await checkLogin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          msg: expect.stringContaining("inválido"),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("optionalJwt", () => {
    it("permite request sin token (req.user = null)", async () => {
      await optionalJwt(req, res, next);
      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("rechaza token con formato inválido", async () => {
      req.headers.authorization = "Bearer token-invalido";
      await optionalJwt(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          msg: expect.stringContaining("inválido"),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe("tokenVersion en payload JWT", () => {
  it("incluye tokenVersion en el JWT generado", () => {
    const userId = "507f1f77bcf86cd799439011";
    const tokenVersion = 5;
    const token = signAccessToken(userId, tokenVersion);
    const jwt = require("jsonwebtoken");
    const decoded = jwt.decode(token);
    expect(decoded.sub).toBe(userId);
    expect(decoded.tv).toBe(tokenVersion);
  });
});
