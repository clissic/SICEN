import { UserMongoose } from "../DAO/models/mongoose/users.mongoose.js";
import { userService } from "../services/users.service.js";
import { createHash, isValidPassword } from "../utils/Bcrypt.js";
import { logger } from "../utils/logger.js";
import { signAccessToken } from "../utils/jwt.util.js";
import { toPublicUser } from "../middlewares/auth.js";
import { mergeUserStatesFromDocument } from "../constants/userStates.js";

function publicShape(user) {
  if (!user) return null;
  const u = toPublicUser(user);
  return {
    _id: u._id,
    avatar: u.avatar,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    rank: u.rank,
    unit: u.unit ?? "",
    role: u.role,
    fines: u.fines ?? [],
    states: mergeUserStatesFromDocument(u.states),
    userTutorial: u.userTutorial === true,
  };
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
}

export const sessionsController = new SessionsController();
