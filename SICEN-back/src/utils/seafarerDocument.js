/** Normaliza DNI (solo dígitos). */
export function normalizeSeafarerDni(raw) {
  return String(raw ?? "").replace(/\D/g, "");
}

/** Normaliza pasaporte (mayúsculas, alfanumérico). */
export function normalizeSeafarerPassport(raw) {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** Normaliza serie de credencial cívica (solo letras, mayúsculas). */
export function normalizeSeafarerCcSeries(raw) {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/** Normaliza número de credencial cívica (solo dígitos). */
export function normalizeSeafarerCcNumber(raw) {
  return String(raw ?? "").replace(/\D/g, "");
}

/**
 * Búsqueda por documento (compatibilidad con consulta antigua).
 * @param {string} documentType — DNI | Pasaporte | CC
 * @param {string} rawNumber
 */
export function normalizeSeafarerDocumentNumber(documentType, raw) {
  const t = String(documentType ?? "").trim();
  if (t === "DNI") return normalizeSeafarerDni(raw);
  if (t === "Pasaporte") return normalizeSeafarerPassport(raw);
  if (t === "CC") return normalizeSeafarerCcNumber(raw);
  return String(raw ?? "").trim();
}
