import env from "../config/env.config.js";
import { usersModel } from "../DAO/models/users.model.js";
import {
  escapeHtml,
  sicenButtonDangerHtml,
  sicenButtonPrimaryHtml,
  sicenCalloutHtml,
  sicenEmailBodyStyles,
  sicenEmailLayout,
  mergeSicenEmailAttachments,
} from "../utils/emailTemplates.js";
import { buildCreateUserFromRequestHref } from "../utils/newUserPrefill.js";
import { buildRejectAccountRequestHref } from "../utils/accountRequestReject.js";
import { transport } from "../utils/nodemailer.js";
import { logger } from "../utils/logger.js";

/** Data URL (JPEG / PNG / PDF) → adjunto Nodemailer. */
function dataUrlToMailAttachment(dataUrl, fallbackName = "adjunto") {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const m = /^data:([^;,]+);base64,([\s\S]+)$/i.exec(dataUrl.trim());
  if (!m) return null;
  const contentType = String(m[1] || "").toLowerCase();
  try {
    const buf = Buffer.from(m[2].replace(/\s/g, ""), "base64");
    if (!buf.length) return null;
    let ext = "bin";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = "jpg";
    else if (contentType.includes("png")) ext = "png";
    else if (contentType.includes("pdf")) ext = "pdf";
    const safeBase = String(fallbackName || "adjunto")
      .replace(/[^\w.\-áéíóúñÁÉÍÓÚÑ ]+/gi, "_")
      .trim()
      .slice(0, 80);
    const filename = /\.\w+$/.test(safeBase)
      ? safeBase
      : `${safeBase || "adjunto"}.${ext}`;
    return {
      filename,
      content: buf,
      contentType: contentType || "application/octet-stream",
    };
  } catch {
    return null;
  }
}

/** Data URL JPEG → adjunto Nodemailer (solicitud de foto de perfil). */
function jpegDataUrlToMailAttachment(dataUrl) {
  const att = dataUrlToMailAttachment(dataUrl, "foto-perfil-solicitud.jpg");
  if (!att) return null;
  if (!String(att.contentType).includes("jpeg")) return null;
  return {
    ...att,
    filename: "foto-perfil-solicitud.jpg",
    contentType: "image/jpeg",
  };
}

class UserService {
  async getAll() {
    try {
      return await usersModel.getAll();
    } catch (error) {
      throw new Error("Failed to find users: " + error);
    }
  }

  async findById(id) {
    try {
      return await usersModel.findById(id);
    } catch (error) {
      throw new Error("Failed to find user by ID: " + error);
    }
  }

  async create({
    avatar,
    first_name,
    last_name,
    rank,
    unit,
    email,
    password,
    role,
    documentId,
    phone,
    FN,
  }) {
    try {
      return await usersModel.create({
        avatar,
        first_name,
        last_name,
        rank,
        unit,
        email,
        password,
        role,
        documentId,
        phone,
        FN,
      });
    } catch (error) {
      throw new Error("Failed to create a user: " + error);
    }
  }

  async updateOne({
    _id,
    avatar,
    first_name,
    last_name,
    rank,
    unit,
    email,
    password,
    role,
    states,
    userTutorial,
    last_modified_by,
  }) {
    try {
      return await usersModel.updateOne({
        _id,
        avatar,
        first_name,
        last_name,
        rank,
        unit,
        email,
        password,
        role,
        states,
        userTutorial,
        last_modified_by,
      });
    } catch (error) {
      throw new Error("Failed to update user by ID");
    }
  }

  async deleteOne({ _id }) {
    try {
      return await usersModel.deleteOne({ _id });
    } catch (error) {
      throw new Error("Failed to delete user by ID: " + error);
    }
  }

  async findByEmail(email) {
    try {
      return await usersModel.findByEmail(email);
    } catch (error) {
      throw new Error("Failed to find user by email: " + error);
    }
  }

  /** Email normalizado (trim + minúsculas). */
  normalizeEmail(email) {
    return String(email ?? "").trim().toLowerCase();
  }

  /** ¿Ya hay un usuario con ese email (sin distinguir mayúsculas)? */
  async isEmailInUse(email) {
    const normalized = this.normalizeEmail(email);
    if (!normalized) return false;
    const found = await this.findByEmail(normalized);
    return Boolean(found);
  }

  async updatePassword({ email, newPassword }) {
    try {
      const userUpdated = await usersModel.updatePassword({ email, password: newPassword });
      return userUpdated;
    } catch (error) {
      throw new Error("Failed to update password: " + error);
    }
  }

