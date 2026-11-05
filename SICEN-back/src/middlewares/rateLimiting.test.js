import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../utils/logger.js", () => ({
  logger: {
    warning: vi.fn(),
  },
}));

import { loginRateLimiter, passwordRecoveryRateLimiter } from "./rateLimiting.js";

describe("loginRateLimiter", () => {
  it("es una función middleware", () => {
    expect(typeof loginRateLimiter).toBe("function");
  });
});

describe("passwordRecoveryRateLimiter", () => {
  it("es una función middleware", () => {
    expect(typeof passwordRecoveryRateLimiter).toBe("function");
  });
});
