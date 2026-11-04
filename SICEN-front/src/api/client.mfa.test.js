import { afterEach, describe, expect, it, vi } from "vitest";
import { login, verifyMfa, getAuthToken, clearAuthToken } from "./client.js";

describe("cliente API MFA", () => {
  afterEach(() => {
    clearAuthToken();
    vi.unstubAllGlobals();
  });

  it("login no guarda JWT si hace falta TOTP", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            ok: true,
            mfaRequired: true,
            mfaEnrollmentRequired: false,
            mfaToken: "challenge",
          }),
      }))
    );
    const data = await login("admin@sicen.test", "secret");
    expect(data.mfaRequired).toBe(true);
    expect(getAuthToken()).toBeNull();
  });

  it("verifyMfa guarda el JWT de acceso", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            ok: true,
            token: "access-jwt",
            user: { email: "admin@sicen.test", role: "admin" },
          }),
      }))
    );
    const data = await verifyMfa({ mfaToken: "challenge", code: "123456" });
    expect(data.token).toBe("access-jwt");
    expect(getAuthToken()).toBe("access-jwt");
  });
});
