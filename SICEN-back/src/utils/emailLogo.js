import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const SICEN_EMAIL_LOGO_CID = "sicen-logo-pnn";
const LOGO_FILENAME = "Logo-PNN-Blanco.png";

/** Rutas posibles del logo (build en back o fuente en front). */
function resolveLogoPath() {
  const candidates = [
    path.join(__dirname, "../assets/email", LOGO_FILENAME),
    path.join(__dirname, "../../public/img", LOGO_FILENAME),
    path.join(__dirname, "../../../SICEN-front/public/img", LOGO_FILENAME),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

let cachedAttachment = null;
let warnedMissing = false;

/** Adjunto inline (CID) para el logo del encabezado de correos SICEN. */
export function getSicenEmailLogoAttachment() {
  if (cachedAttachment) return cachedAttachment;
  const logoPath = resolveLogoPath();
  if (!logoPath) {
    if (!warnedMissing) {
      logger.error(
        `[SICEN] Logo de email no encontrado (${LOGO_FILENAME}). Buscado en public/img y SICEN-front/public/img.`
      );
      warnedMissing = true;
    }
    return null;
  }
  cachedAttachment = {
    filename: LOGO_FILENAME,
    path: logoPath,
    cid: SICEN_EMAIL_LOGO_CID,
    contentType: "image/png",
    contentDisposition: "inline",
  };
  return cachedAttachment;
}

/** Prepend logo CID; evita duplicar si ya está en la lista. */
export function mergeSicenEmailAttachments(attachments = []) {
  const logo = getSicenEmailLogoAttachment();
  if (!logo) return attachments;
  const list = Array.isArray(attachments) ? attachments : [];
  if (list.some((a) => a?.cid === SICEN_EMAIL_LOGO_CID)) return list;
  return [logo, ...list];
}
