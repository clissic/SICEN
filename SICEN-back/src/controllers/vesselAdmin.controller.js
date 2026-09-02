import { logger } from "../utils/logger.js";
import * as vesselAdminService from "../services/vesselAdmin.service.js";

function handleError(res, e, fallbackMsg) {
  const status = e?.status || 500;
  if (status >= 500) {
    logger.error(`vesselAdmin: ${e?.message || e}`);
  }
  return res.status(status).json({
    ok: false,
    msg: status < 500 ? e.message : fallbackMsg,
  });
}

export const vesselAdminController = {
  async searchClaim(req, res) {
    try {
      const data = await vesselAdminService.searchDeportivoForClaim(
        req.user,
        req.body || {}
      );
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo buscar el buque.");
    }
  },

  async myAdminStatus(req, res) {
    try {
      const data = await vesselAdminService.getSkipperVesselAdminStatus(
        req.user
      );
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo obtener el estado.");
    }
  },

  async requestAdmin(req, res) {
    try {
      const data = await vesselAdminService.requestVesselAdmin(req.user, {
        vesselId: req.body?.vesselId,
        unitAcronym: req.body?.unitAcronym,
        claimType: req.body?.claimType,
        proofFile: req.file,
      });
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo enviar la solicitud.");
    }
  },

  async cancelRequest(req, res) {
    try {
      const data = await vesselAdminService.cancelVesselAdminRequest(req.user, {
        requestId: req.body?.requestId,
      });
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo cancelar la solicitud.");
    }
  },

  async skipperUnlink(req, res) {
    try {
      const data = await vesselAdminService.skipperUnlinkFromVessel(req.user, {
        vesselId: req.body?.vesselId,
      });
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo desvincular el buque.");
    }
  },

  async listForVessel(req, res) {
    try {
      const data = await vesselAdminService.listVesselAdminRequests(
        req.params.vesselId,
        req.user
      );
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudieron cargar las solicitudes.");
    }
  },

  async approve(req, res) {
    try {
      const data = await vesselAdminService.approveVesselAdminRequest(
        req.params.id,
        req.user,
        { identityVerified: !!req.body?.identityVerified }
      );
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo aprobar la solicitud.");
    }
  },

  async reject(req, res) {
    try {
      const data = await vesselAdminService.rejectVesselAdminRequest(
        req.params.id,
        req.user,
        { reason: req.body?.reason }
      );
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo rechazar la solicitud.");
    }
  },

  async addAdministrator(req, res) {
    try {
      const data = await vesselAdminService.addVesselAdministrator(
        req.params.vesselId,
        req.user,
        {
          userId: req.body?.userId,
          claimType: req.body?.claimType,
        }
      );
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo agregar el administrador.");
    }
  },

  async removeAdministrator(req, res) {
    try {
      const data = await vesselAdminService.removeVesselAdministrator(
        req.params.vesselId,
        req.params.userId,
        req.user
      );
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo quitar el administrador.");
    }
  },

  async proofDocument(req, res) {
    try {
      const file = await vesselAdminService.getVesselAdminProofDocument(
        req.params.id,
        req.user
      );
      res.setHeader(
        "Content-Type",
        file.mimeType || "application/octet-stream"
      );
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(file.originalName)}"`
      );
      return res.sendFile(file.absolutePath);
    } catch (e) {
      return handleError(res, e, "No se pudo obtener el documento.");
    }
  },

  async previewToken(req, res) {
    try {
      const data = await vesselAdminService.previewVesselAdminEmailToken(
        req.query?.token,
        req.user
      );
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo validar el enlace.");
    }
  },
};
