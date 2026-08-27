import { isCurrentsWaterPoint } from "./currentsWaterMask.js";

/** Cantidad de muestras según zoom (misma lógica que la grilla previa; tope 128). */
export function bathymetryPointCountForZoom(zoom) {
  let side = zoom <= 9 ? 9 : zoom <= 11 ? 10 : 11;
  while (side * side > 128) side -= 1;
  return side * side;
}

/**
 * Muestras aleatorias en el viewport (misma cantidad que la grilla densa).
 * Prioriza puntos en agua para no gastar cupo en tierra.
 */
export function bathymetrySampleForBounds(bounds, zoom) {
  const target = bathymetryPointCountForZoom(zoom);
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const west = bounds.getWest();
  const east = bounds.getEast();
  const padLat = (north - south) * 0.08;
  const padLon = (east - west) * 0.08;
  const s = south - padLat;
  const n = north + padLat;
  const w = west - padLon;
  const e = east + padLon;
  const latSpan = n - s;
  const lonSpan = e - w;

  const points = [];
  const maxAttempts = Math.max(target * 60, 200);
  let attempts = 0;

  while (points.length < target && attempts < maxAttempts) {
    attempts += 1;
    const lat = s + Math.random() * latSpan;
    const lon = w + Math.random() * lonSpan;
    if (!isCurrentsWaterPoint(lat, lon)) continue;
    points.push({ lat, lon });
  }

  return { points, south: s, north: n, west: w, east: e };
}
