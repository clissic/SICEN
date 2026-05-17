import { connect } from "mongoose";
import env from "../config/env.config.js";
import { ensureTitleCodeAllowsDuplicates } from "../DAO/models/mongoose/titles.mongoose.js";
import { logger } from "./logger.js";

const MONGO_PASSWORD = env.mongoPassword;
const dbName = "SIGMU_DB"

export async function connectMongo() {
  try {
    await connect(
      `mongodb+srv://joaquinperezcoria:${MONGO_PASSWORD}@cluster0.zye6fyd.mongodb.net/${dbName}?retryWrites=true&w=majority`
    );
    await ensureTitleCodeAllowsDuplicates();
    logger.info(`Plug to ${dbName} MONGO database!`);
  } catch (e) {
    logger.info(e);
    throw "Can not connect to the db";
  }
}