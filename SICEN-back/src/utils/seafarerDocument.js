/** Normaliza número de documento según tipo (alta y búsqueda). */
export function normalizeSeafarerDocumentNumber(documentType, raw) {
  const v = String(raw ?? "").trim();
  if (documentType === "DNI" || documentType === "Cédula de identidad") {
    return v.replace(/\D/g, "");
  }
  if (documentType === "Pasaporte") {
    return v.toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  return v;
}
