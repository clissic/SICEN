import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Carpeta física para imágenes de pruebas de multas de buques
 * (fuera de `public` para que `vite build` no borre archivos).
 * Se sirve por HTTP como `/uploads/shipFineProves/<archivo>`.
 */
export const SHIP_FINE_PROVES_DIR = path.join(
  __dirname,
  "..",
  "..",
  "storage",
  "shipFineProves"
);

/** Prefijo URL público para una imagen de prueba guardada en disco. */
export const UPLOADED_SHIP_FINE_PROVES_PREFIX = "/uploads/shipFineProves/";

export function ensureShipFineProvesDirSync() {
  try {
    fs.mkdirSync(SHIP_FINE_PROVES_DIR, { recursive: true });
  } catch (e) {
    logger.error("ensureShipFineProvesDirSync: " + e);
  }
}

/**
 * Elimina un archivo previamente subido si su ruta web apunta a
 * `uploads/shipFineProves/` en disco. Ignora rutas externas y data URLs.
 */
export function deleteStoredProveFile(webPath) {
  if (!webPath || typeof webPath !== "string") return;
  const trimmed = webPath.trim();
  if (!trimmed.startsWith(UPLOADED_SHIP_FINE_PROVES_PREFIX)) return;

  const relativeName = trimmed
    .slice(UPLOADED_SHIP_FINE_PROVES_PREFIX.length)
    .replace(/^\/+/, "");
  if (
    !relativeName ||
    relativeName.includes("..") ||
    relativeName.includes("/") ||
    relativeName.includes("\\")
  ) {
    return;
  }

  const absolute = path.join(SHIP_FINE_PROVES_DIR, relativeName);
  const resolvedDir = path.resolve(SHIP_FINE_PROVES_DIR);
  if (!absolute.startsWith(resolvedDir)) {
    logger.warn(
      "deleteStoredProveFile (ship): ruta fuera de storage/shipFineProves, omitido."
    );
    return;
  }
  try {
    if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
  } catch (e) {
    logger.warn("deleteStoredProveFile (ship): " + e);
  }
}

export function deleteStoredProveFiles(webPaths) {
  if (!Array.isArray(webPaths)) return;
  for (const wp of webPaths) {
    deleteStoredProveFile(wp);
  }
}

/** Normaliza un identificador para uso seguro como nombre de archivo. */
export function sanitizeIdForFilename(id) {
  if (id == null) return "";
  return String(id)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Renombra los archivos temporales (`<uuid>.jpg`) guardados por Multer al
 * formato definitivo `<fine_number><N>.jpg` (N = 1, 2, 3).
 */
export function renameProveFilesByFineNumber(files, fineNumber) {
  if (!Array.isArray(files) || files.length === 0) return [];
  ensureShipFineProvesDirSync();

  const sanitized = sanitizeIdForFilename(fineNumber);
  const resolvedRoot = path.resolve(SHIP_FINE_PROVES_DIR);
  const finalUrls = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (!f?.filename) continue;

    const fromAbs = path.join(SHIP_FINE_PROVES_DIR, f.filename);

    if (!sanitized) {
      finalUrls.push(`${UPLOADED_SHIP_FINE_PROVES_PREFIX}${f.filename}`);
      continue;
    }

    const finalBase = `${sanitized}${i + 1}.jpg`;
    const toAbs = path.join(SHIP_FINE_PROVES_DIR, finalBase);

    if (!fromAbs.startsWith(resolvedRoot) || !toAbs.startsWith(resolvedRoot)) {
      logger.warn(
        "renameProveFilesByFineNumber (ship): ruta fuera del directorio, omitido."
      );
      finalUrls.push(`${UPLOADED_SHIP_FINE_PROVES_PREFIX}${f.filename}`);
      continue;
    }

    try {
      if (!fs.existsSync(fromAbs)) {
        logger.warn(
          `renameProveFilesByFineNumber (ship): archivo temporal ${f.filename} no existe.`
        );
        finalUrls.push(`${UPLOADED_SHIP_FINE_PROVES_PREFIX}${f.filename}`);
        continue;
      }
      if (fromAbs !== toAbs) {
        if (fs.existsSync(toAbs)) {
          fs.unlinkSync(toAbs);
        }
        fs.renameSync(fromAbs, toAbs);
      }
      finalUrls.push(`${UPLOADED_SHIP_FINE_PROVES_PREFIX}${finalBase}`);
    } catch (e) {
      logger.error(
        `renameProveFilesByFineNumber (ship) falla en ${finalBase}: ${e}`
      );
      finalUrls.push(`${UPLOADED_SHIP_FINE_PROVES_PREFIX}${f.filename}`);
    }
  }

  return finalUrls;
}

