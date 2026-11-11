/**
 * Sentry — inicialización temprana (antes de Express).
 *
 * Cargar con `node --import ./src/instrument.js` (recomendado ESM) y/o como
 * primer import de `app.js`. Si `SENTRY_DSN` falta o está vacío, no se llama
 * a Sentry.init y la app sigue igual (sin ruido).
 *
 * No importar `env.config.js` aquí: ese módulo valida secretos y puede
 * terminar el proceso; solo leemos process.env (+ dotenv liviano).
 */
import dotenv from "dotenv";
import * as Sentry from "@sentry/node";
import {
  parseTracesSampleRate,
  resolveSentryDsn,
  resolveSentryEnvironment,
  shouldEnableSentry,
} from "./sentry/config.js";
import { beforeBreadcrumb, beforeSend } from "./sentry/scrubEvent.js";

function resolveWorkMode() {
  const idx = process.argv.indexOf("--mode");
  if (idx >= 0 && process.argv[idx + 1]) {
    return String(process.argv[idx + 1]).toUpperCase();
  }
  if (String(process.env.NODE_ENV || "").toLowerCase() === "production") {
    return "PRODUCTION";
  }
  return "DEVELOPMENT";
}

dotenv.config({
  path:
    resolveWorkMode() === "DEVELOPMENT"
      ? "./.env.development"
      : "./.env.production",
  quiet: true,
});

const workMode = resolveWorkMode();
const dsn = resolveSentryDsn(process.env);
let sentryEnabled = false;

if (shouldEnableSentry(dsn)) {
  Sentry.init({
    dsn,
    environment: resolveSentryEnvironment(process.env, workMode),
    sendDefaultPii: false,
    tracesSampleRate: parseTracesSampleRate(
      process.env.SENTRY_TRACES_SAMPLE_RATE
    ),
    beforeSend,
    beforeBreadcrumb,
  });
  sentryEnabled = true;
} else if (String(process.env.SENTRY_DEBUG || "").trim() === "1") {
  // Solo con flag explícito: evita warnings ruidosos en local/CI sin DSN.
  console.debug("[sentry] SENTRY_DSN vacío — Sentry no inicializado");
}

/**
 * ¿Se llamó a Sentry.init con DSN?
 * @returns {boolean}
 */
export function isSentryEnabled() {
  return sentryEnabled;
}

/**
 * Registra el error handler de Sentry para Express (después de las rutas,
 * antes de los handlers de error propios). No-op si no hay DSN.
 * @param {import("express").Express} app
 */
export function registerSentryExpressErrorHandler(app) {
  if (!sentryEnabled) return;
  Sentry.setupExpressErrorHandler(app);
}
