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
      const token = signAccessToken(created._id);
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
      if (!user || !isValidPassword(password, user.password)) {
        return res.status(401).json({
          ok: false,
          msg: "Email o contraseña incorrectos.",
        });
      }
      logger.info(
        `${user.rank} ${user.first_name} ${user.last_name} logged in as ${user.role}`
      );
      const token = signAccessToken(user._id);
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

  logout(req, res) {
    return res.status(200).json({
      ok: true,
      msg: "Eliminá el token en el cliente (JWT sin estado en servidor).",
    });
  }
}

export const sessionsController = new SessionsController();
