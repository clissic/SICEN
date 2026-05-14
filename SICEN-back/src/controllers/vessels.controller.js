import { logger } from "../utils/logger.js";
import {
  addExtraCertificatePresetKey,
  createVesselInitial,
  deleteVesselByIdentifier,
  findVesselByIdentifier,
  listVesselsPaginated,
  normalizeVesselInitialPayload,
  updateVesselInitial,
  upsertVesselCertificate,
  vesselDocToFormPayload,
} from "../services/vessels.service.js";
import {
  VESSEL_CERTIFICATE_KEYS,
  normalizeCertificatePayload,
} from "../constants/vesselCertificates.js";
import { VESSEL_CERTIFICATE_OTHER_KEYS } from "../constants/vesselCertificateOtherKeys.js";

const VESSEL_TYPES = new Set(["Ultramar", "Cabotaje", "Deportivo"]);

const CLASSIFICATION_KINDS = new Set(["recognized", "flag"]);

const RECREATIONAL_DOC_TYPES = new Set([
  "Certificado de Construcción",
  "Registro de Embarcaciones Deportivas",
  "Matrícula de Cabotaje",
]);

/** Respuesta mínima del buque para la vista de certificados. */
function vesselCertificatesPayload(doc) {
  const o = doc && typeof doc === "object" ? doc : {};
  const certificates = Array.isArray(o.certificates) ? o.certificates : [];
  const extraCertificatePresetKeys = Array.isArray(o.extraCertificatePresetKeys)
    ? o.extraCertificatePresetKeys
        .map((k) => String(k ?? "").trim())
        .filter(Boolean)
    : [];
  return {
    id: o.id ?? null,
    _id: o._id,
    name: o.generalInfo?.name ?? "",
    certificates,
    extraCertificatePresetKeys,
  };
}

function validateSportGrossTonnage(gt, docLabel) {
  if (!Number.isFinite(gt)) {
    return "Indique un arqueo bruto válido (toneladas de arqueo).";
  }
  if (docLabel === "Certificado de Construcción") {
    if (gt < 0 || gt > 0.6 + 1e-9) {
      return "Con Certificado de Construcción, el arqueo bruto no puede superar 0,600 GT.";
    }
  } else if (docLabel === "Registro de Embarcaciones Deportivas") {
    if (gt < 0.601 - 1e-9 || gt > 6 + 1e-9) {
      return "Con Registro de Embarcaciones Deportivas, el arqueo bruto debe estar entre 0,601 y 6 GT.";
    }
  } else if (docLabel === "Matrícula de Cabotaje") {
    if (gt <= 6 + 1e-9) {
      return "Con Matrícula de Cabotaje (deportivo), el arqueo bruto debe ser mayor a 6 GT.";
    }
  }
  return null;
}

