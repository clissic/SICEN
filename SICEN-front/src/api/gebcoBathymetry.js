import { bathymetryFetchPoints } from "./client.js";

/** Leyenda profundidad (m) — solo agua. */
export const BATHYMETRY_DEPTH_LEGEND = [
  { className: "centinela-bathy-swatch--d0", label: "< 5 m", max: 5 },
  { className: "centinela-bathy-swatch--d1", label: "5–15 m", max: 15 },
  { className: "centinela-bathy-swatch--d2", label: "15–50 m", max: 50 },
  { className: "centinela-bathy-swatch--d3", label: "50–200 m", max: 200 },
  { className: "centinela-bathy-swatch--d4", label: "≥ 200 m", max: Infinity },
];

const DEPTH_COLORS = [
  "#a7f3d0",
  "#67e8f9",
  "#38bdf8",
  "#2563eb",
  "#1e3a8a",
];

export function depthColor(depthM) {
  if (depthM == null || Number.isNaN(depthM)) return "#94a3b8";
  if (depthM < 5) return DEPTH_COLORS[0];
  if (depthM < 15) return DEPTH_COLORS[1];
  if (depthM < 50) return DEPTH_COLORS[2];
  if (depthM < 200) return DEPTH_COLORS[3];
  return DEPTH_COLORS[4];
}

export function formatDepthSummary(depthM) {
  if (depthM == null || Number.isNaN(depthM)) {
    return "Sin dato de profundidad (tierra o sin GEBCO)";
  }
  return `Profundidad ≈ ${depthM.toFixed(depthM < 10 ? 1 : 0)} m`;
}

export async function fetchBathymetryAtPoints(points, { signal } = {}) {
  if (!points?.length) return [];
  const data = await bathymetryFetchPoints(points, { signal });
  return Array.isArray(data?.points) ? data.points : [];
}

export async function fetchBathymetryAtPoint(lat, lon, options) {
  const [point] = await fetchBathymetryAtPoints([{ lat, lon }], options);
  return point;
}
