/**
 * Convierte una URL de archivo antigua (pública) a la nueva ruta autenticada.
 * 
 * URLs antiguas:
 * - /uploads/avatars/filename.jpg
 * - /uploads/carFineProves/filename.jpg
 * - /uploads/shipFineProves/filename.jpg
 * - /uploads/personalFineProves/filename.jpg
 * - /uploads/inspectionsERP/filename.pdf
 * 
 * URLs nuevas:
 * - /api/files/avatars/filename.jpg
 * - /api/files/carFineProves/filename.jpg
 * - /api/files/shipFineProves/filename.jpg
 * - /api/files/personalFineProves/filename.jpg
 * - /api/files/inspectionsERP/filename.pdf
 * 
 * @param {string} url - URL del archivo (puede ser antigua o nueva)
 * @returns {string} - URL autenticada
 */
export function toAuthenticatedFileUrl(url) {
  if (!url || typeof url !== "string") return "";
  
  // Si ya es una URL autenticada, devolverla sin cambios
  if (url.startsWith("/api/files/")) {
    return url;
  }
  
  // Convertir URLs antiguas
  const uploadsMatch = url.match(/^\/uploads\/(avatars|carFineProves|shipFineProves|personalFineProves|inspectionsERP)\/(.+)$/);
  if (uploadsMatch) {
    const [, type, filename] = uploadsMatch;
    return `/api/files/${type}/${filename}`;
  }
  
  // Si no coincide con ningún patrón conocido, devolver la URL original
  return url;
}

/**
 * True si la URL apunta a un archivo servido por /api/files (o la ruta
 * pública vieja /uploads/ que el helper convierte).
 */
export function isProtectedFileUrl(url) {
  if (!url || typeof url !== "string") return false;
  return url.startsWith("/uploads/") || url.startsWith("/api/files/");
}

/**
 * Convierte un array de URLs a URLs autenticadas
 */
export function toAuthenticatedFileUrls(urls) {
  if (!Array.isArray(urls)) return [];
  return urls.map(toAuthenticatedFileUrl);
}

/**
 * Dado un objeto con URLs de archivos (ej: inspection.inspectionPDF),
 * retorna una copia con las URLs convertidas a autenticadas.
 */
export function withAuthenticatedUrls(obj, urlFields) {
  if (!obj || typeof obj !== "object") return obj;
  const result = { ...obj };
  for (const field of urlFields) {
    if (field in result && result[field]) {
      if (Array.isArray(result[field])) {
        result[field] = toAuthenticatedFileUrls(result[field]);
      } else {
        result[field] = toAuthenticatedFileUrl(result[field]);
      }
    }
  }
  return result;
}
