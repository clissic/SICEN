import { randomUUID } from "crypto";
import multer from "multer";
import {
  SHIP_FINE_PROVES_DIR,
  ensureShipFineProvesDirSync,
} from "../utils/shipFineProveFiles.js";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 3;
const FIELD_NAME = "fine_proves";

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureShipFineProvesDirSync();
    cb(null, SHIP_FINE_PROVES_DIR);
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

const shipFineProvesUpload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: MAX_FILES },
  fileFilter,
});

export function uploadShipFineProves(req, res, next) {
  shipFineProvesUpload.array(FIELD_NAME, MAX_FILES)(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    return mapMulterErrorToJson(err, res);
  });
}

export const PROVE_SLOT_FIELDS = [
  { name: "prove_slot_1", maxCount: 1 },
  { name: "prove_slot_2", maxCount: 1 },
  { name: "prove_slot_3", maxCount: 1 },
];

export function uploadShipFineProveSlots(req, res, next) {
  shipFineProvesUpload.fields(PROVE_SLOT_FIELDS)(req, res, (err) => {
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
