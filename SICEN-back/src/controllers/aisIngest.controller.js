import {
  getAisIngestStats,
  getAisPositionByMmsi,
  getAisPositions,
  getAisPositionsInBbox,
  transformAisPosition,
} from "../services/aisIngest.service.js";
import { logger } from "../utils/logger.js";

function handleError(res, e, fallbackMsg) {
  const code = e.status || e.statusCode || 500;
  if (code === 400 || code === 403 || code === 404 || code === 409) {
    return res.status(code).json({ ok: false, msg: e.message });
  }
  logger.error(fallbackMsg + ": " + (e?.message || e));
  return res.status(500).json({ ok: false, msg: fallbackMsg });
}

export const aisIngestController = {
  /**
   * GET /api/ais/ingest/positions
   * Lista posiciones AIS recientes desde MongoDB.
   */
  async positions(req, res) {
    try {
      const maxAgeMinutes = parseInt(req.query.maxAgeMinutes) || 60;
      const limit = parseInt(req.query.limit) || 500;

      const positions = await getAisPositions({ maxAgeMinutes, limit });

      return res.json({
        ok: true,
        positions: positions.map(transformAisPosition),
        count: positions.length,
      });
    } catch (e) {
      return handleError(
        res,
        e,
        "No se pudieron obtener las posiciones AIS."
      );
    }
  },

  /**
   * POST /api/ais/ingest/positions/bbox
   * Lista posiciones AIS dentro de un bounding box.
   * Body: { minLat, maxLat, minLon, maxLon }
   */
  async positionsInBbox(req, res) {
    try {
      const { minLat, maxLat, minLon, maxLon } = req.body;

      if (
        typeof minLat !== "number" ||
        typeof maxLat !== "number" ||
        typeof minLon !== "number" ||
        typeof maxLon !== "number"
      ) {
        return res.status(400).json({
          ok: false,
          msg: "Se requieren minLat, maxLat, minLon, maxLon como números.",
        });
      }

      const maxAgeMinutes = parseInt(req.body.maxAgeMinutes) || 60;
      const limit = parseInt(req.body.limit) || 500;

      const positions = await getAisPositionsInBbox(
        { minLat, maxLat, minLon, maxLon },
        { maxAgeMinutes, limit }
      );

      return res.json({
        ok: true,
        positions: positions.map(transformAisPosition),
        count: positions.length,
      });
    } catch (e) {
      return handleError(
        res,
        e,
        "No se pudieron obtener las posiciones AIS en bbox."
      );
    }
  },

  /**
   * GET /api/ais/ingest/position/:mmsi
   * Obtiene la última posición de un buque por MMSI.
   */
  async positionByMmsi(req, res) {
    try {
      const { mmsi } = req.params;

      if (!mmsi) {
        return res.status(400).json({
          ok: false,
          msg: "Se requiere MMSI.",
        });
      }

      const position = await getAisPositionByMmsi(mmsi);

      if (!position) {
        return res.status(404).json({
          ok: false,
          msg: `No se encontró posición para MMSI ${mmsi}.`,
        });
      }

      return res.json({
        ok: true,
        position: transformAisPosition(position),
      });
    } catch (e) {
      return handleError(
        res,
        e,
        "No se pudo obtener la posición del buque."
      );
    }
  },

  /**
   * GET /api/ais/ingest/stats
   * Estadísticas del servicio de ingest.
   */
  async stats(req, res) {
    try {
      const stats = await getAisIngestStats();

      return res.json({
        ok: true,
        stats,
      });
    } catch (e) {
      return handleError(
        res,
        e,
        "No se pudieron obtener las estadísticas del ingest."
      );
    }
  },
};
