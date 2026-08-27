import env from "../config/env.config.js";
import { createHash } from "../utils/Bcrypt.js";
import {
  escapeHtml,
  sicenButtonPrimaryHtml,
  sicenCalloutHtml,
  sicenEmailBodyStyles,
  sicenEmailLayout,
  mergeSicenEmailAttachments,
} from "../utils/emailTemplates.js";
import { logger } from "../utils/logger.js";
import { transport } from "../utils/nodemailer.js";
import { generateRandomCode } from "../utils/random-code.js";
import { usersModel } from "../DAO/models/users.model.js";
import { recoverTokensModel } from "../DAO/models/tokens.model.js";

class RecoverTokensService {
  async create({token, email, expire}) {
    try {
      await recoverTokensModel.create({token, email, expire});
    } catch (error) {
      logger.error("Error creating recover token in tokens.service: " + error);
    }
  }

  async findOne({token, email}) {
    try {
      const recoverTokenFound = await recoverTokensModel.findOne({token, email});
      return recoverTokenFound;
    } catch (error) {
      logger.error("Error finding recover token in tokens.service: " + error);
    }
  }

  async recoverPass(email, newPassword) {
    try {
      const password = createHash(newPassword)
      await usersModel.updatePassword({email, password});
    } catch (error) {
      logger.error("Error recovering password in login.service: " + error);
    }
  }

  async sendRecoveryToken(email) {
    const user = await usersModel.findByEmail(email);
    const token = generateRandomCode();
    const expire = Date.now() + 3600000;
    const savedToken = await recoverTokensModel.create({
      token: token,
      email: email,
      expire: expire,
    });
    const appBase = env.publicAppUrl;
    const recoveryHref = `${appBase}/restablecer?token=${encodeURIComponent(
      token
    )}&email=${encodeURIComponent(email)}`;
    if (user) {
      const S = sicenEmailBodyStyles;
      const tokenBox = sicenCalloutHtml(
        `<p style="${S.tokenLabel}">Código de verificación</p>
<p style="${S.tokenCode}">${escapeHtml(token)}</p>
<p style="${S.tokenHint}">Válido por <strong>1 hora</strong> desde el envío de este correo.</p>`,
        "muted"
      );
      const bodyHtml = `
<p style="${S.paragraph}">Recibimos una solicitud para restablecer la contraseña asociada a su cuenta en <strong>SICEN</strong>.</p>
${tokenBox}
<p style="${S.paragraphAfterBlock}">Use el botón siguiente para continuar en el sitio seguro. También puede copiar el enlace al final del mensaje.</p>
${sicenButtonPrimaryHtml(recoveryHref, "Restablecer contraseña")}
<p style="${S.recoveryUrl}">${escapeHtml(recoveryHref)}</p>
<p style="${S.recoveryDisclaimer}">Si usted no solicitó este cambio, ignore este mensaje; su contraseña no se modificará.</p>
`;
      await transport.sendMail({
        from: env.googleEmail,
        to: email,
        subject: "[SICEN] Recuperación de contraseña",
        html: sicenEmailLayout({
          title: "Recuperación de contraseña",
          introLine: "Complete el proceso desde el enlace seguro (caduca en 1 hora).",
          bodyHtml,
          footerNote:
            "Por seguridad no comparta este código ni el enlace con terceros.",
        }),
        attachments: mergeSicenEmailAttachments(),
      });
    } else {
      logger.error(`Email ${email} does not exist in DB`);
    }
  }
}

export const recoverTokensService = new RecoverTokensService();
