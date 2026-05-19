import env from "../config/env.config.js";
import { usersModel } from "../DAO/models/users.model.js";
import {
  escapeHtml,
  sicenButtonPrimaryHtml,
  sicenCalloutHtml,
  sicenEmailBodyStyles,
  sicenEmailLayout,
} from "../utils/emailTemplates.js";
import { transport } from "../utils/nodemailer.js";
import { logger } from "../utils/logger.js";

/** Data URL JPEG → adjunto Nodemailer (solicitud de foto de perfil). */
function jpegDataUrlToMailAttachment(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const m = /^data:image\/jpeg;base64,([\s\S]+)$/i.exec(dataUrl.trim());
  if (!m) return null;
  try {
    const buf = Buffer.from(m[1].replace(/\s/g, ""), "base64");
    if (!buf.length) return null;
    return {
      filename: "foto-perfil-solicitud.jpg",
      content: buf,
      contentType: "image/jpeg",
    };
  } catch {
    return null;
  }
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

  async create({ avatar, first_name, last_name, rank, unit, email, password, role }) {
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

  async sendNewAccEmail({ first_name, last_name, rank, email, newAccBody }) {
    try {
      const S = sicenEmailBodyStyles;
      const bodyHtml = `
<p style="${S.paragraph}"><strong>Solicitante</strong></p>
<p style="${S.leadStrong}"><strong>${escapeHtml(rank)} ${escapeHtml(first_name)} ${escapeHtml(last_name)}</strong></p>
<p style="${S.labelUppercase}">Correo indicado</p>
<p style="${S.metaLine}"><a href="mailto:${encodeURIComponent(String(email).trim())}" style="${S.link}">${escapeHtml(email)}</a></p>
<p style="${S.sectionHeading}">Justificación</p>
${sicenCalloutHtml(`<p style="${S.justification}">${escapeHtml(newAccBody)}</p>`, "muted")}
`;
      await transport.sendMail({
        from: env.googleEmail,
        to: env.googleEmail,
        subject: "[SICEN] Solicitud de creación de cuenta",
        html: sicenEmailLayout({
          title: "Nueva solicitud de cuenta",
          introLine:
            "Un usuario ha solicitado alta en el sistema a través del formulario público.",
          bodyHtml,
          footerNote:
            "Mensaje automático de SICEN · Gestione la solicitud desde el panel de administración.",
        }),
      });
    } catch (error) {
      logger.error(`Email could not be sent successfully: ` + error);
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
  }) {
    try {
      const S = sicenEmailBodyStyles;
      const photoAtt = jpegDataUrlToMailAttachment(profilePhotoDataUrl);
      const attachments = photoAtt ? [photoAtt] : undefined;
      const photoNote = photoAtt
        ? `<p style="${S.paragraph}"><strong>Foto de perfil:</strong> imagen adjunta (<code style="${S.codeInline}">foto-perfil-solicitud.jpg</code>) para revisión.</p>`
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
<p style="${S.sectionHeading}">Justificación</p>
${sicenCalloutHtml(`<p style="${S.justification}">${escapeHtml(newDataBody)}</p>`, "muted")}
`;
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
        ...(attachments ? { attachments } : {}),
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
      });
      return true;
    } catch (error) {
      logger.error("Email could not be sent successfully: " + error);
    }
  }
}

export const userService = new UserService();
