import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  parseTracesSampleRate,
  resolveSentryDsn,
  resolveSentryEnvironment,
  shouldEnableSentry,
} from "./config.js";

describe("shouldEnableSentry / resolveSentryDsn (front)", () => {
  it("no habilita sin VITE_SENTRY_DSN", () => {
    expect(shouldEnableSentry("")).toBe(false);
    expect(resolveSentryDsn({})).toBe("");
    expect(resolveSentryDsn({ VITE_SENTRY_DSN: "  " })).toBe("");
  });

  it("habilita con DSN", () => {
    const fakeDsn = ["https://", "example.invalid", "/sentry-dsn"].join("");
    expect(shouldEnableSentry(fakeDsn)).toBe(true);
    expect(resolveSentryDsn({ VITE_SENTRY_DSN: ` ${fakeDsn} ` })).toBe(fakeDsn);
  });
});

describe("parseTracesSampleRate (front)", () => {
  it("default 0.1 y acota", () => {
    expect(parseTracesSampleRate(undefined)).toBe(0.1);
    expect(parseTracesSampleRate("0")).toBe(0);
    expect(parseTracesSampleRate("3")).toBe(1);
  });
});

describe("resolveSentryEnvironment (front)", () => {
  it("usa VITE_SENTRY_ENVIRONMENT o MODE", () => {
    expect(
      resolveSentryEnvironment(
        { VITE_SENTRY_ENVIRONMENT: "staging" },
        "production"
      )
    ).toBe("staging");
    expect(resolveSentryEnvironment({}, "production")).toBe("production");
  });
});

describe("initSentry sin DSN", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("no llama a Sentry.init si falta VITE_SENTRY_DSN", async () => {
    const init = vi.fn();
    vi.doMock("@sentry/react", () => ({
      init,
      ErrorBoundary: ({ children }) => children,
    }));

    // import.meta.env lo provee Vite; stubear vía vi.stubEnv si está disponible
    vi.stubEnv("VITE_SENTRY_DSN", "");
    vi.stubEnv("VITE_SENTRY_DEBUG", "");

    const { initSentry, isSentryEnabled } = await import("../sentry.js");
    expect(initSentry()).toBe(false);
    expect(isSentryEnabled()).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });
});