/** Basename del archivo a partir de su URL pública `/uploads/shipFineProves/...`. */
export function proveBasenameFromUrl(url) {
  if (typeof url !== "string") return null;
  if (!url.startsWith(UPLOADED_SHIP_FINE_PROVES_PREFIX)) return null;
  return url.slice(UPLOADED_SHIP_FINE_PROVES_PREFIX.length).replace(/^\/+/, "");
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
 * Aplica un conjunto de cambios slot-a-slot al array `fine_proves` de una
 * multa de buque. Idéntica lógica a la de multas vehiculares, sólo cambia el
 * directorio físico.
 */
export function applyProveUpdatesForFine({
  existingProves,
  slotActions,
  slotFiles,
  fineNumber,
}) {
  ensureShipFineProvesDirSync();
  const root = path.resolve(SHIP_FINE_PROVES_DIR);
  const sanitized = sanitizeIdForFilename(fineNumber);

  const existing = Array.isArray(existingProves) ? existingProves : [];
  const slots = [];
  const toDelete = new Set();

  for (let i = 0; i < 3; i++) {
    const action = slotActions?.[i] || "keep";
    const existingUrl = existing[i] || null;
    const newFile = slotFiles?.[i] || null;

    if (action === "remove") {
      if (existingUrl) toDelete.add(proveBasenameFromUrl(existingUrl));
      slots.push(null);
    } else if (action === "replace") {
      if (existingUrl) toDelete.add(proveBasenameFromUrl(existingUrl));
      if (newFile?.filename) {
        slots.push({ type: "new", basename: newFile.filename });
      } else {
        slots.push(null);
      }
    } else {
      if (existingUrl) {
        slots.push({
          type: "existing",
          basename: proveBasenameFromUrl(existingUrl),
        });
      } else {
        slots.push(null);
      }
    }
  }

  for (let i = 3; i < existing.length; i++) {
    if (existing[i]) toDelete.add(proveBasenameFromUrl(existing[i]));
  }

  const compacted = slots.filter(Boolean);

  const stagedNames = [];
  for (const slot of compacted) {
    if (!slot.basename || !isSafeBasename(slot.basename)) {
      stagedNames.push(null);
      continue;
    }
    const fromAbs = path.join(SHIP_FINE_PROVES_DIR, slot.basename);
    const tmpName = `${randomUUID()}.tmp.jpg`;
    const tmpAbs = path.join(SHIP_FINE_PROVES_DIR, tmpName);
    if (!fromAbs.startsWith(root) || !tmpAbs.startsWith(root)) {
      stagedNames.push(null);
      continue;
    }
    try {
      if (!fs.existsSync(fromAbs)) {
        logger.warn(
          `applyProveUpdatesForFine (ship): archivo ${slot.basename} no existe.`
        );
        stagedNames.push(null);
        continue;
      }
      fs.renameSync(fromAbs, tmpAbs);
      stagedNames.push(tmpName);
      toDelete.delete(slot.basename);
    } catch (e) {
      logger.error(`applyProveUpdatesForFine (ship) staging falla: ${e}`);
      stagedNames.push(null);
    }
  }

  const finalUrls = [];
  for (let i = 0; i < compacted.length; i++) {
    const tmp = stagedNames[i];
    if (!tmp) continue;
    const tmpAbs = path.join(SHIP_FINE_PROVES_DIR, tmp);
    const finalBase = sanitized
      ? `${sanitized}${i + 1}.jpg`
      : tmp.replace(/\.tmp\.jpg$/, ".jpg");
    const toAbs = path.join(SHIP_FINE_PROVES_DIR, finalBase);
    if (!toAbs.startsWith(root)) continue;
    try {
      if (fs.existsSync(toAbs) && tmpAbs !== toAbs) {
        fs.unlinkSync(toAbs);
      }
      if (tmpAbs !== toAbs) {
        fs.renameSync(tmpAbs, toAbs);
      }
      finalUrls.push(`${UPLOADED_SHIP_FINE_PROVES_PREFIX}${finalBase}`);
    } catch (e) {
      logger.error(`applyProveUpdatesForFine (ship) commit falla: ${e}`);
    }
  }

  for (const baseName of toDelete) {
    if (!baseName || !isSafeBasename(baseName)) continue;
    const abs = path.join(SHIP_FINE_PROVES_DIR, baseName);
    if (!abs.startsWith(root)) continue;
    try {
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch (e) {
      logger.warn(`applyProveUpdatesForFine (ship) delete: ${e}`);
    }
  }

  return finalUrls;
}