function validateVesselInitial(p) {
  if (!VESSEL_TYPES.has(p.vesselType)) {
    return "Seleccione un tipo de buque válido (Ultramar, Cabotaje o Deportivo).";
  }
  if (!p.name.trim()) {
    return "El nombre del buque es obligatorio.";
  }
  if (p.vesselType === "Ultramar") {
    if (!String(p.imoNumber).trim()) {
      return "El número OMI es obligatorio para buques de ultramar.";
    }
  }
  if (p.vesselType === "Cabotaje") {
    if (!String(p.nationalRegistryNumber).trim()) {
      return "La matrícula nacional es obligatoria para buques de cabotaje.";
    }
  }
  if (p.vesselType === "Deportivo") {
    if (!String(p.nationalRegistryNumber).trim()) {
      return "La matrícula es obligatoria para buques deportivos.";
    }
    if (!RECREATIONAL_DOC_TYPES.has(p.recreationalDocType)) {
      return "Seleccione el tipo de documentación del buque deportivo.";
    }
  }
  if (!p.flagState.trim()) return "El estado de bandera es obligatorio.";
  if (!p.portOfRegistry.trim()) return "El puerto de matrícula es obligatorio.";
  if (!p.shipType.trim()) return "El tipo de buque (información general) es obligatorio.";
  if (p.yearBuilt == null || !Number.isInteger(p.yearBuilt)) {
    return "Indique un año de construcción válido (número entero).";
  }
  if (p.yearBuilt < 1800 || p.yearBuilt > 2100) {
    return "El año de construcción debe estar entre 1800 y 2100.";
  }
  const numericFields = [
    ["grossTonnage", "Arqueo bruto"],
    ["netTonnage", "Arqueo neto"],
    ["deadweight", "Peso muerto"],
    ["lengthOverall", "Eslora total"],
    ["beam", "Manga"],
    ["draft", "Calado"],
  ];
  for (const [key, label] of numericFields) {
    if (!Number.isFinite(p[key])) {
      return `${label}: valor numérico obligatorio.`;
    }
  }
  if (p.vesselType === "Deportivo") {
    const gterr = validateSportGrossTonnage(p.grossTonnage, p.recreationalDocType);
    if (gterr) return gterr;
    if (!Number.isFinite(p.puntal) || p.puntal < 0) {
      return "El puntal debe ser un número mayor o igual a 0.";
    }
  }
  if (!p.owner.trim()) return "El propietario es obligatorio.";
  if (!p.operator.trim()) return "El operador es obligatorio.";
  if (p.vesselType !== "Deportivo") {
    if (!CLASSIFICATION_KINDS.has(p.classificationKind)) {
      return "Indique si la clasificación es por sociedad reconocida o por bandera.";
    }
    if (p.classificationKind === "recognized") {
      if (!String(p.classificationSociety).trim()) {
        return "Seleccione la sociedad de clasificación reconocida.";
      }
    }
    if (p.classificationKind === "flag") {
      if (!String(p.classificationFlagRegistry).trim()) {
        return "Seleccione el estado de registro (bandera) para la clasificación.";
      }
    }
  }
  if (!p.master.trim()) return "El capitán / master es obligatorio.";
  if (p.crewCapacity == null || p.crewCapacity < 0 || !Number.isInteger(p.crewCapacity)) {
    return "La capacidad de tripulación debe ser un entero mayor o igual a 0.";
  }
  return null;
}

function validateCertificateBody(body) {
  const p = normalizeCertificatePayload(body);
  if (!p.key) {
    return { err: "Seleccione el certificado a registrar.", payload: null };
  }
  if (!VESSEL_CERTIFICATE_KEYS.has(p.key)) {
    return { err: "Tipo de certificado no válido.", payload: null };
  }
  return { err: null, payload: p };
}

