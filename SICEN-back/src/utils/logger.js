import { existsSync } from "node:fs";
import winston from "winston";
import env from "../config/env.config.js";

export const LOGGER_ENVIRONMENT = env.loggerEnv;

const customLevelsOptions = {
  levels: {
    fatal: 0,
    error: 1,
    warning: 2,
    info: 3,
    debug: 4,
  },
  colors: {
    fatal: "red",
    error: "orange",
    warning: "yellow",
    info: "blue",
    debug: "white",
  },
};

export let logger;

function createSicenLogger(transports) {
  const instance = winston.createLogger({
    levels: customLevelsOptions.levels,
    transports,
  });
  // Los niveles custom solo definen `warning`; el código usa también `logger.warn`.
  instance.warn = instance.warning.bind(instance);
  return instance;
}

const colorizedConsole = new winston.transports.Console({
  level: "debug",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf((info) => {
      return `[${info.timestamp}] ${info.level}: ${info.message}`;
    })
  ),
});

const jsonConsole = new winston.transports.Console({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

/**
 * ¿Hay un runtime Docker? `/.dockerenv` lo crea el daemon.
 * Tests pueden inyectar `exists` para no tocar el filesystem real.
 */
export function isDockerRuntime(exists = existsSync) {
  try {
    return exists("/.dockerenv");
  } catch {
    return false;
  }
}

/**
 * Interpreta flags de entorno tipo 1/true/yes vs 0/false/no.
 * `undefined` = la variable no está definida o está vacía.
 */
export function parseBoolEnv(value) {
  if (value === undefined || value === null) return undefined;
  const raw = String(value).trim();
  if (raw === "") return undefined;
  if (/^(1|true|yes)$/i.test(raw)) return true;
  if (/^(0|false|no)$/i.test(raw)) return false;
  return undefined;
}

/**
 * Archivo solo si se pide explícitamente o si es producción local.
 * En contenedor (Docker/producción) el default es consola: el rootfs
 * es read-only y `docker logs` lee stdout/stderr.
 */
export function shouldLogToFile({
  logToFile = process.env.LOG_TO_FILE,
  loggerEnv = LOGGER_ENVIRONMENT,
  docker = isDockerRuntime(),
} = {}) {
  const explicit = parseBoolEnv(logToFile);
  if (explicit !== undefined) return explicit;
  if (docker) return false;
  return String(loggerEnv || "").toLowerCase() === "production";
}

function resolveLogFilePath(docker = isDockerRuntime()) {
  const fromEnv = String(process.env.LOG_FILE || "").trim();
  if (fromEnv) return fromEnv;
  // En contenedor, aunque se fuerce archivo, /tmp es tmpfs escribible.
  return docker ? "/tmp/errors.log" : "./errors.log";
}

function buildTransports({
  loggerEnv = LOGGER_ENVIRONMENT,
  logToFile = shouldLogToFile({ loggerEnv }),
  docker = isDockerRuntime(),
} = {}) {
  if (logToFile) {
    return [
      new winston.transports.File({
        filename: resolveLogFilePath(docker),
        level: "info",
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      }),
    ];
  }
  if (String(loggerEnv || "").toLowerCase() === "production" || docker) {
    return [jsonConsole];
  }
  return [colorizedConsole];
}

logger = createSicenLogger(buildTransports());
