import { logger } from "../utils/logger.js";
import {
  createBorderPatrol,
  deleteBorderPatrol,
  listBorderPatrolsByMonth,
  updateBorderPatrolStatus,
} from "../services/borderPatrols.service.js";

function handleError(res, e, fallbackMsg) {
  const code = e.status || e.statusCode || 500;
  if (code === 400 || code === 403 || code === 404 || code === 409) {
    return res.status(code).json({ ok: false, msg: e.message });
  }
  logger.error(fallbackMsg + ": " + (e?.message || e));
  return res.status(500).json({ ok: false, msg: fallbackMsg });
}

export const borderPatrolsController = {
  async listByMonth(req, res) {
    try {
      const patrols = await listBorderPatrolsByMonth(req.query || {}, req.user);
      return res.json({ ok: true, patrols });
    } catch (e) {
      return handleError(res, e, "No se pudieron listar las patrullas.");
    }
  },
  async create(req, res) {
    try {
      const patrol = await createBorderPatrol(req.body || {}, req.user);
      return res.status(201).json({
        ok: true,
        msg: "Patrulla planificada.",
        patrol,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo asignar la patrulla.");
    }
  },
  async updateStatus(req, res) {
    try {
      const patrol = await updateBorderPatrolStatus(
        req.params.id,
        req.body || {},
        req.user
      );
      return res.json({
        ok: true,
        msg: "Patrulla actualizada.",
        patrol,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo actualizar el estado.");
    }
  },
  async remove(req, res) {
    try {
      const patrol = await deleteBorderPatrol(req.params.id, req.user);
      return res.json({
        ok: true,
        msg: "Patrulla eliminada.",
        deletedId: String(patrol._id),
      });
    } catch (e) {
      return handleError(res, e, "No se pudo eliminar la patrulla.");
    }
  },
};
