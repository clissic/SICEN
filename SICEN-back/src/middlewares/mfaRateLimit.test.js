import { describe, expect, it } from "vitest";
import { createMemoryRateLimiter } from "./mfaRateLimit.js";

function mockReq(ip = "1.2.3.4") {
  return { ip, headers: {}, socket: { remoteAddress: ip } };
}

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

describe("rate limit de verificación MFA", () => {
  it("deja pasar hasta max y después responde 429", () => {
    const limiter = createMemoryRateLimiter({
      windowMs: 60_000,
      max: 3,
      keyFn: () => "test",
      message: "Demasiados intentos",
      code: "MFA_RATE_LIMIT",
    });
    const next = () => {};
    for (let i = 0; i < 3; i++) {
      const res = mockRes();
      limiter(mockReq(), res, next);
      expect(res.statusCode).toBe(200);
    }
    const blocked = mockRes();
    limiter(mockReq(), blocked, next);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body.ok).toBe(false);
    expect(blocked.body.code).toBe("MFA_RATE_LIMIT");
    limiter.reset();
  });

  it("separa las claves (IP)", () => {
    const limiter = createMemoryRateLimiter({
      windowMs: 60_000,
      max: 1,
      keyFn: (req) => req.ip,
      message: "bloqueado",
    });
    const a = mockRes();
    const b = mockRes();
    limiter(mockReq("10.0.0.1"), a, () => {});
    limiter(mockReq("10.0.0.2"), b, () => {});
    expect(a.statusCode).toBe(200);
    expect(b.statusCode).toBe(200);
    const a2 = mockRes();
    limiter(mockReq("10.0.0.1"), a2, () => {});
    expect(a2.statusCode).toBe(429);
    limiter.reset();
  });
});
