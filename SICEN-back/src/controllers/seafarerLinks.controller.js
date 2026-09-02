import { logger } from "../utils/logger.js";
import * as seafarerLinksService from "../services/seafarerLinks.service.js";

function handleError(res, e, fallbackMsg) {
  const status = e?.status || 500;
  if (status >= 500) {
    logger.error(`seafarerLinks: ${e?.message || e}`);
  }
  return res.status(status).json({
    ok: false,
    msg: status < 500 ? e.message : fallbackMsg,
  });
}

export const seafarerLinksController = {
  async meStatus(req, res) {
    try {
      const data = await seafarerLinksService.getSkipperLinkStatus(req.user);
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo obtener el estado de vinculación.");
    }
  },

  async meProfile(req, res) {
    try {
      const data = await seafarerLinksService.getSkipperLinkedProfile(req.user);
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo obtener la documentación.");
    }
  },

  async meRequestLink(req, res) {
    try {
      const data = await seafarerLinksService.requestSkipperLink(req.user, {
        unitAcronym: req.body?.unitAcronym,
        identityFile: req.file,
      });
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo enviar la solicitud de vinculación.");
    }
  },

  async meCancel(req, res) {
    try {
      const data = await seafarerLinksService.cancelSkipperLinkRequest(req.user);
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo cancelar la solicitud.");
    }
  },

  async meRequestUnlink(req, res) {
    try {
      const data = await seafarerLinksService.requestSkipperUnlink(req.user, {
        reason: req.body?.reason,
      });
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo iniciar la desvinculación.");
    }
  },

  async identityDocument(req, res) {
    try {
      const file = await seafarerLinksService.getLinkRequestIdentityDocument(
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
      return handleError(res, e, "No se pudo obtener el documento de identidad.");
    }
  },

  async pendingActions(req, res) {
    try {
      const data = await seafarerLinksService.getPendingActionsForSeafarer(
        req.params.seafarerId,
        req.user
      );
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudieron obtener las verificaciones.");
    }
  },

  async matchingAccounts(req, res) {
    try {
      const data = await seafarerLinksService.findMatchingAccountsForSeafarer(
        req.params.seafarerId,
        req.user
      );
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(
        res,
        e,
        "No se pudieron buscar cuentas coincidentes."
      );
    }
  },

  async staffLinkUser(req, res) {
    try {
      const data = await seafarerLinksService.staffLinkUserToSeafarer(
        req.params.seafarerId,
        req.body?.userId,
        req.user,
        { identityVerified: !!req.body?.identityVerified }
      );
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo vincular la cuenta.");
    }
  },

  async previewToken(req, res) {
    try {
      const token =
        typeof req.query.token === "string" ? req.query.token : "";
      const data = await seafarerLinksService.previewLinkEmailToken(
        token,
        req.user
      );
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo validar el enlace.");
    }
  },

  async approveLink(req, res) {
    try {
      const data = await seafarerLinksService.approveLinkRequest(
        req.params.id,
        req.user,
        { identityVerified: !!req.body?.identityVerified }
      );
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo aprobar la vinculación.");
    }
  },

  async rejectLink(req, res) {
    try {
      const data = await seafarerLinksService.rejectLinkRequest(
        req.params.id,
        req.user,
        { reason: req.body?.reason }
      );
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo rechazar la vinculación.");
    }
  },

  async requestUnlink(req, res) {
    try {
      const data = await seafarerLinksService.requestUnlink(
        req.params.seafarerId,
        req.user,
        { reason: req.body?.reason }
      );
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo iniciar la desvinculación.");
    }
  },

  async approveUnlink(req, res) {
    try {
      const data = await seafarerLinksService.approveUnlinkRequest(
        req.params.id,
        req.user
      );
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo confirmar la desvinculación.");
    }
  },

  async rejectUnlink(req, res) {
    try {
      const data = await seafarerLinksService.rejectUnlinkRequest(
        req.params.id,
        req.user,
        { reason: req.body?.reason }
      );
      return res.status(200).json({ ok: true, ...data });
    } catch (e) {
      return handleError(res, e, "No se pudo rechazar la desvinculación.");
    }
  },
};
