/**
 * Catálogo / límites para zonas personales del Centinela.
 * Colores alineados con mapMarkerCatalog.js.
 */
import { MAP_MARKER_COLORS, MAP_MARKER_DEFAULT_COLOR } from "./mapMarkerCatalog.js";

export { MAP_MARKER_COLORS, MAP_MARKER_DEFAULT_COLOR };

export const MAP_ZONE_MAX_PER_USER = 50;
export const MAP_ZONE_MIN_VERTICES = 3;
export const MAP_ZONE_MAX_VERTICES = 200;

export function isAllowedMapZoneColor(color) {
  const c = String(color || "").trim();
  return MAP_MARKER_COLORS.some(
    (allowed) => allowed.toLowerCase() === c.toLowerCase()
  );
}
