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
import { buildSeafarerLinkConsultHref } from "../utils/seafarerLinkEmailToken.js";
import { resolveSeafarerLinkIdentityAbsolute } from "../utils/seafarerLinkIdentityFiles.js";

function str(v) {
  return String(v ?? "").trim();
}

function seafarerDisplayName(seafarer) {
  const pd = seafarer?.personalData || {};
  const last = str(pd.lastName);
  const first = str(pd.firstName);
  if (last && first) return `${last}, ${first}`;
  return last || first || "—";
}

function userDisplayName(user) {
  const first = str(user?.first_name);
  const last = str(user?.last_name);
  if (first || last) return `${first} ${last}`.trim();
  return str(user?.email) || "—";
}

async function sendToMarinaMercante({ unit, subject, html, extraAttachments }) {
  const to = str(unit?.emailMarinaMercante);
  if (!to || !to.includes("@")) {
    logger.info(
      `seafarerLink email: sin emailMarinaMercante para ${str(unit?.acronym)}`
    );
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
    logger.error(`seafarerLink email to ${to}: ${e?.message || e}`);
    throw e;
  }
}

function buildIdentityMailAttachment(identityDocument) {
  const stored = str(identityDocument?.storedName);
  if (!stored) return null;
  const absolute = resolveSeafarerLinkIdentityAbsolute(stored);
  if (!absolute) return null;
  const original =
    str(identityDocument.originalName) || `documento-identidad${pathExt(stored)}`;
  return {
    filename: original,
    content: fs.readFileSync(absolute),
    contentType: str(identityDocument.mimeType) || undefined,
  };
}

function pathExt(name) {
  const i = String(name).lastIndexOf(".");
  return i >= 0 ? String(name).slice(i) : "";
}

export async function sendSeafarerLinkRequestEmail({
  unit,
  request,
  user,
  seafarer,
  token,
}) {
  const S = sicenEmailBodyStyles;
  const href = buildSeafarerLinkConsultHref({
    requestId: request._id,
    seafarerId: seafarer._id,
    type: "link",
  });
  void token;

  const hasDoc = Boolean(str(request?.identityDocument?.storedName));
  const bodyHtml = `
<p style="${S.paragraph}">Un náuta deportivo solicitó la <strong>vinculación formal</strong> de su cuenta SICEN con una ficha de gente de mar / náutas.</p>
<p style="${S.metaLine}"><strong>Solicitante:</strong> ${escapeHtml(userDisplayName(user))}</p>
<p style="${S.metaLine}"><strong>Email cuenta:</strong> ${escapeHtml(str(user.email))}</p>
<p style="${S.metaLine}"><strong>Documento cuenta:</strong> ${escapeHtml(str(user.documentId) || "—")}</p>
<p style="${S.metaLine}"><strong>Ficha PNN:</strong> ${escapeHtml(seafarerDisplayName(seafarer))}</p>
<p style="${S.metaLine}"><strong>Prefectura elegida:</strong> ${escapeHtml(str(request.unitAcronym))}</p>
${sicenCalloutHtml(
  `<p style="${S.justification}">${
    hasDoc
      ? "Adjunto encontrará una foto/PDF del documento de identidad del solicitante. Compare los datos con la ficha y, si coinciden, abra SICEN para verificar la cuenta a distancia."
      : "Verifique la identidad del solicitante antes de vincular."
  }</p>`,
  "warning"
)}
${sicenButtonStackHtml(
  sicenButtonPrimaryHtml(href, "Abrir Verificaciones en SICEN")
)}
`;

  const html = sicenEmailLayout({
    title: "Solicitud de vinculación de náuta",
    introLine: "Verificación de identidad a distancia (documento adjunto).",
    bodyHtml,
    footerNote:
      "Mensaje automático de SICEN · Vinculación cuenta ↔ ficha de náuta.",
  });

  const subject = `[SICEN] Solicitud de vinculación de náuta — ${userDisplayName(user)} · ${str(user.documentId) || "sin documento"}`;
  const identityAtt = buildIdentityMailAttachment(request?.identityDocument);
  return sendToMarinaMercante({
    unit,
    subject,
    html,
    extraAttachments: identityAtt ? [identityAtt] : [],
  });
}

export async function sendSeafarerUnlinkRequestEmail({
  unit,
  request,
  user,
  seafarer,
  token,
  reason,
}) {
  void token;
  const S = sicenEmailBodyStyles;
  const href = buildSeafarerLinkConsultHref({
    requestId: request._id,
    seafarerId: seafarer._id,
    type: "unlink",
  });

  const bodyHtml = `
<p style="${S.paragraph}">Se solicitó la <strong>desvinculación</strong> de una cuenta SICEN respecto de una ficha de náuta.</p>
<p style="${S.metaLine}"><strong>Cuenta:</strong> ${escapeHtml(userDisplayName(user))} (${escapeHtml(str(user.email))})</p>
<p style="${S.metaLine}"><strong>Ficha PNN:</strong> ${escapeHtml(seafarerDisplayName(seafarer))}</p>
<p style="${S.metaLine}"><strong>Unidad vinculadora:</strong> ${escapeHtml(str(request.unitAcronym))}</p>
<p style="${S.sectionHeading}">Motivo</p>
${sicenCalloutHtml(
  `<p style="${S.justification}">${escapeHtml(reason || "—")}</p>`,
  "muted"
)}
${sicenButtonStackHtml(
  sicenButtonPrimaryHtml(href, "Confirmar o rechazar desvinculación")
)}
`;

  const html = sicenEmailLayout({
    title: "Solicitud de desvinculación de náuta",
    introLine: "Requiere confirmación de Marina Mercante.",
    bodyHtml,
    footerNote:
      "Mensaje automático de SICEN · Vinculación cuenta ↔ ficha de náuta.",
  });

  const subject = `[SICEN] Desvinculación de náuta — ${userDisplayName(user)}`;
  return sendToMarinaMercante({ unit, subject, html });
}
