import { UserMongoose } from "../DAO/models/mongoose/users.mongoose.js";
import { userService } from "../services/users.service.js";
import { createHash, isValidPassword } from "../utils/Bcrypt.js";
import { logger } from "../utils/logger.js";
import { signAccessToken, verifyAccessToken } from "../utils/jwt.util.js";
import { mergeUserStatesFromDocument } from "../constants/userStates.js";
import {
  buildMfaChallengeResponse,
  confirmEnrollment,
  disableMfa,
  findUserByIdForMfa,
  loginRequiresMfaChallenge,
  publicUserShape,
  startEnrollment,
  verifyMfaChallenge,
} from "../services/mfa.service.js";
import {
  isMfaChallengePayload,
  verifyMfaChallengeToken,
} from "../utils/mfaJwt.util.js";

function publicShape(user) {
  return publicUserShape(user);
}

function mfaError(res, e, fallbackMsg) {
  const code = e.status || e.statusCode || 500;
  if (code === 400 || code === 401 || code === 403 || code === 429) {
    return res.status(code).json({
      ok: false,
      msg: e.message,
      ...(e.code ? { code: e.code } : {}),
    });
  }
  logger.error(fallbackMsg + ": " + (e?.message || e));
  return res.status(500).json({ ok: false, msg: fallbackMsg });
}

function bearerFromReq(req) {
  const h = req.headers?.authorization;
  if (!h || typeof h !== "string" || !h.startsWith("Bearer ")) return "";
  return h.slice(7).trim();
}

async function resolveMfaActor(req) {
  const bodyToken = String(req.body?.mfaToken || "").trim();
  if (bodyToken) {
    const payload = verifyMfaChallengeToken(bodyToken);
    return { user: await findUserByIdForMfa(payload.sub), via: "challenge" };
  }
  const bearer = bearerFromReq(req);
  if (!bearer) {
    const err = new Error("Debe iniciar sesión o completar el ingreso.");
    err.status = 401;
    throw err;
  }
  const payload = verifyAccessToken(bearer);
  if (isMfaChallengePayload(payload)) {
    return { user: await findUserByIdForMfa(payload.sub), via: "challenge" };
  }
  return { user: await findUserByIdForMfa(payload.sub), via: "access" };
}

class SessionsController {
  me(req, res) {
    const user = req.user;
    if (!user) {
      return res.status(200).json({ ok: true, user: null });
    }
    return res.status(200).json({
      ok: true,
      user: {
        ...user,
        states: mergeUserStatesFromDocument(user.states),
        userTutorial: user.userTutorial === true,
      },
    });
  }

