/**
 * Utilidades náuticas para SICEN usando geodesy (elipsoide WGS84).
 * 
 * Proporciona cálculos precisos de:
 * - Distancias ortodrómicas (gran círculo) en millas náuticas
 * - Rumbo inicial y final
 * - Punto destino dada distancia y rumbo
 * - Parsing y formateo DMS consistente con geoDms.js
 */

import LatLon from "geodesy/latlon-ellipsoidal-vincenty.js";
import Dms from "geodesy/dms.js";
import { formatCoordDms, parseCoordDms } from "./geoDms.js";

/** Milla náutica internacional en metros. */
export const NAUTICAL_MILE_METERS = 1852;

/**
 * Calcula la distancia ortodrómica (gran círculo) entre dos puntos usando
 * el elipsoide WGS84 (fórmula de Vincenty).
 * 
 * @param {number} lat1 - Latitud del punto 1 en grados decimales
 * @param {number} lon1 - Longitud del punto 1 en grados decimales
 * @param {number} lat2 - Latitud del punto 2 en grados decimales
 * @param {number} lon2 - Longitud del punto 2 en grados decimales
 * @returns {number} Distancia en metros
 */
export function distanceMetersWgs84(lat1, lon1, lat2, lon2) {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return 0;
  }

  try {
    const p1 = new LatLon(lat1, lon1);
    const p2 = new LatLon(lat2, lon2);
    return p1.distanceTo(p2);
  } catch {
    return 0;
  }
}

/**
 * Calcula la distancia ortodrómica en millas náuticas.
 * 
 * @param {number} lat1 - Latitud del punto 1 en grados decimales
 * @param {number} lon1 - Longitud del punto 1 en grados decimales
 * @param {number} lat2 - Latitud del punto 2 en grados decimales
 * @param {number} lon2 - Longitud del punto 2 en grados decimales
 * @returns {number} Distancia en millas náuticas
 */
export function distanceNauticalMiles(lat1, lon1, lat2, lon2) {
  const meters = distanceMetersWgs84(lat1, lon1, lat2, lon2);
  return meters / NAUTICAL_MILE_METERS;
}

/**
 * Calcula el rumbo inicial (bearing) desde el punto 1 hacia el punto 2.
 * 
 * @param {number} lat1 - Latitud del punto 1 en grados decimales
 * @param {number} lon1 - Longitud del punto 1 en grados decimales
 * @param {number} lat2 - Latitud del punto 2 en grados decimales
 * @param {number} lon2 - Longitud del punto 2 en grados decimales
 * @returns {number} Rumbo en grados (0-360, norte = 0, sentido horario)
 */
export function initialBearingDeg(lat1, lon1, lat2, lon2) {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return 0;
  }

  try {
    const p1 = new LatLon(lat1, lon1);
    const p2 = new LatLon(lat2, lon2);
    return p1.initialBearingTo(p2);
  } catch {
    return 0;
  }
}

/**
 * Calcula el rumbo final (bearing) al llegar al punto 2 desde el punto 1.
 * 
 * @param {number} lat1 - Latitud del punto 1 en grados decimales
 * @param {number} lon1 - Longitud del punto 1 en grados decimales
 * @param {number} lat2 - Latitud del punto 2 en grados decimales
 * @param {number} lon2 - Longitud del punto 2 en grados decimales
 * @returns {number} Rumbo final en grados (0-360)
 */
export function finalBearingDeg(lat1, lon1, lat2, lon2) {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return 0;
  }

  try {
    const p1 = new LatLon(lat1, lon1);
    const p2 = new LatLon(lat2, lon2);
    return p1.finalBearingTo(p2);
  } catch {
    return 0;
  }
}

/**
 * Calcula el punto destino dado un punto de origen, rumbo y distancia.
 * 
 * @param {number} lat - Latitud del punto de origen en grados decimales
 * @param {number} lon - Longitud del punto de origen en grados decimales
 * @param {number} bearingDeg - Rumbo en grados (0-360, norte = 0)
 * @param {number} distanceM - Distancia en metros
 * @returns {{ lat: number, lng: number }} Coordenadas del punto destino
 */
export function destinationPoint(lat, lon, bearingDeg, distanceM) {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    !Number.isFinite(bearingDeg) ||
    !Number.isFinite(distanceM)
  ) {
    return { lat: lat || 0, lng: lon || 0 };
  }

  try {
    const p1 = new LatLon(lat, lon);
    const p2 = p1.destinationPoint(distanceM, bearingDeg);
    return { lat: p2.lat, lng: p2.lon };
  } catch {
    return { lat: lat || 0, lng: lon || 0 };
  }
}

