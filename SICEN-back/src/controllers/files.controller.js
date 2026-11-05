import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { AVATARS_DIR } from "../utils/avatarFiles.js";
import { CAR_FINE_PROVES_DIR } from "../utils/carFineProveFiles.js";
import { SHIP_FINE_PROVES_DIR } from "../utils/shipFineProveFiles.js";
import { PERSONAL_FINE_PROVES_DIR } from "../utils/personalFineProveFiles.js";
import { INSPECTION_PDFS_DIR } from "../utils/inspectionPDFFiles.js";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuración de tipos de archivos:
 * - baseDir: directorio donde se almacenan los archivos
 * - allowedRoles: roles que pueden acceder (null = cualquier usuario autenticado)
 * - contentTypes: mapeo de extensiones a content-types
 */
const FILE_TYPES = {
  avatars: {
    baseDir: AVATARS_DIR,
    allowedRoles: null, // cualquier usuario autenticado
    contentTypes: {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
    },
  },
  carFineProves: {
    baseDir: CAR_FINE_PROVES_DIR,
    allowedRoles: ["admin", "superAdmin", "contable"],
    contentTypes: {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
    },
  },
  shipFineProves: {
    baseDir: SHIP_FINE_PROVES_DIR,
    allowedRoles: ["admin", "superAdmin"],
    contentTypes: {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
    },
  },
  personalFineProves: {
    baseDir: PERSONAL_FINE_PROVES_DIR,
    allowedRoles: ["admin", "superAdmin"],
    contentTypes: {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
    },
  },
  inspectionsERP: {
    baseDir: INSPECTION_PDFS_DIR,
    allowedRoles: null, // cualquier usuario con tutorial completado
    contentTypes: {
      ".pdf": "application/pdf",
    },
  },
};

/**
 * Valida que el filename no contenga secuencias de path traversal
 */
function isValidFilename(filename) {
  if (!filename || typeof filename !== "string") return false;
  // Bloquea '..' y caracteres peligrosos
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return false;
  }
  // Solo permite nombres de archivo alfanuméricos, guiones, puntos y UUID
  return /^[a-zA-Z0-9._-]+$/.test(filename);
}

/**
 * GET /api/files/:type/:filename
 * Sirve archivos con autenticación y control de permisos
 */
export async function getFile(req, res) {
  try {
    const { type, filename } = req.params;
    const user = req.user;

    // Validar tipo de archivo
    const fileConfig = FILE_TYPES[type];
    if (!fileConfig) {
      return res.status(404).json({
        ok: false,
        msg: "Tipo de archivo no válido.",
      });
    }

    // Validar filename (prevenir path traversal)
    if (!isValidFilename(filename)) {
      logger.warning(`Path traversal attempt blocked: ${type}/${filename} by user ${user._id}`);
      return res.status(400).json({
        ok: false,
        msg: "Nombre de archivo no válido.",
      });
    }

    // Verificar permisos por rol
    if (fileConfig.allowedRoles) {
      if (!fileConfig.allowedRoles.includes(user.role)) {
        logger.info(
          `File access denied: ${type}/${filename} by user ${user._id} (role: ${user.role})`
        );
        return res.status(403).json({
          ok: false,
          msg: "No tiene permisos para acceder a este tipo de archivo.",
        });
      }
    }

    // Construir path completo y resolver
    const baseDir = path.resolve(fileConfig.baseDir);
    const filePath = path.resolve(baseDir, filename);

    // Verificar que el archivo resuelto está dentro del directorio permitido
    if (!filePath.startsWith(baseDir + path.sep)) {
      logger.warning(`Directory escape attempt blocked: ${filePath} by user ${user._id}`);
      return res.status(400).json({
        ok: false,
        msg: "Ruta de archivo no válida.",
      });
    }

    // Verificar que el archivo existe
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        ok: false,
        msg: "Archivo no encontrado.",
      });
    }

    // Determinar content-type por extensión
    const ext = path.extname(filename).toLowerCase();
    const contentType = fileConfig.contentTypes[ext] || "application/octet-stream";

    // Servir el archivo
    res.type(contentType);
    res.sendFile(filePath, (err) => {
      if (err) {
        logger.error(`Error serving file ${type}/${filename}: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).json({
            ok: false,
            msg: "Error al servir el archivo.",
          });
        }
      }
    });
  } catch (error) {
    logger.error(`getFile error: ${error.message}`);
    return res.status(500).json({
      ok: false,
      msg: "Error interno del servidor.",
    });
  }
}
