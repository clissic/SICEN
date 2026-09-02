import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Carpeta física de documentos de identidad adjuntos a solicitudes de vinculación. */
export const SEAFARER_LINK_IDENTITY_DIR = path.join(
  __dirname,
  "..",
  "..",
  "storage",
  "seafarerLinkIdentity"
);

export function ensureSeafarerLinkIdentityDirSync() {
  try {
    fs.mkdirSync(SEAFARER_LINK_IDENTITY_DIR, { recursive: true });
  } catch (e) {
    logger.error("ensureSeafarerLinkIdentityDirSync: " + e);
  }
}

/**
 * Elimina un archivo almacenado por nombre relativo (sin path traversal).
 */
export function deleteSeafarerLinkIdentityFile(storedName) {
  const name = String(storedName || "").trim();
  if (
    !name ||
    name.includes("..") ||
    name.includes("/") ||
    name.includes("\\")
  ) {
    return;
  }
  ensureSeafarerLinkIdentityDirSync();
  const absolute = path.join(SEAFARER_LINK_IDENTITY_DIR, name);
  const resolvedRoot = path.resolve(SEAFARER_LINK_IDENTITY_DIR);
  if (!absolute.startsWith(resolvedRoot)) return;
  try {
    if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
  } catch (e) {
    logger.warn("deleteSeafarerLinkIdentityFile: " + e);
  }
}

export function resolveSeafarerLinkIdentityAbsolute(storedName) {
  const name = String(storedName || "").trim();
  if (
    !name ||
    name.includes("..") ||
    name.includes("/") ||
    name.includes("\\")
  ) {
    return null;
  }
  ensureSeafarerLinkIdentityDirSync();
  const absolute = path.join(SEAFARER_LINK_IDENTITY_DIR, name);
  const resolvedRoot = path.resolve(SEAFARER_LINK_IDENTITY_DIR);
  if (!absolute.startsWith(resolvedRoot)) return null;
  if (!fs.existsSync(absolute)) return null;
  return absolute;
}