/**
 * Calcula el punto intermedio entre dos puntos (midpoint) a lo largo del
 * gran círculo.
 * 
 * @param {number} lat1 - Latitud del punto 1 en grados decimales
 * @param {number} lon1 - Longitud del punto 1 en grados decimales
 * @param {number} lat2 - Latitud del punto 2 en grados decimales
 * @param {number} lon2 - Longitud del punto 2 en grados decimales
 * @returns {{ lat: number, lng: number }} Coordenadas del punto intermedio
 */
export function midpoint(lat1, lon1, lat2, lon2) {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return {
      lat: (lat1 + lat2) / 2 || 0,
      lng: (lon1 + lon2) / 2 || 0,
    };
  }

  try {
    const p1 = new LatLon(lat1, lon1);
    const p2 = new LatLon(lat2, lon2);
    const mid = p1.midpointTo(p2);
    return { lat: mid.lat, lng: mid.lon };
  } catch {
    return {
      lat: (lat1 + lat2) / 2 || 0,
      lng: (lon1 + lon2) / 2 || 0,
    };
  }
}

/**
 * Formatea una distancia en millas náuticas para mostrar al usuario.
 * 
 * @param {number} nauticalMiles - Distancia en millas náuticas
 * @param {number} [decimals=2] - Cantidad de decimales
 * @returns {string} Texto formateado, ej. "12.34 MN"
 */
export function formatNauticalMiles(nauticalMiles, decimals = 2) {
  if (!Number.isFinite(nauticalMiles) || nauticalMiles < 0) {
    return "0.00 MN";
  }
  return `${nauticalMiles.toFixed(decimals)} MN`;
}

/**
 * Formatea un rumbo en grados para mostrar al usuario.
 * 
 * @param {number} bearingDeg - Rumbo en grados (0-360)
 * @returns {string} Texto formateado, ej. "254°"
 */
export function formatBearing(bearingDeg) {
  if (!Number.isFinite(bearingDeg)) {
    return "—";
  }
  const normalized = Math.round(((bearingDeg % 360) + 360) % 360);
  return `${normalized}°`;
}

/**
 * Convierte coordenadas DMS (grados, minutos, segundos) a grados decimales
 * usando el parser de geodesy.
 * 
 * Para mantener consistencia con geoDms.js, se usa parseCoordDms cuando el
 * texto tiene hemisferio explícito.
 * 
 * @param {string} dmsString - Texto DMS, ej. "34° 53′ 43.4″ S"
 * @param {"lat"|"lng"} kind - Tipo de coordenada
 * @returns {number|null} Grados decimales o null si no es válido
 */
export function parseDmsToDecimal(dmsString, kind) {
  return parseCoordDms(dmsString, kind);
}

/**
 * Convierte grados decimales a formato DMS para mostrar al usuario.
 * Usa el formato estándar de SICEN (skill geo-dms-format).
 * 
 * @param {number} decimal - Grados decimales
 * @param {"lat"|"lng"} kind - Tipo de coordenada
 * @returns {string} Texto DMS, ej. "34° 53′ 43.4″ S"
 */
export function formatDecimalToDms(decimal, kind) {
  return formatCoordDms(decimal, kind);
}

/**
 * Calcula distancia y rumbo entre dos puntos, retornando un objeto completo
 * para uso en mediciones y análisis náuticos.
 * 
 * @param {number} lat1 - Latitud del punto 1 en grados decimales
 * @param {number} lon1 - Longitud del punto 1 en grados decimales
 * @param {number} lat2 - Latitud del punto 2 en grados decimales
 * @param {number} lon2 - Longitud del punto 2 en grados decimales
 * @returns {{
 *   distanceMeters: number,
 *   distanceNauticalMiles: number,
 *   initialBearing: number,
 *   finalBearing: number,
 *   midpoint: { lat: number, lng: number }
 * }}
 */
export function calculateLeg(lat1, lon1, lat2, lon2) {
  const distanceMeters = distanceMetersWgs84(lat1, lon1, lat2, lon2);
  const distanceNm = distanceMeters / NAUTICAL_MILE_METERS;
  const initBearing = initialBearingDeg(lat1, lon1, lat2, lon2);
  const finBearing = finalBearingDeg(lat1, lon1, lat2, lon2);
  const mid = midpoint(lat1, lon1, lat2, lon2);

  return {
    distanceMeters,
    distanceNauticalMiles: distanceNm,
    initialBearing: initBearing,
    finalBearing: finBearing,
    midpoint: mid,
  };
}
