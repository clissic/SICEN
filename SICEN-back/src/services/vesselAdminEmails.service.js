import fs from "fs";
import { logger } from "../utils/logger.js";
import { transport } from "../utils/nodemailer.js";
import {
  escapeHtml,
  mergeSicenEmailAttachments,
  sicenButtonPrimaryHtml,
  sicenButtonStackHtml,
  sicenCalloutHtml,
  sicenEmailBodyStyles,
  sicenEmailLayout,
} from "../utils/emailTemplates.js";
import { buildVesselAdminEditHref } from "../utils/vesselAdminEmailToken.js";
import { resolveVesselAdminProofAbsolute } from "../utils/vesselAdminProofFiles.js";

function str(v) {
  return String(v ?? "").trim();
}

function userDisplayName(user) {
  const first = str(user?.first_name);
  const last = str(user?.last_name);
  if (first || last) return `${first} ${last}`.trim();
  return str(user?.email) || "—";
}

function claimTypeLabel(claimType) {
  return claimType === "owner" ? "Propietario" : "Administrador (carta poder)";
}

function buildProofMailAttachment(proofDocument) {
  const stored = str(proofDocument?.storedName);
  if (!stored) return null;
  const absolute = resolveVesselAdminProofAbsolute(stored);
  if (!absolute) return null;
  const original =
    str(proofDocument.originalName) || `documento-prueba${pathExt(stored)}`;
  return {
    filename: original,
    content: fs.readFileSync(absolute),
    contentType: str(proofDocument.mimeType) || undefined,
  };
}

function pathExt(name) {
  const i = String(name).lastIndexOf(".");
  return i >= 0 ? String(name).slice(i) : "";
}

async function sendMail({ to, subject, html, extraAttachments }) {
  if (!to || !to.includes("@")) {
    logger.info(`vesselAdmin email: destinatario inválido (${to})`);
    return false;
  }
  try {
    await transport.sendMail({
      to,
      subject,
      html,
      attachments: mergeSicenEmailAttachments(extraAttachments || []),
    });
    return true;
  } catch (e) {
    logger.error(`vesselAdmin email to ${to}: ${e?.message || e}`);
    throw e;
  }
}

export async function sendVesselAdminRequestEmail({
  unit,
  request,
  user,
  vessel,
  token,
}) {
  void token;
  const S = sicenEmailBodyStyles;
  const href = buildVesselAdminEditHref({
    requestId: request._id,
    vesselId: vessel._id,
    vesselBusinessId: vessel.id || vessel._id,
  });
  const vesselName = str(vessel?.generalInfo?.name) || "Sin nombre";
  const matricula =
    str(vessel?.identification?.nationalRegistryNumber) || "—";

  const bodyHtml = `
<p style="${S.paragraph}">Un náuta deportivo solicitó <strong>administrar un buque</strong> en SICEN.</p>
<p style="${S.metaLine}"><strong>Solicitante:</strong> ${escapeHtml(userDisplayName(user))}</p>
<p style="${S.metaLine}"><strong>Email:</strong> ${escapeHtml(str(user.email))}</p>
<p style="${S.metaLine}"><strong>Documento:</strong> ${escapeHtml(str(user.documentId) || "—")}</p>
<p style="${S.metaLine}"><strong>Buque:</strong> ${escapeHtml(vesselName)} · Matrícula ${escapeHtml(matricula)}</p>
<p style="${S.metaLine}"><strong>Tipo de vínculo:</strong> ${escapeHtml(claimTypeLabel(request.claimType))}</p>
<p style="${S.metaLine}"><strong>Prefectura:</strong> ${escapeHtml(str(request.unitAcronym))}</p>
${sicenCalloutHtml(
  `<p style="${S.justification}">Adjunto encontrará el documento de prueba (propiedad, matrícula o carta poder). Revise y apruebe o rechace en SICEN.</p>`,
  "warning"
)}
${sicenButtonStackHtml(
  sicenButtonPrimaryHtml(href, "Abrir administradores del buque en SICEN")
)}
`;

  const html = sicenEmailLayout({
    title: "Solicitud de administración de buque",
    introLine: "Verificación de documentación requerida.",
    bodyHtml,
    footerNote: "Mensaje automático de SICEN · Administración de buques.",
  });

  const subject = `[SICEN] Administración de buque — ${vesselName} · ${userDisplayName(user)}`;
  const proofAtt = buildProofMailAttachment(request?.proofDocument);
  return sendMail({
    to: str(unit?.emailMarinaMercante),
    subject,
    html,
    extraAttachments: proofAtt ? [proofAtt] : [],
  });
}

export async function sendVesselAdminRejectedEmail({
  user,
  vessel,
  reason,
  claimType,
}) {
  const S = sicenEmailBodyStyles;
  const to = str(user?.email);
  const vesselName = str(vessel?.generalInfo?.name) || "Sin nombre";

  const bodyHtml = `
<p style="${S.paragraph}">Su solicitud de administración del buque <strong>${escapeHtml(vesselName)}</strong> fue <strong>rechazada</strong>.</p>
<p style="${S.metaLine}"><strong>Tipo solicitado:</strong> ${escapeHtml(claimTypeLabel(claimType))}</p>
<p style="${S.sectionHeading}">Motivo</p>
${sicenCalloutHtml(
  `<p style="${S.justification}">${escapeHtml(reason || "—")}</p>`,
  "muted"
)}
`;

  const html = sicenEmailLayout({
    title: "Solicitud de administración rechazada",
    introLine: "Aviso de SICEN.",
    bodyHtml,
    footerNote: "Mensaje automático de SICEN · Administración de buques.",
  });

  const subject = `[SICEN] Solicitud de administración rechazada — ${vesselName}`;
  return sendMail({ to, subject, html });
}
