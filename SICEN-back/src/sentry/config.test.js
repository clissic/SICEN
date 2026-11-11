import { describe, expect, it, vi } from "vitest";
import {
  parseTracesSampleRate,
  resolveSentryDsn,
  resolveSentryEnvironment,
  shouldEnableSentry,
} from "./config.js";

describe("shouldEnableSentry / resolveSentryDsn", () => {
  it("no habilita sin DSN o con DSN vacío", () => {
    expect(shouldEnableSentry("")).toBe(false);
    expect(shouldEnableSentry("   ")).toBe(false);
    expect(shouldEnableSentry(undefined)).toBe(false);
    expect(resolveSentryDsn({})).toBe("");
    expect(resolveSentryDsn({ SENTRY_DSN: "  " })).toBe("");
  });

  it("habilita solo con DSN no vacío", () => {
    // Armado en partes: evita literales con forma de credencial/DSN real.
    const fakeDsn = ["https://", "example.invalid", "/sentry-dsn"].join("");
    expect(shouldEnableSentry(fakeDsn)).toBe(true);
    expect(resolveSentryDsn({ SENTRY_DSN: ` ${fakeDsn} ` })).toBe(fakeDsn);
  });
});

describe("parseTracesSampleRate", () => {
  it("usa default bajo 0.1 si falta o es inválido", () => {
    expect(parseTracesSampleRate(undefined)).toBe(0.1);
    expect(parseTracesSampleRate("")).toBe(0.1);
    expect(parseTracesSampleRate("nope")).toBe(0.1);
    expect(parseTracesSampleRate("-1")).toBe(0.1);
  });

  it("acepta 0 y acota a 1", () => {
    expect(parseTracesSampleRate("0")).toBe(0);
    expect(parseTracesSampleRate("0.05")).toBe(0.05);
    expect(parseTracesSampleRate("2")).toBe(1);
  });
});

describe("resolveSentryEnvironment", () => {
  it("prioriza SENTRY_ENVIRONMENT y cae a NODE_ENV / workMode", () => {
    expect(
      resolveSentryEnvironment({ SENTRY_ENVIRONMENT: "staging" }, "PRODUCTION")
    ).toBe("staging");
    expect(resolveSentryEnvironment({ NODE_ENV: "production" })).toBe(
      "production"
    );
    expect(resolveSentryEnvironment({}, "PRODUCTION")).toBe("production");
    expect(resolveSentryEnvironment({})).toBe("development");
  });
});

describe("sin DSN no se llama Sentry.init", () => {
  it("instrument no inicializa si SENTRY_DSN está vacío", async () => {
    vi.resetModules();
    const prevDsn = process.env.SENTRY_DSN;
    const prevDebug = process.env.SENTRY_DEBUG;
    delete process.env.SENTRY_DSN;
    delete process.env.SENTRY_DEBUG;

    const init = vi.fn();
    const setupExpressErrorHandler = vi.fn();
    vi.doMock("@sentry/node", () => ({
      init,
      setupExpressErrorHandler,
    }));

    const mod = await import("../instrument.js");
    expect(mod.isSentryEnabled()).toBe(false);
    expect(init).not.toHaveBeenCalled();

    mod.registerSentryExpressErrorHandler({});
    expect(setupExpressErrorHandler).not.toHaveBeenCalled();

    if (prevDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = prevDsn;
    if (prevDebug === undefined) delete process.env.SENTRY_DEBUG;
    else process.env.SENTRY_DEBUG = prevDebug;
    vi.doUnmock("@sentry/node");
    vi.resetModules();
  });
});
