/**
 * Resolución de config Sentry (sin side-effects). Usado por instrument.js y tests.
 */

/**
 * @param {NodeJS.ProcessEnv | Record<string, string|undefined>} [env]
 * @returns {string} DSN trimmeado o ""
 */
export function resolveSentryDsn(env = process.env) {
  return String(env.SENTRY_DSN || "").trim();
}

/**
 * @param {string} dsn
 * @returns {boolean}
 */
export function shouldEnableSentry(dsn) {
  return Boolean(dsn && String(dsn).trim());
}

/**
 * @param {unknown} raw
 * @param {number} [fallback=0.1]
 * @returns {number}
 */
export function parseTracesSampleRate(raw, fallback = 0.1) {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return fallback;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  if (n > 1) return 1;
  return n;
}

/**
 * @param {NodeJS.ProcessEnv | Record<string, string|undefined>} [env]
 * @param {string} [workMode]
 * @returns {string}
 */
export function resolveSentryEnvironment(env = process.env, workMode) {
  const fromEnv = String(env.SENTRY_ENVIRONMENT || "").trim();
  if (fromEnv) return fromEnv;
  const nodeEnv = String(env.NODE_ENV || "").trim();
  if (nodeEnv) return nodeEnv;
  if (workMode === "PRODUCTION") return "production";
  return "development";
}
