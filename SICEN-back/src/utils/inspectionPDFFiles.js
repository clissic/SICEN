import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Carpeta física para los PDFs de inspecciones del Estado Rector de Puertos
 * (fuera de `public` para que `vite build` no borre archivos y para evitar
 * que el SPA los sirva automáticamente). Los archivos se exponen por HTTP
 * como `/uploads/inspectionsERP/<archivo>`.
 */
export const INSPECTION_PDFS_DIR = path.join(
  __dirname,
  "..",
  "..",
  "storage",
  "inspectionsERP"
);

/** Prefijo URL público para un PDF de inspección guardado en disco. */
export const UPLOADED_INSPECTION_PDF_PREFIX = "/uploads/inspectionsERP/";

export function ensureInspectionPdfsDirSync() {
  try {
    fs.mkdirSync(INSPECTION_PDFS_DIR, { recursive: true });
  } catch (e) {
    logger.error("ensureInspectionPdfsDirSync: " + e);
  }
}

function isSafeBasename(name) {
  return (
    typeof name === "string" &&
    name.length > 0 &&
    !name.includes("..") &&
    !name.includes("/") &&
    !name.includes("\\")
  );
}

/**
 * Sanitiza un identificador de Mongo para usarlo como nombre de archivo
 * (solo hex alfanumérico tras descartar cualquier otro carácter).
 */
function sanitizeInspectionIdForFilename(id) {
  if (id == null) return "";
  return String(id)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Renombra el archivo temporal que dejó Multer (`<uuid>.pdf`) al nombre
 * definitivo `<inspectionId>.pdf`. Si ya existe un PDF con ese nombre, lo
 * sobrescribe (el nuevo prima sobre el anterior).
 *
 * @param {{ filename: string }|null|undefined} file Archivo crudo de Multer.
 * @param {string|import("mongoose").Types.ObjectId} inspectionId
 * @returns {string|null} URL pública final (`/uploads/inspectionsERP/...`) o `null`.
 */
export function renameInspectionPdfByInspectionId(file, inspectionId) {
  if (!file?.filename) return null;
  ensureInspectionPdfsDirSync();

  const safeId = sanitizeInspectionIdForFilename(inspectionId);
  const fromAbs = path.join(INSPECTION_PDFS_DIR, file.filename);
  const root = path.resolve(INSPECTION_PDFS_DIR);

  if (!fromAbs.startsWith(root)) {
    logger.warn("renameInspectionPdfByInspectionId: ruta fuera de storage.");
    return null;
  }

  if (!safeId) {
    return `${UPLOADED_INSPECTION_PDF_PREFIX}${file.filename}`;
  }

  const finalBase = `${safeId}.pdf`;
  const toAbs = path.join(INSPECTION_PDFS_DIR, finalBase);
  if (!toAbs.startsWith(root)) {
    logger.warn(
      "renameInspectionPdfByInspectionId: nombre final fuera de storage."
    );
    return null;
  }

  try {
    if (!fs.existsSync(fromAbs)) {
      logger.warn(
        `renameInspectionPdfByInspectionId: archivo temporal ${file.filename} no existe.`
      );
      return null;
    }
    if (fromAbs !== toAbs) {
      if (fs.existsSync(toAbs)) fs.unlinkSync(toAbs);
      fs.renameSync(fromAbs, toAbs);
    }
    return `${UPLOADED_INSPECTION_PDF_PREFIX}${finalBase}`;
  } catch (e) {
    logger.error(`renameInspectionPdfByInspectionId falla: ${e}`);
    try {
      if (fs.existsSync(fromAbs)) fs.unlinkSync(fromAbs);
    } catch {
      /* swallow */
    }
    return null;
  }
}

/**
 * Elimina del disco un PDF previamente almacenado, identificándolo por su URL
 * pública. Ignora URLs externas, data URLs y rutas con `..`/separadores.
 *
 * @param {string|null|undefined} webPath
 */
export function deleteStoredInspectionPdf(webPath) {
  if (!webPath || typeof webPath !== "string") return;
  const trimmed = webPath.trim();
  if (!trimmed.startsWith(UPLOADED_INSPECTION_PDF_PREFIX)) return;

  const relativeName = trimmed
    .slice(UPLOADED_INSPECTION_PDF_PREFIX.length)
    .replace(/^\/+/, "");
  if (!isSafeBasename(relativeName)) return;

  const abs = path.join(INSPECTION_PDFS_DIR, relativeName);
  const root = path.resolve(INSPECTION_PDFS_DIR);
  if (!abs.startsWith(root)) {
    logger.warn(
      "deleteStoredInspectionPdf: ruta fuera de storage/inspectionsERP, omitido."
    );
    return;
  }
  try {
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (e) {
    logger.warn("deleteStoredInspectionPdf: " + e);
  }
}
