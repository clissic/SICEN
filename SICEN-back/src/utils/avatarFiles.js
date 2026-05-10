import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Carpeta física de avatares (fuera de `public` para que `vite build` no borre archivos).
 * Se sirve en HTTP como `/uploads/avatars/<archivo>`.
 */
export const AVATARS_DIR = path.join(__dirname, "..", "..", "storage", "avatars");

/** Prefijo URL público de un avatar guardado en disco. */
export const UPLOADED_AVATAR_PREFIX = "/uploads/avatars/";

export function ensureAvatarsDirSync() {
  try {
    fs.mkdirSync(AVATARS_DIR, { recursive: true });
  } catch (e) {
    logger.error("ensureAvatarsDirSync: " + e);
  }
}

/**
 * Elimina el archivo si la ruta web apunta a `uploads/avatars/` en disco.
 * No borra `/img/avatar.png` ni data URLs.
 */
export function deleteStoredAvatarFile(webPath) {
  if (!webPath || typeof webPath !== "string") return;
  const trimmed = webPath.trim();
  if (!trimmed.startsWith(UPLOADED_AVATAR_PREFIX)) return;

  const relativeName = trimmed
    .slice(UPLOADED_AVATAR_PREFIX.length)
    .replace(/^\/+/, "");
  if (
    !relativeName ||
    relativeName.includes("..") ||
    relativeName.includes("/") ||
    relativeName.includes("\\")
  ) {
    return;
  }

  const absolute = path.join(AVATARS_DIR, relativeName);
  const resolvedDir = path.resolve(AVATARS_DIR);
  if (!absolute.startsWith(resolvedDir)) {
    logger.warn("deleteStoredAvatarFile: ruta fuera de storage/avatars, omitido.");
    return;
  }
  try {
    if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
  } catch (e) {
    logger.warn("deleteStoredAvatarFile: " + e);
  }
}

function sanitizeFilenamePart(s) {
  if (!s || typeof s !== "string") return "usuario";
  const x = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  return (x || "usuario").toLowerCase();
}

/**
 * Nombre de archivo estable: nombre_apellido_<idMongo>.jpg (solo caracteres seguros).
 */
export function avatarBasenameFromUser(firstName, lastName, userId) {
  const fn = sanitizeFilenamePart(firstName);
  const ln = sanitizeFilenamePart(lastName);
  const id = String(userId).replace(/[^a-f0-9]/gi, "");
  return `${fn}_${ln}_${id}.jpg`;
}

/**
 * Renombra el archivo temporal de Multer al nombre definitivo del usuario.
 * Si ya existe un archivo con ese nombre y es distinto del temporal, lo sustituye.
 * @returns Ruta web `/uploads/avatars/...` o `null` si falla.
 */
export function finalizeAvatarFilename(tempFilename, firstName, lastName, userId) {
  if (!tempFilename || !userId) return null;
  ensureAvatarsDirSync();
  const tempBase = path.basename(tempFilename);
  const finalBase = avatarBasenameFromUser(firstName, lastName, userId);
  const resolvedRoot = path.resolve(AVATARS_DIR);
  const fromAbs = path.join(AVATARS_DIR, tempBase);
  const toAbs = path.join(AVATARS_DIR, finalBase);
  if (
    !fromAbs.startsWith(resolvedRoot) ||
    !toAbs.startsWith(resolvedRoot)
  ) {
    return null;
  }
  try {
    if (!fs.existsSync(fromAbs)) {
      logger.warn("finalizeAvatarFilename: archivo temporal no encontrado.");
      return null;
    }
    if (fromAbs === toAbs) {
      return `${UPLOADED_AVATAR_PREFIX}${finalBase}`;
    }
    if (fs.existsSync(toAbs)) {
      fs.unlinkSync(toAbs);
    }
    fs.renameSync(fromAbs, toAbs);
  } catch (e) {
    logger.error("finalizeAvatarFilename: " + e);
    return null;
  }
  return `${UPLOADED_AVATAR_PREFIX}${finalBase}`;
}
