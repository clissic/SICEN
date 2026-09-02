/**
 * Convierte grados decimales a grados, minutos y segundos de arco (DMS).
 */
export function decimalToDms(value) {
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  return { degrees, minutes, seconds };
}

/**
 * @param {number} value Latitud o longitud en grados decimales
 * @param {"lat"|"lng"} kind
 * @returns {string} Ej. `34° 54′ 04.2″ S`
 */
export function formatCoordDms(value, kind) {
  if (!Number.isFinite(value)) return "—";
  const { degrees, minutes, seconds } = decimalToDms(value);
  const hemi =
    kind === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "O";
  const minStr = String(minutes).padStart(2, "0");
  const secStr = seconds.toFixed(1).padStart(4, "0");
  return `${degrees}° ${minStr}′ ${secStr}″ ${hemi}`;
}

/**
 * Etiqueta legible para par lat/lng (emails, popups).
 */
export function formatCoordPairLabel(lat, lng) {
  const latDms = formatCoordDms(lat, "lat");
  const lngDms = formatCoordDms(lng, "lng");
  if (latDms === "—" && lngDms === "—") return "";
  return `Lat. ${latDms} · Long. ${lngDms}`;
}
