import { randomUUID } from "crypto";
import multer from "multer";
import {
  INSPECTION_PDFS_DIR,
  ensureInspectionPdfsDirSync,
} from "../utils/inspectionPDFFiles.js";

const MAX_BYTES = 1 * 1024 * 1024; // 1 MB
const FIELD_NAME = "inspectionPDF";

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureInspectionPdfsDirSync();
    cb(null, INSPECTION_PDFS_DIR);
  },
  filename(_req, _file, cb) {
    cb(null, `${randomUUID()}.pdf`);
  },
});

function fileFilter(_req, file, cb) {
  const name = (file.originalname || "").toLowerCase();
  const okExt = name.endsWith(".pdf");
  const okMime =
    file.mimetype === "application/pdf" ||
    file.mimetype === "" ||
    file.mimetype === "application/octet-stream";
  if (okExt && okMime) {
    cb(null, true);
    return;
  }
  cb(new Error("El archivo de inspección debe ser un PDF (.pdf)."));
}

const inspectionPdfUpload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter,
});

/**
 * Acepta opcionalmente un único PDF (campo `inspectionPDF`) de hasta 1 MB.
 *
 * Convierte errores de Multer en respuestas JSON 400 coherentes con el resto
 * de los endpoints. Si el request no es `multipart/form-data`, Multer
 * simplemente pasa al siguiente middleware con `req.file` indefinido.
 */
export function uploadInspectionPdf(req, res, next) {
  inspectionPdfUpload.single(FIELD_NAME)(req, res, (err) => {
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
    msg = "El PDF de inspección debe pesar 1 MB o menos.";
  } else if (err.code === "LIMIT_FILE_COUNT") {
    msg = "Solo se permite un PDF por inspección.";
  } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
    msg = "Campo de archivo inesperado en la inspección.";
  } else {
    msg = err.message || "Archivo de inspección no válido.";
  }
  return res.status(400).json({ ok: false, msg });
}
