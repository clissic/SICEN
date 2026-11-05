import { connect } from "mongoose";
import env from "../config/env.config.js";
import { ensureTitleCodeAllowsDuplicates } from "../DAO/models/mongoose/titles.mongoose.js";
import { logger } from "./logger.js";

const MISSING_MONGO_URI_MSG =
  "MongoDB sin configurar. Definí MONGO_URI con la URI completa de conexión.";

const MONGO_URI_SCHEME = /^mongodb(\+srv)?:\/\//i;

export function resolveMongoUri(mongoUri = env.mongoUri) {
  if (typeof mongoUri !== "string") return null;
  const uri = mongoUri.trim();
  if (!uri || !MONGO_URI_SCHEME.test(uri)) return null;
  return uri;
}

function failMissingMongoUri() {
  const isProduction =
    process.env.NODE_ENV === "production" || env.mode === "PRODUCTION";
  logger.error(MISSING_MONGO_URI_MSG);
  if (isProduction) {
    process.exit(1);
  }
  throw new Error(MISSING_MONGO_URI_MSG);
}

export async function connectMongo() {
  try {
    const uri = resolveMongoUri();
    if (!uri) {
      failMissingMongoUri();
    }
    await connect(uri);
    await ensureTitleCodeAllowsDuplicates();
    const dbName = uri.split("/").pop()?.split("?")[0] || "database";
    logger.info(`Conectado a MongoDB: ${dbName}`);
  } catch (e) {
    if (e && e.message === MISSING_MONGO_URI_MSG) {
      throw e;
    }
    logger.error(`Error conectando a MongoDB: ${e.message || e}`);
    throw new Error("No se pudo conectar a la base de datos");
  }
}
