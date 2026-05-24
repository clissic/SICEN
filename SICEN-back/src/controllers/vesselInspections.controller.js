import { logger } from "../utils/logger.js";
import {
  createInspection,
  deleteInspectionById,
  findInspectionById,
  getInspectionStats,
  listInspectionsPaginated,
  listInspectionYears,
  updateInspectionById,
} from "../services/vesselInspections.service.js";

function handleError(res, e, fallbackMsg) {
  const code = e.status || e.statusCode || 500;
  if (code === 400 || code === 404 || code === 409) {
    return res.status(code).json({ ok: false, msg: e.message });
  }
  logger.error(fallbackMsg + ": " + (e?.message || e));
  return res.status(500).json({ ok: false, msg: fallbackMsg });
}

function parseBoolFlag(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (s === "" || s === "all") return undefined;
  if (["true", "1", "si", "sí", "yes"].includes(s)) return true;
  if (["false", "0", "no"].includes(s)) return false;
  return undefined;
}

/**
 * Cuando el request llega como `multipart/form-data` (porque hay PDF), los
 * campos vienen como strings: `deficiencies` se manda serializado en JSON y
 * los booleanos como `"true"/"false"`. Este helper normaliza los campos para
 * que el servicio pueda trabajar con el mismo shape que cuando llega JSON.
 */
function normalizeInspectionBody(body) {
  if (!body || typeof body !== "object") return body || {};
  const out = { ...body };
  if (typeof out.deficiencies === "string") {
    try {
      out.deficiencies = JSON.parse(out.deficiencies);
    } catch {
      out.deficiencies = [];
    }
  }
  if (typeof out.inspectionPerformed === "string") {
    out.inspectionPerformed = ["true", "1", "si", "sí", "yes"].includes(
      out.inspectionPerformed.trim().toLowerCase()
    );
  }
  if (typeof out.removeInspectionPDF === "string") {
    out.removeInspectionPDF = out.removeInspectionPDF.trim().toLowerCase() === "true";
  }
  return out;
}

export const vesselInspectionsController = {
  async create(req, res) {
    try {
      const body = normalizeInspectionBody(req.body);
      const inspection = await createInspection(body, req.user, req.file);
      return res.status(201).json({
        ok: true,
        msg: "Inspección registrada correctamente.",
        inspection,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo registrar la inspección.");
    }
  },

  async getById(req, res) {
    try {
      const inspection = await findInspectionById(req.params.id);
      return res.json({ ok: true, inspection });
    } catch (e) {
      return handleError(res, e, "No se pudo obtener la inspección.");
    }
  },

  async getStats(req, res) {
    try {
      const yearParam = req.query?.year;
      const year = Number(yearParam);
      if (!Number.isInteger(year) || year < 1900 || year > 9999) {
        return res
          .status(400)
          .json({ ok: false, msg: "Indique un año de ejercicio válido." });
      }
      const stats = await getInspectionStats({ year });
      return res.json({ ok: true, stats });
    } catch (e) {
      return handleError(
        res,
        e,
        "No se pudieron obtener las estadísticas de inspecciones."
      );
    }
  },

  async listYears(req, res) {
    try {
      const years = await listInspectionYears();
      return res.json({ ok: true, years });
    } catch (e) {
      return handleError(
        res,
        e,
        "No se pudieron obtener los años con inspecciones."
      );
    }
  },

  async listPaginated(req, res) {
    try {
      const {
        page,
        limit,
        vesselId,
        arrivalPort,
        inspectionPerformed,
        year,
        search,
        createdBy,
        inspectorEmail,
        inspectionDate,
        mine,
        includePlaceholders,
      } = req.query || {};

      /* `mine=true` significa "las inspecciones que YO hice", lo cual se
         resuelve contra el array `inspectors` (quien firmó la diligencia)
         y no contra `metadata.createdBy` (quien cargó el registro). Esto
         permite que el responsable real aparezca en su listado aunque el
         ingreso lo haya creado otro usuario. */
      const mineFlag = parseBoolFlag(mine);
      const effectiveInspectorEmail =
        mineFlag === true ? req.user?.email : inspectorEmail;

      const result = await listInspectionsPaginated({
        page,
        limit,
        vesselId,
        arrivalPort,
        inspectionPerformed: parseBoolFlag(inspectionPerformed),
        year,
        search,
        createdBy,
        inspectorEmail: effectiveInspectorEmail,
        inspectionDate,
        includePlaceholders: parseBoolFlag(includePlaceholders) === true,
      });
      return res.json({ ok: true, ...result });
    } catch (e) {
      return handleError(res, e, "No se pudieron listar las inspecciones.");
    }
  },

  async update(req, res) {
    try {
      const body = normalizeInspectionBody(req.body);
      const inspection = await updateInspectionById(
        req.params.id,
        body,
        req.user,
        req.file
      );
      return res.json({
        ok: true,
        msg: "Inspección actualizada correctamente.",
        inspection,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo actualizar la inspección.");
    }
  },

  async remove(req, res) {
    try {
      const result = await deleteInspectionById(req.params.id);
      return res.json({
        ok: true,
        msg: "Inspección eliminada correctamente.",
        deletedId: result.id,
      });
    } catch (e) {
      return handleError(res, e, "No se pudo eliminar la inspección.");
    }
  },
};
