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

const developmentTransports = [
  new winston.transports.Console({
    level: "debug",
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf((info) => {
        return `[${info.timestamp}] ${info.level}: ${info.message}`;
      })
    ),
  }),
];

switch (LOGGER_ENVIRONMENT) {
  case "production":
    logger = createSicenLogger([
      new winston.transports.File({
        filename: "./errors.log",
        level: "info",
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      }),
    ]);
    break;

  case "development":
    logger = createSicenLogger(developmentTransports);
    break;
  default:
    logger = createSicenLogger(developmentTransports);
    break;
}