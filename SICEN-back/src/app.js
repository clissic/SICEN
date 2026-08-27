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
import {
  CAR_FINE_PROVES_DIR,
  ensureCarFineProvesDirSync,
} from "./utils/carFineProveFiles.js";
import {
  SHIP_FINE_PROVES_DIR,
  ensureShipFineProvesDirSync,
} from "./utils/shipFineProveFiles.js";
import {
  PERSONAL_FINE_PROVES_DIR,
  ensurePersonalFineProvesDirSync,
} from "./utils/personalFineProveFiles.js";
import {
  INSPECTION_PDFS_DIR,
  ensureInspectionPdfsDirSync,
} from "./utils/inspectionPDFFiles.js";
import { usersRouter } from "./routes/users.router.js";
import { sessionsRouter } from "./routes/sessions.router.js";
import { carFinesRouter } from "./routes/carFines.router.js";
import { shipFinesRouter } from "./routes/shipFines.router.js";
import { personalFinesRouter } from "./routes/personalFines.router.js";
import { tokensRouter } from "./routes/tokens.router.js";
import { unitFilesRouter } from "./routes/unitFiles.router.js";
import { unitsRouter } from "./routes/units.router.js";
import { vesselsRouter } from "./routes/vessels.router.js";
import { vesselInspectionsRouter } from "./routes/vesselInspections.router.js";
import { seafarersRouter } from "./routes/seafarers.router.js";
import { licencesRouter } from "./routes/licences.router.js";
import { titlesRouter } from "./routes/titles.router.js";
import { sportMovementsRouter } from "./routes/sportMovements.router.js";
import { notificationsRouter } from "./routes/notifications.router.js";
import { aisRouter } from "./routes/ais.router.js";
import { windRouter } from "./routes/wind.router.js";
import { currentsRouter } from "./routes/currents.router.js";
import { wavesRouter } from "./routes/waves.router.js";
import { bathymetryRouter } from "./routes/bathymetry.router.js";
import { warmAisBridge } from "./services/aisBridge.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = env.port;
const MONGO_PASSWORD = env.mongoPassword;
const dbName = "SIGMU_DB";

const CLIENT_DIST = path.join(__dirname, "../public");
const CLIENT_INDEX = path.join(CLIENT_DIST, "index.html");
/** Solo montamos la SPA si el build generó index.html (evita ENOENT si /public quedó vacío). */
const hasSpaBuild = fs.existsSync(CLIENT_INDEX);

const httpServer = app.listen(PORT, () => {
  logger.info(`Servidor — http://localhost:${PORT}`);
  if (hasSpaBuild) {
    logger.info(`SPA (React) servida desde ${CLIENT_DIST}`);
  } else if (fs.existsSync(CLIENT_DIST)) {
    logger.warn(
      "Carpeta /public sin index.html (build incompleto o fallido). Ejecutá: cd SICEN-front && npm run build"
    );
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

app.use(
  compression({
    filter(req, res) {
      if (req.originalUrl?.startsWith("/api/ais/stream")) return false;
      return compression.filter(req, res);
    },
  })
);
app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended: true }));

ensureAvatarsDirSync();
app.use("/uploads/avatars", express.static(AVATARS_DIR));

ensureCarFineProvesDirSync();
app.use("/uploads/carFineProves", express.static(CAR_FINE_PROVES_DIR));

ensureShipFineProvesDirSync();
app.use("/uploads/shipFineProves", express.static(SHIP_FINE_PROVES_DIR));

ensurePersonalFineProvesDirSync();
app.use(
  "/uploads/personalFineProves",
  express.static(PERSONAL_FINE_PROVES_DIR)
);

ensureInspectionPdfsDirSync();
app.use("/uploads/inspectionsERP", express.static(INSPECTION_PDFS_DIR));

app.use("/api/users", usersRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/carFines", carFinesRouter);
app.use("/api/shipFines", shipFinesRouter);
app.use("/api/personalFines", personalFinesRouter);
app.use("/api/tokens", tokensRouter);
app.use("/api/unit-files", unitFilesRouter);
app.use("/api/units", unitsRouter);
app.use("/api/vessels", vesselsRouter);
app.use("/api/vesselInspections", vesselInspectionsRouter);
app.use("/api/seafarers", seafarersRouter);
app.use("/api/licences", licencesRouter);
app.use("/api/titles", titlesRouter);
app.use("/api/sportMovements", sportMovementsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/ais", aisRouter);
app.use("/api/wind", windRouter);
app.use("/api/currents", currentsRouter);
app.use("/api/waves", wavesRouter);
app.use("/api/bathymetry", bathymetryRouter);

warmAisBridge();


if (hasSpaBuild) {
  app.use(express.static(CLIENT_DIST));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    /* Si falta el build (no hay /assets/*.js), express.static no sirve el archivo y
       este fallback enviaba index.html → el navegador esperaba JS y recibía HTML (MIME). */
    if (
      req.path.startsWith("/assets/") ||
      /\.(?:js|mjs|css|map)$/i.test(req.path)
    ) {
      return res
        .status(404)
        .type("text/plain")
        .send(
          "Recurso estático no encontrado. Genere el front: cd SICEN-front && npm run build"
        );
    }
    res.sendFile(CLIENT_INDEX, (err) => {
      if (err) {
        logger.error(`Error al servir SPA: ${err.message}`);
        return res
          .status(503)
          .type("text/plain")
          .send(
            "La aplicación no está disponible. Genere el front: cd SICEN-front && npm run build"
          );
      }
    });
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
