import { connect } from "mongoose";
import env from "../config/env.config.js";
import { ensureTitleCodeAllowsDuplicates } from "../DAO/models/mongoose/titles.mongoose.js";
import { logger } from "./logger.js";

function getMongoUri() {
  if (process.env.MONGO_URI) {
    return process.env.MONGO_URI;
  }

  const MONGO_PASSWORD = env.mongoPassword;
  if (!MONGO_PASSWORD) {
    if (process.env.NODE_ENV === "production" || env.mode === "PRODUCTION") {
      logger.error(
        "Configuración MongoDB faltante. Definí MONGO_URI o MONGODB_PASSWORD en .env.production"
      );
      process.exit(1);
    }
    throw new Error(
      "MongoDB sin configurar. Definí MONGO_URI o MONGODB_PASSWORD en .env"
    );
  }

  const dbName = "SIGMU_DB";
  return `mongodb+srv://joaquinperezcoria:${MONGO_PASSWORD}@cluster0.zye6fyd.mongodb.net/${dbName}?retryWrites=true&w=majority`;
}

export async function connectMongo() {
  try {
    const uri = getMongoUri();
    await connect(uri);
    await ensureTitleCodeAllowsDuplicates();
    const dbName = uri.split("/").pop()?.split("?")[0] || "database";
    logger.info(`Conectado a MongoDB: ${dbName}`);
  } catch (e) {
    logger.error(`Error conectando a MongoDB: ${e.message || e}`);
    throw new Error("No se pudo conectar a la base de datos");
  }
}