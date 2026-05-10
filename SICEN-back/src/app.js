import compression from "compression";
import cors from "cors";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import env from "./config/env.config.js";
import { logger } from "./utils/logger.js";
import { connectMongo } from "./utils/db-connection.js";
import { AVATARS_DIR, ensureAvatarsDirSync } from "./utils/avatarFiles.js";
import { usersRouter } from "./routes/users.router.js";
import { sessionsRouter } from "./routes/sessions.router.js";
import { carFinesRouter } from "./routes/carFines.router.js";
import { tokensRouter } from "./routes/tokens.router.js";
import { unitFilesRouter } from "./routes/unitFiles.router.js";
import { unitsRouter } from "./routes/units.router.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = env.port;
const MONGO_PASSWORD = env.mongoPassword;
const dbName = "SIGMU_DB";

const CLIENT_DIST = path.join(__dirname, "../public");

const httpServer = app.listen(PORT, () => {
  logger.info(`Servidor — http://localhost:${PORT}`);
  if (fs.existsSync(CLIENT_DIST)) {
    logger.info(`SPA (React) servida desde ${CLIENT_DIST}`);
  } else {
    logger.warn(
      "No hay build del front en /public. Ejecutá: cd SICEN-front && npm run build"
    );
  }
});

connectMongo();

const corsOrigins =
  process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) || [
    `http://localhost:${PORT}`,
    "http://127.0.0.1:" + PORT,
    "http://localhost:5173",
  ];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended: true }));

ensureAvatarsDirSync();
app.use("/uploads/avatars", express.static(AVATARS_DIR));

app.use("/api/users", usersRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/carFines", carFinesRouter);
app.use("/api/tokens", tokensRouter);
app.use("/api/unit-files", unitFilesRouter);
app.use("/api/units", unitsRouter);

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
}

app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ ok: false, msg: "Recurso no encontrado." });
  }
  return res.status(404).json({
    ok: false,
    msg:
      "Sin SPA en /public. Generá el front: cd SICEN-front && npm run build (o npm run build:client desde SICEN-back).",
  });
});
