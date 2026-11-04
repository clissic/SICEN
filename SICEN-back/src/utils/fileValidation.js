import { fileTypeFromFile } from "file-type";
import { logger } from "./logger.js";

/**
 * Valida que un archivo cargado tenga el tipo MIME real esperado
 * verificando sus magic bytes (primeros bytes del archivo).
 * 
 * @param {string} filePath - Ruta al archivo en disco
 * @param {string[]} allowedMimes - Array de MIME types permitidos (ej: ['image/jpeg', 'image/png'])
 * @returns {Promise<boolean>} - true si el archivo es válido
 */
export async function validateFileType(filePath, allowedMimes) {
  try {
    const result = await fileTypeFromFile(filePath);
    
    // Si file-type no puede detectar el tipo, rechazamos por seguridad
    if (!result) {
      logger.warn(`fileTypeFromFile returned null for ${filePath}`);
      return false;
    }

    // Verificar que el MIME type real esté en la lista permitida
    const isValid = allowedMimes.includes(result.mime);
    
    if (!isValid) {
      logger.warn(
        `File type validation failed: expected one of [${allowedMimes.join(", ")}], got ${result.mime} for ${filePath}`
      );
    }
    
    return isValid;
  } catch (error) {
    logger.error(`Error validating file type: ${error.message}`);
    return false;
  }
}

/**
 * Valida que un archivo sea una imagen JPEG por magic bytes
 */
export async function validateJpeg(filePath) {
  return validateFileType(filePath, ["image/jpeg"]);
}

/**
 * Valida que un archivo sea un PDF por magic bytes
 */
export async function validatePdf(filePath) {
  return validateFileType(filePath, ["application/pdf"]);
}

/**
 * Valida que un archivo sea una imagen (JPEG, PNG o WebP) por magic bytes
 */
export async function validateImage(filePath) {
  return validateFileType(filePath, [
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);
}

/**
 * Valida que un archivo sea un documento (PDF, DOC, DOCX) por magic bytes
 */
export async function validateDocument(filePath) {
  return validateFileType(filePath, [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]);
}
