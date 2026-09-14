/**
 * Línea Colonia (UY) – Punta Lara (AR): separa franjas de jurisdicción exclusiva
 * en el Río de la Plata (Tratado 1973).
 * Oeste de la línea → J.E. 2 MN; este → J.E. 7 MN.
 *
 * Puntos (WGS84, S/O negativos):
 * - 34°28′23.6″S 057°51′14.9″O
 * - 34°49′08.9″S 057°58′00.4″O
 */

function dmsToDec(deg, min, sec, hemi) {
  const sign = hemi === "S" || hemi === "O" || hemi === "W" ? -1 : 1;
  return sign * (deg + min / 60 + sec / 3600);
}

/** @type {[number, number]} lat, lon — extremo norte (cerca de Colonia) */
export const JE_SPLIT_LINE_NORTH = Object.freeze([
  dmsToDec(34, 28, 23.6, "S"),
  dmsToDec(57, 51, 14.9, "O"),
]);

/** @type {[number, number]} lat, lon — extremo sur (cerca de Punta Lara) */
export const JE_SPLIT_LINE_SOUTH = Object.freeze([
  dmsToDec(34, 49, 8.9, "S"),
  dmsToDec(57, 58, 0.4, "O"),
]);
