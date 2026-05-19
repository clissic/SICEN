/** Tipos de documentación deportiva (alineado a `vessels.controller`). */
export const SPORT_RECREATIONAL_DOC_TYPES = [
  "Certificado de Construcción",
  "Registro de Embarcaciones Deportivas",
  "Matrícula de Cabotaje",
  "Extranjero",
];

/**
 * @param {string} shipType
 */
export function isPescaArtesanalShipType(shipType) {
  const s = String(shipType ?? "")
    .trim()
    .toLowerCase();
  if (!s) return false;
  return s.includes("pesca artesanal") || (s.includes("artesanal") && s.includes("pesca"));
}

/**
 * Buques mercantes pesqueros (ultramar/cabotaje), excluye pesca artesanal y deportivos.
 * @param {string} shipType
 */
export function isPesqueroShipType(shipType) {
  if (isPescaArtesanalShipType(shipType)) return false;
  const s = String(shipType ?? "")
    .trim()
    .toLowerCase();
  if (!s) return false;
  if (s.includes("deportivo") || s.includes("sport fishing")) return false;
  return (
    s.includes("pesquer") ||
    s.includes("cerquero") ||
    s.includes("purse seiner") ||
    s.includes("fish factory") ||
    s.includes("fishing mother") ||
    s.includes("fishing reefer") ||
    (s.includes("pesca") && !s.includes("artesanal"))
  );
}
