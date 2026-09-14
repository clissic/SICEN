import { logger } from "../utils/logger.js";
import {
  createMapZone,
  deleteMapZone,
  listMapZonesForUser,
  updateMapZone,
} from "../services/mapZones.service.js";

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

export const mapZonesController = {
  async list(req, res) {
    try {
      const result = await listMapZonesForUser(req.user);
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(res, e, "No se pudieron listar las zonas.");
    }
  },

  async create(req, res) {
    try {
      const zone = await createMapZone(req.user, req.body ?? {});
      return res.status(201).json({
        ok: true,
        msg: "Zona guardada.",
        zone,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo guardar la zona.");
    }
  },

  async update(req, res) {
    try {
      const zone = await updateMapZone(
        req.user,
        req.params.id,
        req.body ?? {}
      );
      return res.json({
        ok: true,
        msg: "Zona actualizada.",
        zone,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo actualizar la zona.");
    }
  },

  async remove(req, res) {
    try {
      await deleteMapZone(req.user, req.params.id);
      return res.json({ ok: true, msg: "Zona eliminada." });
    } catch (e) {
      return handleError(res, e, "No se pudo eliminar la zona.");
    }
  },
};
