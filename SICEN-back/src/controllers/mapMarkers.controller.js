import { logger } from "../utils/logger.js";
import {
  createMapMarker,
  deleteMapMarker,
  listMapMarkersForUser,
  updateMapMarker,
} from "../services/mapMarkers.service.js";

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

export const mapMarkersController = {
  async list(req, res) {
    try {
      const result = await listMapMarkersForUser(req.user);
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(res, e, "No se pudieron listar los marcadores.");
    }
  },

  async create(req, res) {
    try {
      const marker = await createMapMarker(req.user, req.body ?? {});
      return res.status(201).json({
        ok: true,
        msg: "Marcador guardado.",
        marker,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo guardar el marcador.");
    }
  },

  async update(req, res) {
    try {
      const marker = await updateMapMarker(
        req.user,
        req.params.id,
        req.body ?? {}
      );
      return res.json({
        ok: true,
        msg: "Marcador actualizado.",
        marker,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo actualizar el marcador.");
    }
  },

  async remove(req, res) {
    try {
      await deleteMapMarker(req.user, req.params.id);
      return res.json({ ok: true, msg: "Marcador eliminado." });
    } catch (e) {
      return handleError(res, e, "No se pudo eliminar el marcador.");
    }
  },
};
