import { describe, expect, it, beforeEach } from "vitest";
import { signAccessToken, verifyAccessToken } from "./jwt.util.js";
import jwt from "jsonwebtoken";
import env from "../config/env.config.js";

describe("JWT con tokenVersion", () => {
  it("genera JWT con tokenVersion en el payload", () => {
    const userId = "507f1f77bcf86cd799439011";
    const tokenVersion = 3;
    const token = signAccessToken(userId, tokenVersion);
    expect(token).toBeTruthy();
    const decoded = jwt.decode(token);
    expect(decoded.sub).toBe(userId);
    expect(decoded.tv).toBe(tokenVersion);
  });

  it("tokenVersion default es 0 si no se especifica", () => {
    const userId = "507f1f77bcf86cd799439011";
    const token = signAccessToken(userId);
    const decoded = jwt.decode(token);
    expect(decoded.tv).toBe(0);
  });

  it("verifyAccessToken valida el token correctamente", () => {
    const userId = "507f1f77bcf86cd799439011";
    const tokenVersion = 2;
    const token = signAccessToken(userId, tokenVersion);
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(userId);
    expect(decoded.tv).toBe(tokenVersion);
  });

  it("verifyAccessToken rechaza tokens con firma inválida", () => {
    const fakeToken = jwt.sign(
      { sub: "507f1f77bcf86cd799439011", tv: 1 },
      "wrong-secret",
      { expiresIn: "1h" }
    );
    expect(() => verifyAccessToken(fakeToken)).toThrow();
  });

  it("verifyAccessToken rechaza tokens expirados", () => {
    const userId = "507f1f77bcf86cd799439011";
    const expiredToken = jwt.sign(
      { sub: userId, tv: 0 },
      env.jwtSecret,
      { expiresIn: "-1h" }
    );
    expect(() => verifyAccessToken(expiredToken)).toThrow();
  });
});
