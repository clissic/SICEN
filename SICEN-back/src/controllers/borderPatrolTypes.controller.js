import { logger } from "../utils/logger.js";
import {
  createBorderPatrolType,
  deleteBorderPatrolType,
  listBorderPatrolTypes,
  updateBorderPatrolType,
} from "../services/borderPatrolTypes.service.js";

function handleError(res, e, fallbackMsg) {
  const code = e.status || e.statusCode || 500;
  if (code === 400 || code === 403 || code === 404 || code === 409) {
    return res.status(code).json({ ok: false, msg: e.message });
  }
  logger.error(fallbackMsg + ": " + (e?.message || e));
  return res.status(500).json({ ok: false, msg: fallbackMsg });
}

export const borderPatrolTypesController = {
  async list(req, res) {
    try {
      const types = await listBorderPatrolTypes(
        req.query?.unitAcronym,
        req.user
      );
      return res.json({ ok: true, types });
    } catch (e) {
      return handleError(res, e, "No se pudieron listar las patrullas.");
    }
  },
  async create(req, res) {
    try {
      const type = await createBorderPatrolType(req.body || {}, req.user);
      return res.status(201).json({
        ok: true,
        msg: "Patrulla cargada.",
        type,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo cargar la patrulla.");
    }
  },
  async update(req, res) {
    try {
      const type = await updateBorderPatrolType(
        req.params.id,
        req.body || {},
        req.user
      );
      return res.json({ ok: true, msg: "Patrulla actualizada.", type });
    } catch (e) {
      return handleError(res, e, "No se pudo actualizar la patrulla.");
    }
  },
  async remove(req, res) {
    try {
      await deleteBorderPatrolType(req.params.id, req.user);
      return res.json({ ok: true, msg: "Patrulla eliminada." });
    } catch (e) {
      return handleError(res, e, "No se pudo eliminar la patrulla.");
    }
  },
};
