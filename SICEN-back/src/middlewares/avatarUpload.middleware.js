import { randomUUID } from "crypto";
import fs from "fs/promises";
import multer from "multer";
import {
  AVATARS_DIR,
  ensureAvatarsDirSync,
} from "../utils/avatarFiles.js";
import { validateJpeg } from "../utils/fileValidation.js";

const MAX_BYTES = 1024 * 1024;

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureAvatarsDirSync();
    cb(null, AVATARS_DIR);
  },
  filename(_req, _file, cb) {
    cb(null, `${randomUUID()}.jpg`);
  },
});

function fileFilter(_req, file, cb) {
  const name = (file.originalname || "").toLowerCase();
  const okExt = name.endsWith(".jpg") || name.endsWith(".jpeg");
  const okMime =
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/pjpeg" ||
    file.mimetype === "" ||
    file.mimetype === "application/octet-stream";
  if (okExt && okMime) {
    cb(null, true);
    return;
  }
  if (file.mimetype === "image/jpeg") {
    cb(null, true);
    return;
  }
  cb(new Error("La foto de perfil debe ser un archivo JPEG (.jpg / .jpeg)."));
}

export const avatarUpload = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter,
});

/** `single("avatar")` con respuesta JSON ante error de multer. */
export function uploadAvatarOptional(req, res, next) {
  avatarUpload.single("avatar")(req, res, async (err) => {
    if (err) {
      const msg =
        err.code === "LIMIT_FILE_SIZE"
          ? "La imagen supera 1 MB."
          : err.message || "Archivo no válido.";
      return res.status(400).json({ ok: false, msg });
    }

    // Si no se subió archivo, continuar (es opcional)
    if (!req.file) {
      return next();
    }

    // Validar tipo de archivo por magic bytes
    const isValid = await validateJpeg(req.file.path);
    if (!isValid) {
      // Eliminar el archivo inválido
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        ok: false,
        msg: "El archivo no es una imagen JPEG válida.",
      });
    }

    next();
  });
}
