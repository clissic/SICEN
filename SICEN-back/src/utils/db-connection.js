import { connect } from "mongoose";
import env from "../config/env.config.js";
import { ensureTitleCodeAllowsDuplicates } from "../DAO/models/mongoose/titles.mongoose.js";
import { logger } from "./logger.js";

const MISSING_MONGO_URI_MSG =
  "MongoDB sin configurar. Definí MONGO_URI (host/esquema) y, si hace falta, MONGO_USER / MONGO_PASSWORD.";

const MONGO_URI_SCHEME = /^mongodb(\+srv)?:\/\//i;

function mongoUriHasUserinfo(uri) {
  const rest = uri.replace(/^mongodb(?:\+srv)?:\/\//i, "");
  const authority = rest.split("/")[0] ?? "";
  return authority.includes("@");
}

function injectMongoCredentials(uri, user, password) {
  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/)(.+)$/i);
  if (!match) return uri;
  const [, scheme, rest] = match;
  if (mongoUriHasUserinfo(uri)) return uri;
  const safeUser = encodeURIComponent(user);
  if (password) {
    return `${scheme}${safeUser}:${encodeURIComponent(password)}@${rest}`;
  }
  return `${scheme}${safeUser}@${rest}`;
}

/**
 * Resuelve la URI de Mongo.
 * Acepta un string (compat) o `{ mongoUri, mongoUser, mongoPassword }`.
 * Si la URI no trae userinfo y hay MONGO_USER, se inyectan las credenciales
 * (así los .env.example no pegan el patrón user:pass@ que marca GitGuardian).
 */
export function resolveMongoUri(mongoUri = env.mongoUri, credentials) {
  let uriInput = mongoUri;
  let user = credentials?.mongoUser ?? env.mongoUser;
  let password = credentials?.mongoPassword ?? env.mongoPassword;

  if (mongoUri && typeof mongoUri === "object" && !Array.isArray(mongoUri)) {
    uriInput = mongoUri.mongoUri ?? env.mongoUri;
    user = mongoUri.mongoUser ?? env.mongoUser;
    password = mongoUri.mongoPassword ?? env.mongoPassword;
  }

  if (typeof uriInput !== "string") return null;
  const uri = uriInput.trim();
  if (!uri || !MONGO_URI_SCHEME.test(uri)) return null;

  const trimmedUser = typeof user === "string" ? user.trim() : "";
  const trimmedPassword = typeof password === "string" ? password.trim() : "";
  if (!trimmedUser) return uri;
  return injectMongoCredentials(uri, trimmedUser, trimmedPassword);
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
