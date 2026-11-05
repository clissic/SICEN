import path from "path";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import multer from "multer";
import {
  ensureProcedimientosDir,
} from "../services/unitFiles.service.js";
import { validateDocument } from "../utils/fileValidation.js";

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
        const ext = path.extname(file.originalname || "").toLowerCase();
        const safeExt = [".pdf", ".doc", ".docx"].includes(ext) ? ext : ".bin";
        const finalName = `${randomUUID()}${safeExt}`;
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
  const multerInstance = multer({
    storage: createStorage(divisionDir),
    limits: { fileSize: MAX_BYTES },
    fileFilter,
  }).single("file");

  return (req, res, next) => {
    multerInstance(req, res, async (err) => {
      if (err) {
        const msg = err.code === "LIMIT_FILE_SIZE" 
          ? "El archivo supera el límite de 40 MB."
          : err.message || "Archivo no válido.";
        return res.status(400).json({ ok: false, msg });
      }

      // Si no se subió archivo, continuar
      if (!req.file) {
        return next();
      }

      // Validar tipo de archivo por magic bytes
      const isValid = await validateDocument(req.file.path);
      if (!isValid) {
        // Eliminar el archivo inválido
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          ok: false,
          msg: "El archivo no es un documento válido (PDF, DOC o DOCX).",
        });
      }

      next();
    });
  };
}
