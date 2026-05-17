import { logger } from "../utils/logger.js";
import {
  addSeafarerCourse,
  addSeafarerHeldLicense,
  addSeafarerLicense,
  addSeafarerObservation,
  addSeafarerSanction,
  addSeafarerTitle,
  createSeafarer,
  deleteSeafarerHeldLicense,
  deleteSeafarerHeldTitle,
  findSeafarerByDocument,
  updateSeafarerHeldLicense,
  updateSeafarerHeldTitle,
} from "../services/seafarers.service.js";
import {
  aggregateSeafarerCourses,
  aggregateSeafarerSanctions,
} from "../services/seafarersMetadata.service.js";

function handleError(res, e, fallbackMsg) {
  const code = e.statusCode || 500;
  if (code === 400 || code === 404 || code === 409) {
    return res.status(code).json({ ok: false, msg: e.message });
  }
  logger.error(fallbackMsg + ": " + (e?.message || e));
  return res.status(500).json({ ok: false, msg: fallbackMsg });
}

export const seafarersController = {
  async create(req, res) {
    try {
      const seafarer = await createSeafarer(req.body || {}, req.user);
      return res.status(201).json({
        ok: true,
        msg: "Registro de gente de mar creado correctamente.",
        seafarer,
      });
    } catch (e) {
      return handleError(
        res,
        e,
        "No se pudo crear el registro de gente de mar.",
      );
    }
  },

  async findByDocument(req, res) {
    try {
      const documentType = req.query.documentType ?? req.query.type ?? "";
      const documentNumber =
        req.query.documentNumber ?? req.query.number ?? "";
      const ccSeries = req.query.ccSeries ?? "";
      const ccNumber = req.query.ccNumber ?? "";
      const seafarer = await findSeafarerByDocument(
        documentType,
        documentNumber,
        ccSeries,
        ccNumber,
      );
      return res.json({ ok: true, seafarer });
    } catch (e) {
      return handleError(res, e, "No se pudo consultar el registro.");
    }
  },

  async metadataCourses(req, res) {
    try {
      const payload = await aggregateSeafarerCourses({
        page: req.query.page,
        pageSize: req.query.pageSize,
        q: req.query.q ?? "",
      });
      return res.json({ ok: true, ...payload });
    } catch (e) {
      logger.error("seafarers.metadataCourses: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo listar los cursos.",
      });
    }
  },

  async metadataSanctions(req, res) {
    try {
      const payload = await aggregateSeafarerSanctions({
        page: req.query.page,
        pageSize: req.query.pageSize,
        q: req.query.q ?? "",
      });
      return res.json({ ok: true, ...payload });
    } catch (e) {
      logger.error("seafarers.metadataSanctions: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo listar las sanciones.",
      });
    }
  },

  async updateHeldTitle(req, res) {
    try {
      const entry = req.body?.entry ?? req.body ?? {};
      const seafarer = await updateSeafarerHeldTitle(
        req.params.id,
        req.params.entryId,
        entry,
        req.user,
      );
      return res.json({
        ok: true,
        msg: "Título actualizado correctamente.",
        seafarer,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo actualizar el título.");
    }
  },

  async removeHeldTitle(req, res) {
    try {
      const seafarer = await deleteSeafarerHeldTitle(
        req.params.id,
        req.params.entryId,
        req.user,
      );
      return res.json({
        ok: true,
        msg: "Título eliminado correctamente.",
        seafarer,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo eliminar el título.");
    }
  },

  async addTitle(req, res) {
    try {
      const entry = req.body?.entry ?? req.body ?? {};
      const seafarer = await addSeafarerTitle(req.params.id, entry, req.user);
      return res.status(201).json({
        ok: true,
        msg: "Título agregado correctamente.",
        seafarer,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo agregar el título.");
    }
  },

  async addHeldLicense(req, res) {
    try {
      const entry = req.body?.entry ?? req.body ?? {};
      const seafarer = await addSeafarerHeldLicense(
        req.params.id,
        entry,
        req.user,
      );
      return res.status(201).json({
        ok: true,
        msg: "Licencia agregada correctamente.",
        seafarer,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo agregar la licencia.");
    }
  },

  async updateHeldLicense(req, res) {
    try {
      const entry = req.body?.entry ?? req.body ?? {};
      const seafarer = await updateSeafarerHeldLicense(
        req.params.id,
        req.params.entryId,
        entry,
        req.user,
      );
      return res.json({
        ok: true,
        msg: "Licencia actualizada correctamente.",
        seafarer,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo actualizar la licencia.");
    }
  },

  async removeHeldLicense(req, res) {
    try {
      const seafarer = await deleteSeafarerHeldLicense(
        req.params.id,
        req.params.entryId,
        req.user,
      );
      return res.json({
        ok: true,
        msg: "Licencia eliminada correctamente.",
        seafarer,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo eliminar la licencia.");
    }
  },

  async addLicense(req, res) {
    try {
      const { bucket, entry } = req.body || {};
      const seafarer = await addSeafarerLicense(
        req.params.id,
        bucket,
        entry,
        req.user,
      );
      return res.status(201).json({
        ok: true,
        msg: "Título o licencia agregado correctamente.",
        seafarer,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo agregar el título o licencia.");
    }
  },

  async addCourse(req, res) {
    try {
      const entry = req.body?.entry ?? req.body ?? {};
      const seafarer = await addSeafarerCourse(
        req.params.id,
        entry,
        req.user,
      );
      return res.status(201).json({
        ok: true,
        msg: "Curso agregado correctamente.",
        seafarer,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo agregar el curso.");
    }
  },

  async addSanction(req, res) {
    try {
      const entry = req.body?.entry ?? req.body ?? {};
      const seafarer = await addSeafarerSanction(
        req.params.id,
        entry,
        req.user,
      );
      return res.status(201).json({
        ok: true,
        msg: "Sanción agregada correctamente.",
        seafarer,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo agregar la sanción.");
    }
  },

  async addObservation(req, res) {
    try {
      const entry = req.body?.entry ?? req.body ?? {};
      const seafarer = await addSeafarerObservation(
        req.params.id,
        entry,
        req.user,
      );
      return res.status(201).json({
        ok: true,
        msg: "Observación agregada correctamente.",
        seafarer,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo agregar la observación.");
    }
  },
};
