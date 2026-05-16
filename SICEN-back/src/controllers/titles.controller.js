import { logger } from "../utils/logger.js";
import {
  createTitle,
  deleteTitleById,
  listTitlesPaginated,
  updateTitleById,
} from "../services/titles.service.js";

export const titlesController = {
  async list(req, res) {
    try {
      const payload = await listTitlesPaginated({
        page: req.query.page,
        pageSize: req.query.pageSize,
        q: req.query.q ?? "",
      });
      return res.json({ ok: true, ...payload });
    } catch (e) {
      logger.error("titles.list: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo listar el catálogo de títulos.",
      });
    }
  },

  async create(req, res) {
    try {
      const title = await createTitle(req.body || {}, req.user);
      return res.status(201).json({
        ok: true,
        msg: "Título agregado al catálogo.",
        title,
      });
    } catch (e) {
      const code = e.statusCode || 500;
      if (code === 400 || code === 409) {
        return res.status(code).json({ ok: false, msg: e.message });
      }
      logger.error("titles.create: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo crear el título en el catálogo.",
      });
    }
  },

  async update(req, res) {
    try {
      const title = await updateTitleById(
        req.params.id,
        req.body || {},
        req.user,
      );
      return res.json({
        ok: true,
        msg: "Título actualizado.",
        title,
      });
    } catch (e) {
      const code = e.statusCode || 500;
      if (code === 400 || code === 404 || code === 409) {
        return res.status(code).json({ ok: false, msg: e.message });
      }
      logger.error("titles.update: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo actualizar el título.",
      });
    }
  },

  async remove(req, res) {
    try {
      await deleteTitleById(req.params.id);
      return res.json({
        ok: true,
        msg: "Título eliminado del catálogo.",
      });
    } catch (e) {
      const code = e.statusCode || 500;
      if (code === 400) {
        return res.status(400).json({ ok: false, msg: e.message });
      }
      if (code === 404) {
        return res.status(404).json({ ok: false, msg: e.message });
      }
      logger.error("titles.remove: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo eliminar el título.",
      });
    }
  },
};
