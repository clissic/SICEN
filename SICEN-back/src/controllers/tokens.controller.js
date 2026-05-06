import { recoverTokensService } from "../services/tokens.service.js";
import { logger } from "../utils/logger.js";

class TokensController {
  async recoverPass(req, res) {
    const { email, newPassword, confirmPassword } = req.body;
    try {
      if (newPassword === confirmPassword) {
        await recoverTokensService.recoverPass(email, newPassword);
        logger.info(email + " actualizó su contraseña con éxito");
        return res.status(200).json({
          ok: true,
          msg: "CONTRASEÑA ACTUALIZADA CORRECTAMENTE",
        });
      }
      return res.status(400).json({
        ok: false,
        msg: "LAS CONTRASEÑAS DEBEN COINCIDIR",
        email,
      });
    } catch (error) {
      logger.error("Error recovering password in tokens.controller: " + error);
      return res.status(500).json({
        ok: false,
        msg: "Error actualizando la contraseña.",
      });
    }
  }

  async recoverForm(req, res) {
    const { token, email } = req.query;
    try {
      const foundToken = await recoverTokensService.findOne({ token, email });
      if (foundToken && foundToken.expire > Date.now()) {
        await recoverTokensService.findOne(token, email);
        return res.status(200).json({ ok: true, email });
      }
      return res.status(400).json({
        ok: false,
        msg: "Tu token ha expirado o es inválido.",
      });
    } catch (error) {
      logger.error("Error finding token in tokens.controller: " + error);
      return res.status(500).json({
        ok: false,
        msg: "Error validando el token.",
      });
    }
  }

  async recoverByEmail(req, res) {
    const { email } = req.body;
    try {
      await recoverTokensService.sendRecoveryToken(email);
      return res.status(200).json({
        ok: true,
        msg: `Token enviado correctamente a ${email}`,
      });
    } catch (error) {
      logger.error("Error sending email in tokens.controller: " + error);
      return res.status(404).json({
        ok: false,
        msg: "Error enviando el email.",
      });
    }
  }
}

export const tokensController = new TokensController();
