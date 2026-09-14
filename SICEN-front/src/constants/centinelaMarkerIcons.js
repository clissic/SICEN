/**
 * Catálogo de íconos Material Symbols y colores para marcadores del Centinela.
 * Mantener sincronizado con SICEN-back/src/constants/mapMarkerCatalog.js
 */

export const MAP_MARKER_COLORS = [
  "#0d9488",
  "#2563eb",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#475569",
  "#ffffff",
  "#d4d4d4",
  "#a3a3a3",
  "#525252",
  "#000000",
];

export const MAP_MARKER_ICON_GROUPS = [
  {
    id: "nav",
    label: "Navegación",
    icons: [
      "sailing",
      "directions_boat",
      "anchor",
      "near_me",
      "explore",
      "map",
      "flag",
      "location_on",
      "home",
      "compass_calibration",
    ],
  },
  {
    id: "pesca",
    label: "Pesca y medio marino",
    icons: [
      "water",
      "waves",
      "tsunami",
      "set_meal",
      "phishing",
      "bubble_chart",
      "air",
      "cyclone",
    ],
  },
  {
    id: "seguridad",
    label: "Seguridad y delito",
    icons: [
      "warning",
      "report",
      "local_police",
      "security",
      "gavel",
      "visibility",
      "emergency",
      "sos",
      "crisis_alert",
      "policy",
    ],
  },
  {
    id: "infra",
    label: "Infraestructura",
    icons: [
      "warehouse",
      "factory",
      "oil_barrel",
      "bolt",
      "local_gas_station",
      "build",
      "handyman",
    ],
  },
  {
    id: "otros",
    label: "Otros",
    icons: [
      "push_pin",
      "place",
      "star",
      "bookmark",
      "camping",
      "hotel",
      "info",
      "help",
    ],
  },
];

export const MAP_MARKER_ICON_IDS = MAP_MARKER_ICON_GROUPS.flatMap((g) => g.icons);

export const MAP_MARKER_DEFAULT_ICON = "push_pin";
export const MAP_MARKER_DEFAULT_COLOR = MAP_MARKER_COLORS[0];
export const MAP_MARKER_MAX_PER_USER = 100;

export function isAllowedMapMarkerIcon(icon) {
  return MAP_MARKER_ICON_IDS.includes(String(icon || "").trim());
}

export function isAllowedMapMarkerColor(color) {
  const c = String(color || "").trim();
  return MAP_MARKER_COLORS.includes(c);
}

/** Blanco del catálogo: ícono y borde negros para contraste. */
export function isMarkerColorLight(color) {
  const c = String(color || "")
    .trim()
    .toLowerCase();
  return c === "#ffffff" || c === "#fff";
}
