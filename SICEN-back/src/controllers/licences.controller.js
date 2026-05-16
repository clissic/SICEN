import { logger } from "../utils/logger.js";
import {
  createLicence,
  deleteLicenceById,
  listLicencesPaginated,
  updateLicenceById,
} from "../services/licences.service.js";

export const licencesController = {
  async list(req, res) {
    try {
      const payload = await listLicencesPaginated({
        page: req.query.page,
        pageSize: req.query.pageSize,
        q: req.query.q ?? "",
        catalogueKind: req.query.kind,
      });
      return res.json({ ok: true, ...payload });
    } catch (e) {
      logger.error("licences.list: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo listar el catálogo de licencias.",
      });
    }
  },

  async create(req, res) {
    try {
      const licence = await createLicence(req.body || {}, req.user);
      return res.status(201).json({
        ok: true,
        msg: "Título o licencia agregado al catálogo.",
        licence,
      });
    } catch (e) {
      const code = e.statusCode || 500;
      if (code === 400) {
        return res.status(400).json({ ok: false, msg: e.message });
      }
      logger.error("licences.create: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo crear el registro en el catálogo.",
      });
    }
  },

  async update(req, res) {
    try {
      const licence = await updateLicenceById(
        req.params.id,
        req.body || {},
        req.user,
      );
      return res.json({
        ok: true,
        msg: "Registro actualizado.",
        licence,
      });
    } catch (e) {
      const code = e.statusCode || 500;
      if (code === 400) {
        return res.status(400).json({ ok: false, msg: e.message });
      }
      if (code === 404) {
        return res.status(404).json({ ok: false, msg: e.message });
      }
      logger.error("licences.update: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo actualizar el registro del catálogo.",
      });
    }
  },

  async remove(req, res) {
    try {
      await deleteLicenceById(req.params.id);
      return res.json({
        ok: true,
        msg: "Registro eliminado del catálogo.",
      });
    } catch (e) {
      const code = e.statusCode || 500;
      if (code === 400) {
        return res.status(400).json({ ok: false, msg: e.message });
      }
      if (code === 404) {
        return res.status(404).json({ ok: false, msg: e.message });
      }
      logger.error("licences.remove: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo eliminar el registro del catálogo.",
      });
    }
  },
};
