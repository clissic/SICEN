import { randomUUID } from "crypto";
import path from "path";
import multer from "multer";
import {
  ensureSeafarerLinkIdentityDirSync,
  SEAFARER_LINK_IDENTITY_DIR,
} from "../utils/seafarerLinkIdentityFiles.js";

const MAX_BYTES = 5 * 1024 * 1024;
const FIELD_NAME = "identityDocument";

const ALLOWED = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".pdf", "application/pdf"],
  [".webp", "image/webp"],
]);

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureSeafarerLinkIdentityDirSync();
    cb(null, SEAFARER_LINK_IDENTITY_DIR);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ALLOWED.has(ext) ? ext : ".bin";
    cb(null, `${randomUUID()}${safeExt}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const expected = ALLOWED.get(ext);
  if (!expected) {
    cb(
      new Error(
        "El documento debe ser imagen (JPG, PNG, WEBP) o PDF del frente de la cédula / hoja de datos del pasaporte."
      )
    );
    return;
  }
  const mime = String(file.mimetype || "").toLowerCase();
  const okMime =
    mime === expected ||
    mime === "application/octet-stream" ||
    mime === "" ||
    (expected === "image/jpeg" && mime === "image/pjpeg");
  if (!okMime) {
    cb(new Error("Tipo de archivo no válido para el documento de identidad."));
    return;
  }
  cb(null, true);
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter,
});

function mapMulterErrorToJson(err, res) {
  let msg;
  if (err.code === "LIMIT_FILE_SIZE") {
    msg = "El documento de identidad debe pesar 5 MB o menos.";
  } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
    msg = "Campo de archivo inesperado.";
  } else {
    msg = err.message || "Archivo no válido.";
  }
  return res.status(400).json({ ok: false, msg });
}

/**
 * Recibe un archivo obligatorio en el campo `identityDocument` (foto/PDF).
 */
export function uploadSeafarerLinkIdentityRequired(req, res, next) {
  upload.single(FIELD_NAME)(req, res, (err) => {
    if (err) return mapMulterErrorToJson(err, res);
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        msg: "Adjunte una foto o PDF del frente de su cédula o de la hoja de datos del pasaporte.",
      });
    }
    return next();
  });
}
