import { describe, expect, it, vi } from "vitest";

vi.mock("../services/users.service.js", () => ({
  userService: { findById: vi.fn() },
}));

vi.mock("../utils/logger.js", () => ({
  logger: { info: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

import { checkLogin, optionalJwt, toPublicUser } from "./auth.js";
import { signMfaChallengeToken } from "../utils/mfaJwt.util.js";
import { signAccessToken } from "../utils/jwt.util.js";
import { userService } from "../services/users.service.js";

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

describe("toPublicUser", () => {
  it("saca password y secreto MFA, deja mfaEnabled", () => {
    const publicUser = toPublicUser({
      email: "a@b.c",
      password: "hash",
      mfa: { enabled: true, secretEncrypted: "iv.tag.ct" },
    });
    expect(publicUser.password).toBeUndefined();
    expect(publicUser.mfa).toBeUndefined();
    expect(publicUser.mfaEnabled).toBe(true);
    expect(publicUser.email).toBe("a@b.c");
  });
});

describe("guards rechazan el token de desafío MFA", () => {
  it("checkLogin no acepta purpose=mfa", async () => {
    const token = signMfaChallengeToken("abc");
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    await checkLogin(req, res, () => {});
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe("MFA_CHALLENGE");
    expect(userService.findById).not.toHaveBeenCalled();
  });

  it("optionalJwt tampoco acepta purpose=mfa", async () => {
    const token = signMfaChallengeToken("abc");
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    await optionalJwt(req, res, () => {});
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe("MFA_CHALLENGE");
  });

  it("checkLogin sí acepta un JWT de acceso", async () => {
    userService.findById.mockResolvedValueOnce({
      _id: "abc",
      email: "a@b.c",
      role: "user",
      password: "x",
      mfa: { enabled: false },
    });
    const token = signAccessToken("abc");
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    let nextCalled = false;
    await checkLogin(req, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect(req.user.mfaEnabled).toBe(false);
    expect(req.user.password).toBeUndefined();
  });
});
