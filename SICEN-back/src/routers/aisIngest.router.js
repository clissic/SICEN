import express from "express";
import { aisIngestController } from "../controllers/aisIngest.controller.js";
import { guarded } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * Rutas para consultar posiciones AIS desde el ingest NMEA (MongoDB).
 * Todas las rutas requieren autenticación (JWT Bearer).
 */

router.get("/positions", guarded, aisIngestController.positions);
router.post("/positions/bbox", guarded, aisIngestController.positionsInBbox);
router.get("/position/:mmsi", guarded, aisIngestController.positionByMmsi);
router.get("/stats", guarded, aisIngestController.stats);

export default router;