  async signup(req, res) {
    try {
      const {
        avatar,
        first_name,
        last_name,
        rank,
        email,
        password,
      } = req.body;
      if (!email || !password || !first_name || !last_name || !rank) {
        return res.status(400).json({
          ok: false,
          msg: "Complete email, contraseña, nombre, apellido y grado.",
        });
      }
      const normalizedEmail = String(email).trim().toLowerCase();
      const existing = await UserMongoose.findOne({
        email: {
          $regex: new RegExp(
            `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            "i"
          ),
        },
      });
      if (existing) {
        return res.status(409).json({
          ok: false,
          msg: "Ya existe una cuenta con ese email.",
        });
      }
      const created = await userService.create({
        avatar: avatar || "./img/avatar.png",
        first_name,
        last_name,
        rank,
        email: normalizedEmail,
        password: createHash(password),
      });
      const token = signAccessToken(created._id, created.tokenVersion);
      logger.info("User registration successful: " + email);
      return res.status(201).json({
        ok: true,
        user: publicShape(created),
        token,
      });
    } catch (err) {
      logger.info("signup error: " + err);
      return res.status(500).json({ ok: false, msg: "Error interno." });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          ok: false,
          msg: "Email y contraseña requeridos.",
        });
      }
      const normalizedEmail = String(email).trim().toLowerCase();
      const escaped = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const user = await UserMongoose.findOne({
        email: { $regex: new RegExp(`^${escaped}$`, "i") },
      });

      if (!user) {
        return res.status(401).json({
          ok: false,
          msg: "Email o contraseña incorrectos.",
        });
      }
      if (user.isLocked) {
        const minutesLeft = Math.ceil(
          (user.lockUntil.getTime() - Date.now()) / 60000
        );
        logger.warning(
          `Intento de login en cuenta bloqueada: ${email} — ${minutesLeft} min restantes`
        );
        return res.status(423).json({
          ok: false,
          msg: `Cuenta bloqueada temporalmente por intentos fallidos. Intentá nuevamente en ${minutesLeft} minuto(s).`,
        });
      }

      if (!isValidPassword(password, user.password)) {
        const MAX_ATTEMPTS = 5;
        const LOCK_TIME_MS = 15 * 60 * 1000;
        user.loginAttempts = (user.loginAttempts || 0) + 1;

        if (user.loginAttempts >= MAX_ATTEMPTS) {
          user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
          await user.save();
          logger.warning(
            `Cuenta bloqueada por intentos fallidos: ${email} (${user.loginAttempts} intentos)`
          );
          return res.status(423).json({
            ok: false,
            msg: `Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intentá nuevamente en 15 minutos.`,
          });
        }

        await user.save();
        logger.info(
          `Login fallido: ${email} — intento ${user.loginAttempts}/${MAX_ATTEMPTS}`
        );
        return res.status(401).json({
          ok: false,
          msg: "Email o contraseña incorrectos.",
        });
      }

      if (user.loginAttempts > 0 || user.lockUntil) {
        user.loginAttempts = 0;
        user.lockUntil = null;
        await user.save();
      }

      if (loginRequiresMfaChallenge(user)) {
        const challenge = await buildMfaChallengeResponse(user);
        return res.status(200).json(challenge);
      }

      logger.info(
        `${user.rank} ${user.first_name} ${user.last_name} logged in as ${user.role}`
      );
      const token = signAccessToken(user._id, user.tokenVersion);
      return res.status(200).json({
        ok: true,
        user: publicShape(user),
        token,
      });
    } catch (err) {
      logger.info("login error: " + err);
      return res.status(500).json({ ok: false, msg: "Error interno." });
    }
  }

  async logout(req, res) {
    try {
      const user = req.user;
      if (user?._id) {
        await UserMongoose.updateOne(
          { _id: user._id },
          { $inc: { tokenVersion: 1 } }
        );
        logger.info(`Logout: tokenVersion incrementada para ${user.email}`);
      }
      return res.status(200).json({
        ok: true,
        msg: "Sesión cerrada correctamente.",
      });
    } catch (err) {
      logger.error("logout error: " + err);
      return res.status(200).json({
        ok: true,
        msg: "Sesión cerrada.",
      });
    }
  }

  async mfaEnroll(req, res) {
    try {
      const { user } = await resolveMfaActor(req);
      const result = await startEnrollment(user, {
        currentCode: req.body?.currentCode,
      });
      return res.status(200).json({
        ok: true,
        msg: "Escaneá el código QR con la app de autenticación y confirmá con el código de 6 dígitos.",
        ...result,
      });
    } catch (e) {
      if (e.name === "JsonWebTokenError" || e.name === "TokenExpiredError") {
        return res.status(401).json({
          ok: false,
          msg: "La verificación venció. Volvé a iniciar sesión.",
          code: "MFA_TOKEN_EXPIRED",
        });
      }
      return mfaError(res, e, "No se pudo iniciar la verificación en dos pasos.");
    }
  }

  async mfaVerify(req, res) {
    try {
      const { user, via } = await resolveMfaActor(req);
      if (via === "access") {
        const result = await confirmEnrollment(user, req.body?.code);
        return res.status(200).json({
          ok: true,
          msg: "Verificación en dos pasos activada.",
          ...result,
          user: publicShape(user),
        });
      }
      const issued = await verifyMfaChallenge(user, req.body?.code);
      return res.status(200).json({
        ...issued,
        msg: "Ingreso correcto.",
      });
    } catch (e) {
      if (e.name === "JsonWebTokenError" || e.name === "TokenExpiredError") {
        return res.status(401).json({
          ok: false,
          msg: "La verificación venció. Volvé a iniciar sesión.",
          code: "MFA_TOKEN_EXPIRED",
        });
      }
      return mfaError(res, e, "No se pudo verificar el código.");
    }
  }

  async mfaDisable(req, res) {
    try {
      const user = await findUserByIdForMfa(req.user._id);
      const result = await disableMfa(user, req.body?.code);
      return res.status(200).json({
        ok: true,
        msg: roleRequiresMfaCopy(user.role),
        ...result,
        user: publicShape(user),
      });
    } catch (e) {
      return mfaError(res, e, "No se pudo desactivar la verificación en dos pasos.");
    }
  }
}

function roleRequiresMfaCopy(role) {
  if (role === "admin" || role === "superAdmin") {
    return "Verificación desactivada. En el próximo ingreso vas a tener que configurarla de nuevo.";
  }
  return "Verificación en dos pasos desactivada.";
}

export const sessionsController = new SessionsController();
