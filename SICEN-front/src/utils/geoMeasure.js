/** Utilidades geodésicas para la herramienta de medición del Centinela. */

export const NAUTICAL_MILE_METERS = 1852;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

/** Distancia de gran círculo en metros (Haversine). */
export function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Rumbo inicial (0–360°, sentido horario desde el norte). */
export function initialBearingDeg(lat1, lon1, lat2, lon2) {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Punto medio aproximado entre dos coordenadas. */
export function midpointLatLng(lat1, lon1, lat2, lon2) {
  return {
    lat: (lat1 + lat2) / 2,
    lng: (lon1 + lon2) / 2,
  };
}

/** Destino a `distanceM` m con rumbo `bearingDeg` desde lat/lon. */
export function destinationLatLng(lat, lon, bearingDeg, distanceM) {
  const R = 6371000;
  const δ = distanceM / R;
  const θ = toRad(bearingDeg);
  const φ1 = toRad(lat);
  const λ1 = toRad(lon);
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
      Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );
  return {
    lat: toDeg(φ2),
    lng: ((toDeg(λ2) + 540) % 360) - 180,
  };
}

/**
 * @param {number} meters
 * @param {'nm' | 'km'} unit
 */
export function formatMeasureDistance(meters, unit) {
  const { value, unitLabel } = formatMeasureDistanceParts(meters, unit);
  return `${value} ${unitLabel}`;
}

/**
 * Partes para UI: si hay más de 5 dígitos (contando decimales), la unidad
 * puede mostrarse debajo del número.
 * @param {number} meters
 * @param {'nm' | 'km'} unit
 * @returns {{ value: string, unitLabel: string, stackUnit: boolean }}
 */
export function formatMeasureDistanceParts(meters, unit) {
  const unitLabel = unit === "km" ? "km" : "MN";
  let value = "0.00";
  if (meters > 0 && Number.isFinite(meters)) {
    value =
      unit === "km"
        ? (meters / 1000).toFixed(2)
        : (meters / NAUTICAL_MILE_METERS).toFixed(2);
  }
  const digitCount = value.replace(/\D/g, "").length;
  return {
    value,
    unitLabel,
    stackUnit: digitCount > 5,
  };
}

/**
 * Etiqueta de tramo: `10.56 MN @ 254°`
 * @param {number} meters
 * @param {number} bearingDeg
 * @param {'nm' | 'km'} unit
 */
export function formatSegmentLabel(meters, bearingDeg, unit) {
  const dist = formatMeasureDistance(meters, unit);
  const brg = Math.round(((bearingDeg % 360) + 360) % 360);
  return `${dist} @ ${brg}°`;
}

/**
 * Rotación CSS (grados) para alinear el texto con el tramo sin dejarlo
 * boca abajo (siempre legible de izquierda a derecha).
 * @param {number} bearingDeg rumbo 0–360 (norte = 0)
 */
export function labelRotationCssDeg(bearingDeg) {
  // Rumbo náutico 0 = norte; CSS 0 = horizontal → restar 90
  let rot = (((bearingDeg % 360) + 360) % 360) - 90;
  // Normalizar a (-180, 180]
  rot = ((((rot + 180) % 360) + 360) % 360) - 180;
  if (rot > 90) rot -= 180;
  if (rot < -90) rot += 180;
  return rot;
}

/**
 * Valor "redondo" de millas náuticas para una barra de escala
 * (≤ maxNm), estilo control de escala de Leaflet.
 */
export function niceScaleBarNm(maxNm) {
  if (!(maxNm > 0) || !Number.isFinite(maxNm)) return 0;
  const exp = Math.floor(Math.log10(maxNm));
  const mag = 10 ** exp;
  const norm = maxNm / mag;
  let nice;
  if (norm >= 5) nice = 5;
  else if (norm >= 2) nice = 2;
  else nice = 1;
  return nice * mag;
}

/** Etiqueta de la barra de escala, p. ej. `5 MN` o `0.5 MN`. */
export function formatScaleBarNm(nm) {
  if (!(nm > 0) || !Number.isFinite(nm)) return "—";
  if (nm >= 10) return `${Math.round(nm)} MN`;
  if (nm >= 1) {
    const rounded = Math.round(nm * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} MN`;
  }
  if (nm >= 0.1) return `${(Math.round(nm * 10) / 10).toFixed(1)} MN`;
  return `${(Math.round(nm * 100) / 100).toFixed(2)} MN`;
}
