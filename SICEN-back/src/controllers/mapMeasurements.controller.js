import { logger } from "../utils/logger.js";
import {
  createMapMeasurement,
  deleteMapMeasurement,
  listMapMeasurementsForUser,
  updateMapMeasurement,
} from "../services/mapMeasurements.service.js";

function handleError(res, e, fallbackMsg) {
  const code = e.status || e.statusCode || 500;
  if (
    code === 400 ||
    code === 401 ||
    code === 403 ||
    code === 404 ||
    code === 409
  ) {
    return res.status(code).json({ ok: false, msg: e.message });
  }
  logger.error(fallbackMsg + ": " + (e?.message || e));
  return res.status(500).json({ ok: false, msg: fallbackMsg });
}

export const mapMeasurementsController = {
  async list(req, res) {
    try {
      const result = await listMapMeasurementsForUser(req.user);
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(res, e, "No se pudieron listar las mediciones.");
    }
  },

  async create(req, res) {
    try {
      const measurement = await createMapMeasurement(req.user, req.body ?? {});
      return res.status(201).json({
        ok: true,
        msg: "Medición guardada.",
        measurement,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo guardar la medición.");
    }
  },

  async update(req, res) {
    try {
      const measurement = await updateMapMeasurement(
        req.user,
        req.params.id,
        req.body ?? {}
      );
      return res.json({
        ok: true,
        msg: "Medición actualizada.",
        measurement,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo actualizar la medición.");
    }
  },

  async remove(req, res) {
    try {
      await deleteMapMeasurement(req.user, req.params.id);
      return res.json({ ok: true, msg: "Medición eliminada." });
    } catch (e) {
      return handleError(res, e, "No se pudo eliminar la medición.");
    }
  },
};
