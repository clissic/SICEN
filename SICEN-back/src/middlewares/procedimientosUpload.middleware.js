import path from "path";
import multer from "multer";
import {
  ensureProcedimientosDir,
  sanitizeUploadFilename,
  uniqueFilenameInDir,
} from "../services/unitFiles.service.js";

const MAX_BYTES = 40 * 1024 * 1024;

function createStorage(divisionDir) {
  return multer.diskStorage({
    destination(req, file, cb) {
      try {
        const unit =
          req.unitCode || (req.user?.unit || "").trim().toUpperCase();
        const dir = ensureProcedimientosDir(unit, divisionDir);
        cb(null, dir);
      } catch (e) {
        cb(e);
      }
    },
    filename(req, file, cb) {
      try {
        const unit =
          req.unitCode || (req.user?.unit || "").trim().toUpperCase();
        const dir = ensureProcedimientosDir(unit, divisionDir);
        const safe = sanitizeUploadFilename(file.originalname);
        const finalName = uniqueFilenameInDir(dir, safe);
        cb(null, finalName);
      } catch (e) {
        cb(e);
      }
    },
  });
}

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if ([".pdf", ".doc", ".docx"].includes(ext)) {
    cb(null, true);
    return;
  }
  cb(
    new Error(
      "Tipo de archivo no permitido. Use solo .pdf, .doc o .docx."
    )
  );
}

/**
 * @param {"DIV-I" | "DIV-II"} divisionDir
 */
export function procedimientosUploadSingle(divisionDir) {
  return multer({
    storage: createStorage(divisionDir),
    limits: { fileSize: MAX_BYTES },
    fileFilter,
  }).single("file");
}