export const vesselsController = {
  async listPaginated(req, res) {
    try {
      const vesselType = String(req.query.vesselType || "").trim();
      if (!VESSEL_TYPES.has(vesselType)) {
        return res.status(400).json({
          ok: false,
          msg: "Seleccione Ultramar, Cabotaje o Deportivo para buscar.",
        });
      }

      const imoNumber =
        req.query.imoNumber != null ? String(req.query.imoNumber).trim() : "";
      const nationalRegistryNumber =
        req.query.nationalRegistryNumber != null
          ? String(req.query.nationalRegistryNumber).trim()
          : "";
      const portOfRegistry =
        req.query.portOfRegistry != null
          ? String(req.query.portOfRegistry).trim().toUpperCase()
          : "";
      const recreationalDocType =
        req.query.recreationalDocType != null
          ? String(req.query.recreationalDocType).trim()
          : "";

      if (vesselType === "Ultramar") {
        if (!imoNumber) {
          return res.status(400).json({
            ok: false,
            msg: "Ingrese el número OMI.",
          });
        }
      } else {
        if (vesselType === "Deportivo" && !RECREATIONAL_DOC_TYPES.has(recreationalDocType)) {
          return res.status(400).json({
            ok: false,
            msg: "Seleccione el tipo de documentación.",
          });
        }
        if (!nationalRegistryNumber) {
          return res.status(400).json({
            ok: false,
            msg:
              vesselType === "Cabotaje"
                ? "Ingrese la matrícula nacional."
                : "Ingrese el número de matrícula.",
          });
        }
        if (!portOfRegistry) {
          return res.status(400).json({
            ok: false,
            msg: "Ingrese el puerto de matrícula.",
          });
        }
      }

      const page = parseInt(req.query.currentPage, 10) || 1;
      const limit = parseInt(req.query.pageSize, 10) || 10;

      const result = await listVesselsPaginated({
        vesselType,
        imoNumber,
        nationalRegistryNumber,
        portOfRegistry,
        recreationalDocType:
          vesselType === "Deportivo" ? recreationalDocType : "",
        page,
        limit,
      });

      const paginatedVessels = result.docs.map((doc) => {
        const o = doc.toObject ? doc.toObject() : doc;
        return {
          _id: o._id,
          id: o.id,
          vesselType: o.vesselType,
          name: o.generalInfo?.name ?? "",
          owner: o.ownership?.owner ?? "",
          imoNumber: o.identification?.imoNumber ?? o.imoNumber ?? null,
          nationalRegistryNumber:
            o.identification?.nationalRegistryNumber ??
            o.nationalRegistryNumber ??
            null,
          portOfRegistry: o.generalInfo?.portOfRegistry ?? "",
          flagState: o.generalInfo?.flagState ?? "",
          shipType: o.generalInfo?.shipType ?? "",
          createdAt: o.createdAt,
        };
      });

      return res.status(200).json({
        status: "success",
        msg: "Buques",
        payload: {
          paginatedVessels,
          totalDocs: result.totalDocs,
          limit: result.limit,
          totalPages: result.totalPages,
          page: result.page,
          hasPrevPage: result.hasPrevPage,
          hasNextPage: result.hasNextPage,
          prevPage: result.prevPage,
          nextPage: result.nextPage,
          pagingCounter: result.pagingCounter,
        },
      });
    } catch (e) {
      logger.error("vessels.listPaginated: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudieron listar los buques.",
      });
    }
  },

  async getByBusinessId(req, res) {
    try {
      const vesselIdParam =
        req.params.vesselId != null ? String(req.params.vesselId).trim() : "";
      if (!vesselIdParam) {
        return res.status(400).json({
          ok: false,
          msg: "Indique el identificador del buque.",
        });
      }
      const doc = await findVesselByIdentifier(vesselIdParam);
      if (!doc) {
        return res.status(404).json({
          ok: false,
          msg: "Buque no encontrado.",
        });
      }
      return res.status(200).json({
        ok: true,
        vessel: vesselCertificatesPayload(doc),
      });
    } catch (e) {
      logger.error("vessels.getByBusinessId: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo obtener el buque.",
      });
    }
  },

  async getVesselForEdit(req, res) {
    try {
      const vesselIdParam =
        req.params.vesselId != null ? String(req.params.vesselId).trim() : "";
      if (!vesselIdParam) {
        return res.status(400).json({
          ok: false,
          msg: "Indique el identificador del buque.",
        });
      }
      const doc = await findVesselByIdentifier(vesselIdParam);
      if (!doc) {
        return res.status(404).json({
          ok: false,
          msg: "Buque no encontrado.",
        });
      }
      const form = vesselDocToFormPayload(doc);
      if (!form) {
        return res.status(500).json({
          ok: false,
          msg: "No se pudieron leer los datos del buque.",
        });
      }
      const businessId = doc.id != null && String(doc.id).trim() !== ""
        ? String(doc.id).trim()
        : String(doc._id);
      return res.status(200).json({
        ok: true,
        vesselId: businessId,
        form,
      });
    } catch (e) {
      logger.error("vessels.getVesselForEdit: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo obtener el buque para edición.",
      });
    }
  },

  async updateVessel(req, res) {
    try {
      const vesselIdParam =
        req.params.vesselId != null ? String(req.params.vesselId).trim() : "";
      if (!vesselIdParam) {
        return res.status(400).json({
          ok: false,
          msg: "Indique el identificador del buque.",
        });
      }
      const p = normalizeVesselInitialPayload(req.body || {});
      const err = validateVesselInitial(p);
      if (err) {
        return res.status(400).json({ ok: false, msg: err });
      }
      const updated = await updateVesselInitial(vesselIdParam, req.body || {});
      if (!updated) {
        return res.status(404).json({
          ok: false,
          msg: "Buque no encontrado.",
        });
      }
      const form = vesselDocToFormPayload(updated);
      return res.status(200).json({
        ok: true,
        msg: "Buque actualizado correctamente.",
        form: form ?? undefined,
      });
    } catch (e) {
      logger.error("vessels.updateVessel: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo guardar la modificación del buque.",
      });
    }
  },

  async deleteVessel(req, res) {
    try {
      const vesselIdParam =
        req.params.vesselId != null ? String(req.params.vesselId).trim() : "";
      if (!vesselIdParam) {
        return res.status(400).json({
          ok: false,
          msg: "Indique el identificador del buque.",
        });
      }
      const deleted = await deleteVesselByIdentifier(vesselIdParam);
      if (!deleted) {
        return res.status(404).json({
          ok: false,
          msg: "Buque no encontrado.",
        });
      }
      return res.status(200).json({
        ok: true,
        msg: "Buque eliminado correctamente.",
      });
    } catch (e) {
      logger.error("vessels.deleteVessel: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo eliminar el buque.",
      });
    }
  },

  async saveCertificate(req, res) {
    try {
      const vesselIdParam =
        req.params.vesselId != null ? String(req.params.vesselId).trim() : "";
      if (!vesselIdParam) {
        return res.status(400).json({
          ok: false,
          msg: "Indique el identificador del buque.",
        });
      }
      const { err, payload } = validateCertificateBody(req.body || {});
      if (err) {
        return res.status(400).json({ ok: false, msg: err });
      }
      const updated = await upsertVesselCertificate(vesselIdParam, payload);
      if (!updated) {
        return res.status(404).json({
          ok: false,
          msg: "Buque no encontrado.",
        });
      }
      return res.status(200).json({
        ok: true,
        msg: "Certificado guardado.",
        vessel: vesselCertificatesPayload(updated),
      });
    } catch (e) {
      logger.error("vessels.saveCertificate: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo guardar el certificado.",
      });
    }
  },

  async addExtraCertificatePreset(req, res) {
    try {
      const vesselIdParam =
        req.params.vesselId != null ? String(req.params.vesselId).trim() : "";
      if (!vesselIdParam) {
        return res.status(400).json({
          ok: false,
          msg: "Indique el identificador del buque.",
        });
      }
      const key = String(req.body?.key ?? "").trim();
      if (!key) {
        return res.status(400).json({
          ok: false,
          msg: "Seleccione un certificado de la lista.",
        });
      }
      if (!VESSEL_CERTIFICATE_OTHER_KEYS.has(key)) {
        return res.status(400).json({
          ok: false,
          msg: "Tipo de certificado adicional no válido.",
        });
      }
      const exists = await findVesselByIdentifier(vesselIdParam);
      if (!exists) {
        return res.status(404).json({
          ok: false,
          msg: "Buque no encontrado.",
        });
      }
      const updated = await addExtraCertificatePresetKey(vesselIdParam, key);
      if (!updated) {
        return res.status(404).json({
          ok: false,
          msg: "Buque no encontrado.",
        });
      }
      return res.status(200).json({
        ok: true,
        msg: "Certificado añadido a la lista.",
        vessel: vesselCertificatesPayload(updated),
      });
    } catch (e) {
      logger.error("vessels.addExtraCertificatePreset: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo actualizar la lista de certificados.",
      });
    }
  },

  async createInitial(req, res) {
    try {
      const p = normalizeVesselInitialPayload(req.body || {});
      const err = validateVesselInitial(p);
      if (err) {
        return res.status(400).json({ ok: false, msg: err });
      }
      const vessel = await createVesselInitial(p);
      const o = vessel.toObject ? vessel.toObject() : vessel;
      return res.status(201).json({
        ok: true,
        msg: "Buque registrado correctamente.",
        vessel: o,
      });
    } catch (e) {
      if (e?.code === 11000) {
        return res.status(409).json({
          ok: false,
          msg: "Ya existe un registro con ese identificador.",
        });
      }
      logger.error("vessels.createInitial: " + (e?.message || e));
      return res.status(500).json({
        ok: false,
        msg: "No se pudo registrar el buque.",
      });
    }
  },
};
