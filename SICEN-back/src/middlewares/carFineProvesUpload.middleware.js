import { randomUUID } from "crypto";
import multer from "multer";
import {
  CAR_FINE_PROVES_DIR,
  ensureCarFineProvesDirSync,
} from "../utils/carFineProveFiles.js";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 3;
const FIELD_NAME = "fine_proves";

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureCarFineProvesDirSync();
    cb(null, CAR_FINE_PROVES_DIR);
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
  cb(new Error("Las pruebas deben ser archivos JPEG (.jpg / .jpeg)."));
}

const carFineProvesUpload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: MAX_FILES },
  fileFilter,
});

/**
 * Recibe hasta 3 imágenes JPEG (campo `fine_proves`) de hasta 5 MB cada una.
 * Convierte los errores de Multer en respuestas JSON 400 coherentes con el
 * resto de los endpoints de la API.
 */
export function uploadCarFineProves(req, res, next) {
  carFineProvesUpload.array(FIELD_NAME, MAX_FILES)(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    return mapMulterErrorToJson(err, res);
  });
}

/** Definición de los 3 slots editables individualmente. */
export const PROVE_SLOT_FIELDS = [
  { name: "prove_slot_1", maxCount: 1 },
  { name: "prove_slot_2", maxCount: 1 },
  { name: "prove_slot_3", maxCount: 1 },
];

/**
 * Variante por-slot del middleware: usa `multer.fields()` para aceptar hasta
 * un archivo JPEG por cada slot (`prove_slot_1` … `prove_slot_3`). Si el
 * request no es multipart, Multer simplemente pasa al siguiente middleware.
 */
export function uploadCarFineProveSlots(req, res, next) {
  carFineProvesUpload.fields(PROVE_SLOT_FIELDS)(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    return mapMulterErrorToJson(err, res);
  });
}

function mapMulterErrorToJson(err, res) {
  let msg;
  if (err.code === "LIMIT_FILE_SIZE") {
    msg = "Cada imagen de prueba debe pesar 5 MB o menos.";
  } else if (err.code === "LIMIT_FILE_COUNT") {
    msg = "Solo se permiten hasta 3 imágenes de prueba.";
  } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
    msg = "Campo de archivo inesperado en las pruebas.";
  } else {
    msg = err.message || "Archivo no válido.";
  }
  return res.status(400).json({ ok: false, status: "failed", msg });
}