  async updateFines({ _id, fines }) {
    try {
      return await usersModel.updateFines({ _id, fines });
    } catch (error) {
      throw new Error("Failed to update fines: " + error);
    }
  }

  async sendNewAccEmail({
    first_name,
    last_name,
    rank,
    unit,
    position,
    email,
    newAccBody,
    accountType,
    documentId,
    birthDate,
  }) {
    try {
      const S = sicenEmailBodyStyles;
      const unitText = unit != null ? String(unit).trim() : "";
      const positionText = position != null ? String(position).trim() : "";
      const documentText =
        documentId != null ? String(documentId).trim() : "";
      const birthText = birthDate != null ? String(birthDate).trim() : "";
      const isNauta = accountType === "nauta-deportivo";
      const typeLabel =
        accountType === "pnn-funcionario"
          ? "Funcionario PNN"
          : accountType === "nauta-deportivo"
            ? "Náuta deportivo"
            : accountType === "agente-maritimo"
              ? "Agente Marítimo"
              : accountType === "gente-de-mar"
                ? "Gente de mar"
                : "Solicitud de cuenta";
      const metaParts = [];
      if (documentText) {
        metaParts.push(
          `DNI / Pasaporte: <strong>${escapeHtml(documentText)}</strong>`
        );
      }
      if (birthText) {
        const birthDisplay = (() => {
          const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthText);
          if (!m) return birthText;
          return `${m[3]}/${m[2]}/${m[1]}`;
        })();
        metaParts.push(
          `Fecha de nacimiento: <strong>${escapeHtml(birthDisplay)}</strong>`
        );
      }
      if (unitText) {
        metaParts.push(`Unidad: <strong>${escapeHtml(unitText)}</strong>`);
      }
      if (positionText) {
        metaParts.push(
          `${isNauta ? "Teléfono" : "Cargo"}: <strong>${escapeHtml(positionText)}</strong>`
        );
      }
      const metaHtml = metaParts.length
        ? `<p style="${S.metaLine}">${metaParts.join(" · ")}</p>`
        : "";
      const createHref = buildCreateUserFromRequestHref({
        accountType,
        first_name,
        last_name,
        rank,
        unit,
        position,
        email,
        documentId,
        birthDate,
        newAccBody,
      });
      const rejectHref = buildRejectAccountRequestHref({
        accountType,
        first_name,
        last_name,
        email,
      });
      const bodyHtml = `
<p style="${S.paragraph}"><strong>Tipo de cuenta</strong></p>
<p style="${S.metaLine}">${escapeHtml(typeLabel)}</p>
<p style="${S.paragraph}"><strong>Solicitante</strong></p>
<p style="${S.leadStrong}"><strong>${escapeHtml(rank)} ${escapeHtml(first_name)} ${escapeHtml(last_name)}</strong></p>
${metaHtml}
<p style="${S.labelUppercase}">Correo indicado</p>
<p style="${S.metaLine}"><a href="mailto:${encodeURIComponent(String(email).trim())}" style="${S.link}">${escapeHtml(email)}</a></p>
<p style="${S.sectionHeading}">Justificación</p>
${sicenCalloutHtml(`<p style="${S.justification}">${escapeHtml(newAccBody)}</p>`, "muted")}
<p style="${S.paragraphAfterBlock}">Acciones (requieren iniciar sesión como <strong>administrador</strong> o <strong>super administrador</strong>):</p>
${sicenButtonPrimaryHtml(createHref, "Crear cuenta con estos datos")}
${sicenButtonDangerHtml(rejectHref, "Rechazar solicitud")}
<p style="${S.recoveryUrl}"><strong>Crear:</strong> ${escapeHtml(createHref)}</p>
<p style="${S.recoveryUrl}"><strong>Rechazar:</strong> ${escapeHtml(rejectHref)}</p>
`;
      await transport.sendMail({
        from: env.googleEmail,
        to: env.googleEmail,
        subject: `[SICEN] Solicitud de cuenta — ${typeLabel}`,
        html: sicenEmailLayout({
          title: "Nueva solicitud de cuenta",
          introLine:
            "Un usuario ha solicitado alta en el sistema a través del formulario público.",
          bodyHtml,
          footerNote:
            "Mensaje automático de SICEN · Los enlaces abren el panel de administración (crear o rechazar).",
        }),
        attachments: mergeSicenEmailAttachments(),
      });
    } catch (error) {
      logger.error(`Email could not be sent successfully: ` + error);
    }
  }

  /**
   * Avisa al solicitante que la solicitud no fue aprobada.
   */
  async sendAccountRequestRejectedEmail({
    first_name,
    last_name,
    email,
    typeLabel,
  }) {
    try {
      const S = sicenEmailBodyStyles;
      const name = [first_name, last_name].filter(Boolean).join(" ").trim();
      const greeting = name
        ? `Estimado/a <strong>${escapeHtml(name)}</strong>,`
        : "Estimado/a,";
      const typeLine = typeLabel
        ? `<p style="${S.metaLine}">Tipo solicitado: <strong>${escapeHtml(typeLabel)}</strong></p>`
        : "";
      const bodyHtml = `
<p style="${S.paragraph}">${greeting}</p>
<p style="${S.paragraph}">Le informamos que su solicitud de cuenta en <strong>SICEN</strong> no fue aprobada. No se procedió a la creación de la cuenta con los datos enviados.</p>
${typeLine}
<p style="${S.paragraph}">Si cree que se trata de un error, comuníquese con el administrador del sistema.</p>
`;
      await transport.sendMail({
        from: env.googleEmail,
        to: String(email).trim(),
        subject: "[SICEN] Solicitud de cuenta no aprobada",
        html: sicenEmailLayout({
          title: "Solicitud no aprobada",
          introLine: "Respuesta a su solicitud de alta en el Sistema Centinela.",
          bodyHtml,
          footerNote:
            "Si usted no solicitó una cuenta en SICEN, ignore este mensaje.",
        }),
        attachments: mergeSicenEmailAttachments(),
      });
    } catch (error) {
      logger.error(
        `Rejection email could not be sent successfully: ` + error
      );
      throw error;
    }
  }

  async sendNewDataEmail({
    first_name,
    newFirstName,
    last_name,
    newLastName,
    rank,
    newRank,
    role,
    newRole,
    unit,
    newUnit,
    email,
    newEmail,
    newDataBody,
    profilePhotoDataUrl,
    specializationRequests,
  }) {
    try {
      const S = sicenEmailBodyStyles;
      const attachments = [];
      const photoAtt = jpegDataUrlToMailAttachment(profilePhotoDataUrl);
      if (photoAtt) attachments.push(photoAtt);
      const photoNote = photoAtt
        ? `<p style="${S.paragraph}"><strong>Foto de perfil:</strong> imagen adjunta (<code style="${S.codeInline}">foto-perfil-solicitud.jpg</code>) para revisión.</p>`
        : "";

      const specs = Array.isArray(specializationRequests)
        ? specializationRequests
        : [];
      const specRowsHtml = [];
      specs.forEach((raw, idx) => {
        const name = String(raw?.name ?? "").trim();
        if (!name) return;
        const actionRaw = String(raw?.action ?? "").trim();
        const action =
          actionRaw === "Alta" || actionRaw === "Baja" ? actionRaw : "—";
        const fileName = String(raw?.certificateFileName ?? "").trim();
        const dataUrl = String(raw?.certificateDataUrl ?? "").trim();
        let certLabel = "Sin certificado adjunto";
        if (dataUrl) {
          const safeName =
            fileName ||
            `certificado-especializacion-${idx + 1}`;
          const att = dataUrlToMailAttachment(
            dataUrl,
            `cert-${idx + 1}-${safeName}`
          );
          if (att) {
            attachments.push(att);
            certLabel = `Adjunto: <code style="${S.codeInline}">${escapeHtml(att.filename)}</code>`;
          } else {
            certLabel = "Certificado indicado (no se pudo adjuntar)";
          }
        }
        specRowsHtml.push(
          `<tr style="${S.trBorder}"><td style="${S.tdLabel}">${escapeHtml(name)}</td><td style="${S.tdValue}"><strong>${escapeHtml(action)}</strong> · ${certLabel}</td></tr>`
        );
      });
      const specsBlock =
        specRowsHtml.length > 0
          ? `<p style="${S.sectionHeadingSpaced}">Especializaciones solicitadas</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="${S.table}">
${specRowsHtml.join("")}
</table>`
          : "";

      const bodyHtml = `
<p style="${S.paragraph}"><strong>Usuario actual</strong></p>
<p style="${S.paragraph}">${escapeHtml(rank)} ${escapeHtml(first_name)} ${escapeHtml(last_name)}</p>
<p style="${S.metaLine}">${escapeHtml(email)} · ${escapeHtml(role)}${unit != null && unit !== "" ? ` · Unidad: ${escapeHtml(String(unit))}` : ""}</p>
<p style="${S.sectionHeadingSpaced}">Cambios solicitados</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="${S.table}">
  <tr style="${S.trBorder}"><td style="${S.tdLabel}">Nombre</td><td style="${S.tdValue}"><strong>${escapeHtml(newFirstName)}</strong></td></tr>
  <tr style="${S.trBorder}"><td style="${S.tdLabel}">Apellido</td><td style="${S.tdValue}"><strong>${escapeHtml(newLastName)}</strong></td></tr>
  <tr style="${S.trBorder}"><td style="${S.tdLabel}">Grado</td><td style="${S.tdValue}"><strong>${escapeHtml(newRank)}</strong></td></tr>
  <tr style="${S.trBorder}"><td style="${S.tdLabel}">Unidad</td><td style="${S.tdValue}"><strong>${escapeHtml(newUnit ?? "")}</strong></td></tr>
  <tr style="${S.trBorder}"><td style="${S.tdLabel}">Email</td><td style="${S.tdValue}"><strong>${escapeHtml(newEmail)}</strong></td></tr>
  <tr><td style="${S.tdLabel}">Rol</td><td style="${S.tdValue}"><strong>${escapeHtml(newRole)}</strong></td></tr>
</table>
${photoNote}
${specsBlock}
<p style="${S.sectionHeading}">Justificación</p>
${sicenCalloutHtml(`<p style="${S.justification}">${escapeHtml(newDataBody)}</p>`, "muted")}
`;
      const mailAttachments = mergeSicenEmailAttachments(attachments);
      await transport.sendMail({
        from: env.googleEmail,
        to: env.googleEmail,
        subject: "[SICEN] Solicitud de actualización de datos",
        html: sicenEmailLayout({
          title: "Actualización de datos personales",
          introLine:
            "Se recibió una solicitud para modificar datos de un usuario registrado.",
          bodyHtml,
          footerNote:
            "Revise la solicitud en el panel de administración antes de aplicar cambios en la base de datos.",
        }),
        attachments: mailAttachments,
      });
    } catch (error) {
      logger.error("Email could not be sent successfully: " + error);
    }
  }

  async sendDataToNewUser({ first_name, last_name, rank, email }) {
    try {
      const loginUrl = `${env.publicAppUrl}/`;
      const S = sicenEmailBodyStyles;
      const credentialsBlock = sicenCalloutHtml(
        `
<p style="${S.calloutInfoTitle}">Credenciales de acceso</p>
<p style="${S.calloutLine}"><strong>Usuario (email):</strong> ${escapeHtml(email)}</p>
<p style="${S.calloutLineLast}"><strong>Contraseña temporal:</strong> <code style="${S.codeInline}">123456789</code></p>
`,
        "info"
      );
      const bodyHtml = `
<p style="${S.paragraph}">Estimado/a <strong>${escapeHtml(rank)} ${escapeHtml(first_name)} ${escapeHtml(last_name)}</strong>,</p>
<p style="${S.paragraph}">Su cuenta en el <strong>Sistema Centinela</strong> ha sido habilitada.</p>
<p style="${S.paragraph}">El sistema es de uso exclusivo del personal y usuarios autorizados. Las acciones quedan registradas; un uso indebido puede tener consecuencias administrativas.</p>
${credentialsBlock}
<p style="${S.paragraphAfterBlock}">Por seguridad, cambie la contraseña al primer ingreso desde <strong>Cambiar contraseña</strong> en el panel. No comparta sus credenciales.</p>
${sicenButtonPrimaryHtml(loginUrl, "Ingresar a SICEN")}
`;
      await transport.sendMail({
        from: env.googleEmail,
        to: email,
        subject: "[SICEN] Bienvenido al Sistema Centinela",
        html: sicenEmailLayout({
          title: "Bienvenido al Sistema Centinela",
          introLine: "Sus datos de acceso al sistema",
          bodyHtml,
          footerNote:
            "Correo automático de bienvenida · Si no esperaba este mensaje, ignore este correo.",
        }),
        attachments: mergeSicenEmailAttachments(),
      });
      return true;
    } catch (error) {
      logger.error("Email could not be sent successfully: " + error);
    }
  }
}

export const userService = new UserService();
