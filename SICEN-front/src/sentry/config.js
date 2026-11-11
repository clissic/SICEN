/**
 * Resolución de config Sentry front (sin side-effects).
 */

/**
 * @param {Record<string, string|undefined>} [env]
 * @returns {string}
 */
export function resolveSentryDsn(env = {}) {
  return String(env.VITE_SENTRY_DSN || "").trim();
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
 * @param {Record<string, string|undefined>} [env]
 * @param {string} [modeFallback]
 * @returns {string}
 */
export function resolveSentryEnvironment(env = {}, modeFallback = "development") {
  const fromEnv = String(env.VITE_SENTRY_ENVIRONMENT || "").trim();
  if (fromEnv) return fromEnv;
  return String(modeFallback || "development");
}
