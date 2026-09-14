import {
  JE_2MN_POSITIONS,
  JE_7MN_POSITIONS,
} from "./data/brevetBStripPolygon.js";

/**
 * Catálogo UI de límites marítimos.
 * Capas remotas → GET /api/maritimeBoundaries.
 * Hijas locales de Río de la Plata (J.E.): franjas 2 MN / 7 MN desde costa UY,
 * intersectadas con el RDP recortado.
 */

/** @typedef {{
 *   id: string,
 *   label: string,
 *   infoText?: string,
 *   remote?: boolean,
 *   expandable?: boolean,
 *   children?: MaritimeChildLayer[],
 * }} MaritimeBoundaryLayer */

/** @typedef {{
 *   id: string,
 *   label: string,
 *   infoText?: string,
 *   positions: [number, number][],
 *   color: string,
 *   borderColor: string,
 *   fillOpacity?: number,
 * }} MaritimeChildLayer */

/** @type {MaritimeBoundaryLayer[]} */
export const MARITIME_BOUNDARY_LAYERS = [
  {
    id: "12nm",
    label: "Mar territorial (12 MN)",
    remote: true,
    infoText:
      "Mar territorial de Uruguay (aprox. 12 MN). Fuente MarineRegions (VLIZ). Referencia analítica, no carta oficial.",
  },
  {
    id: "24nm",
    label: "Zona contigua (24 MN)",
    remote: true,
    infoText:
      "Zona contigua de Uruguay (hasta 24 MN desde la línea de base). Fuente MarineRegions (VLIZ). Referencia analítica, no carta oficial.",
  },
  {
    id: "eez",
    label: "ZEE (200 MN)",
    remote: true,
    infoText:
      "Zona Económica Exclusiva de Uruguay (aprox. 200 MN). Fuente MarineRegions (VLIZ). Referencia analítica, no carta oficial.",
  },
  {
    id: "rdp",
    label: "Río de la Plata",
    remote: true,
    expandable: true,
    infoText:
      "Río de la Plata (MarineRegions / IHO), recortado al este/sur del límite San Fernando–Punta Gorda: sin delta del Paraná ni Río Uruguay al norte del paralelo de Punta Gorda. Referencia analítica, no carta oficial.",
    children: [
      {
        id: "je-2mn",
        label: "J.E. 2 MN",
        positions: JE_2MN_POSITIONS,
        color: "#fbbf24",
        borderColor: "#d97706",
        fillOpacity: 0.14,
        infoText:
          "Jurisdicción exclusiva de 2 MN desde la costa uruguaya, al oeste de la línea Colonia–Punta Lara, dentro del Río de la Plata. Referencia analítica, no carta oficial.",
      },
      {
        id: "je-7mn",
        label: "J.E. 7 MN",
        positions: JE_7MN_POSITIONS,
        color: "#fb7185",
        borderColor: "#e11d48",
        fillOpacity: 0.12,
        infoText:
          "Jurisdicción exclusiva de 7 MN desde la costa uruguaya, al este de la línea Colonia–Punta Lara, dentro del Río de la Plata. Referencia analítica, no carta oficial.",
      },
    ],
  },
];

/** Todas las ids conmutables (remotas + hijas). */
export const MARITIME_BOUNDARY_LAYER_IDS = MARITIME_BOUNDARY_LAYERS.flatMap(
  (l) => [l.id, ...(l.children?.map((c) => c.id) || [])]
);

/** Solo capas que se piden al proxy MarineRegions. */
export const MARITIME_BOUNDARY_REMOTE_IDS = MARITIME_BOUNDARY_LAYERS.filter(
  (l) => l.remote !== false
).map((l) => l.id);

/** Hijas locales (J.E., etc.) indexadas por id. */
export const MARITIME_BOUNDARY_LOCAL_BY_ID = Object.fromEntries(
  MARITIME_BOUNDARY_LAYERS.flatMap((l) =>
    (l.children || []).map((c) => [c.id, c])
  )
);
