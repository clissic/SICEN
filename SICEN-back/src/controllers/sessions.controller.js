import { UserMongoose } from "../DAO/models/mongoose/users.mongoose.js";
import { userService } from "../services/users.service.js";
import { createHash, isValidPassword } from "../utils/Bcrypt.js";
import { logger } from "../utils/logger.js";
import { signAccessToken } from "../utils/jwt.util.js";
import { toPublicUser } from "../middlewares/auth.js";

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
    role: u.role,
    fines: u.fines ?? [],
  };
}

class SessionsController {
  me(req, res) {
    const user = req.user;
    if (!user) {
      return res.status(200).json({ ok: true, user: null });
    }
    return res.status(200).json({ ok: true, user });
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
      const existing = await UserMongoose.findOne({ email });
      if (existing) {
        return res.status(400).json({
          ok: false,
          msg: "No se pudo registrar (email en uso o datos inválidos).",
        });
      }
      const created = await userService.create({
        avatar: avatar || "./img/avatar.png",
        first_name,
        last_name,
        rank,
        email,
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
      const user = await UserMongoose.findOne({ email });
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
