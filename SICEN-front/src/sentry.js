/**
 * Sentry (React) — init desde variables Vite.
 * Sin `VITE_SENTRY_DSN` no se inicializa; la app funciona igual.
 */
import * as Sentry from "@sentry/react";
import {
  parseTracesSampleRate,
  resolveSentryDsn,
  resolveSentryEnvironment,
  shouldEnableSentry,
} from "./sentry/config.js";
import { beforeBreadcrumb, beforeSend } from "./sentry/scrubEvent.js";

let sentryEnabled = false;

/**
 * Inicializa Sentry si hay DSN. Idempotente.
 * @returns {boolean} true si quedó habilitado
 */
export function initSentry() {
  if (sentryEnabled) return true;

  const env = import.meta.env || {};
  const dsn = resolveSentryDsn({
    VITE_SENTRY_DSN: env.VITE_SENTRY_DSN,
  });

  if (!shouldEnableSentry(dsn)) {
    if (String(env.VITE_SENTRY_DEBUG || "").trim() === "1") {
      console.debug("[sentry] VITE_SENTRY_DSN vacío — Sentry no inicializado");
    }
    return false;
  }

  Sentry.init({
    dsn,
    environment: resolveSentryEnvironment(
      { VITE_SENTRY_ENVIRONMENT: env.VITE_SENTRY_ENVIRONMENT },
      env.MODE || "development"
    ),
    sendDefaultPii: false,
    tracesSampleRate: parseTracesSampleRate(env.VITE_SENTRY_TRACES_SAMPLE_RATE),
    beforeSend,
    beforeBreadcrumb,
    // Sin Session Replay (datos sensibles de Prefectura).
  });

  sentryEnabled = true;
  return true;
}

export function isSentryEnabled() {
  return sentryEnabled;
}

/** Re-export para el ErrorBoundary en el entrypoint. */
export { Sentry };
