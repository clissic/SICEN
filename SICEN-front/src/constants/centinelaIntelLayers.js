/**
 * Capas de inteligencia marítima en El Centinela — organizadas por FUNCIÓN
 * (no por proveedor). Cada ítem declara de qué fuente se alimenta.
 *
 * Proveedores: skylight | fiu | gfw | aisstream
 */

export const INTEL_PROVIDER = {
  skylight: "skylight",
  fiu: "fiu",
  gfw: "gfw",
  aisstream: "aisstream",
};

/**
 * @typedef {object} IntelLayerItem
 * @property {string} id
 * @property {string} name
 * @property {string} color
 * @property {"skylight"|"fiu"|"gfw"|"aisstream"} provider
 * @property {string} [skylightId] id en skylightLayers.js
 * @property {string} [fiuId] id en fiuIuuLayers.js
 * @property {string} [gfwType] fishing | encounter | gap | sar_unmatched
 * @property {string} [aisSourceId] aisstream | skylight
 * @property {string} [infoText]
 * @property {boolean} [hiddenInUi]
 * @property {boolean} [isFilter] filtro (ej. dark_only), no cuenta como capa de eventos
 */

/**
 * @typedef {object} IntelGroup
 * @property {string} id
 * @property {string} name
 * @property {string} [infoText]
 * @property {IntelLayerItem[]} items
 */

/** @type {IntelGroup[]} */
export const INTEL_GROUPS = [
  {
    id: "detections",
    name: "Detecciones satelitales",
    infoText:
      "Blancos detectados por satélite (radar/óptico/VIIRS). El filtro «solo dark» limita a no correlacionados con AIS.",
    items: [
      {
        id: "det_s1",
        name: "Radar Sentinel-1",
        color: "#e67e22",
        provider: "skylight",
        skylightId: "sar_sentinel1",
      },
      {
        id: "det_s2",
        name: "Óptico Sentinel-2",
        color: "#27ae60",
        provider: "skylight",
        skylightId: "eo_sentinel2",
      },
      {
        id: "det_landsat",
        name: "Óptico Landsat 8/9",
        color: "#1abc9c",
        provider: "skylight",
        skylightId: "eo_landsat_8_9",
      },
      {
        id: "det_viirs",
        name: "Luces nocturnas (VIIRS)",
        color: "#f1c40f",
        provider: "skylight",
        skylightId: "viirs",
      },
      {
        id: "det_dark_only",
        name: "Solo buques sin AIS (dark)",
        color: "#c0392b",
        provider: "skylight",
        skylightId: "dark_only",
        isFilter: true,
        infoText:
          "Filtro sobre detecciones Skylight: solo no correlacionadas con AIS.",
      },
    ],
  },
  {
    id: "fishing",
    name: "Actividad de pesca",
    infoText: "Eventos de pesca aparente o de alto riesgo IUU según la fuente.",
    items: [
      {
        id: "fish_skylight",
        name: "Pesca (Skylight)",
        color: "#2980b9",
        provider: "skylight",
        skylightId: "fishing_activity_history",
        infoText: "Historial de actividad de pesca detectada por Skylight.",
      },
      {
        id: "fish_fiu",
        name: "Pesca alto riesgo IUU (FIU)",
        color: "#1f618d",
        provider: "fiu",
        fiuId: "fishing",
        infoText:
          "Pesca inferida con buques de alto riesgo IUU (Windward vía FIU). Uso no comercial.",
      },
      {
        id: "fish_gfw",
        name: "Pesca aparente (GFW)",
        color: "#5dade2",
        provider: "gfw",
        gfwType: "fishing",
        infoText:
          "Eventos de pesca aparente Global Fishing Watch (AIS + ML). Uso no comercial · CC BY-NC 4.0.",
      },
    ],
  },
  {
    id: "sts",
    name: "STS (ship-to-ship)",
    infoText: "Encuentros entre buques (posible transbordo / rendezvous).",
    items: [
      {
        id: "sts_ais",
        name: "STS ambos en AIS",
        color: "#8e44ad",
        provider: "skylight",
        skylightId: "standard_rendezvous",
        infoText: "Ship to Ship con ambos buques emitiendo AIS (Skylight).",
      },
      {
        id: "sts_dark",
        name: "STS dark",
        color: "#9b59b6",
        provider: "skylight",
        skylightId: "dark_rendezvous",
        infoText:
          "Ship to Ship donde solo uno emite AIS (Skylight; posible transbordo).",
      },
      {
        id: "sts_fiu",
        name: "STS alto riesgo IUU (FIU)",
        color: "#6c3483",
        provider: "fiu",
        fiuId: "sts",
        infoText:
          "Encuentros STS con al menos un buque de alto riesgo IUU (FIU).",
      },
      {
        id: "sts_gfw",
        name: "Encounters (GFW)",
        color: "#af7ac5",
        provider: "gfw",
        gfwType: "encounter",
        infoText:
          "Encuentros fishing↔carrier/support/etc. (Global Fishing Watch). Uso no comercial.",
      },
    ],
  },
  {
    id: "dark",
    name: "Dark / apagones AIS",
    infoText:
      "Gaps de emisión AIS (track). Distinto del filtro dark de detecciones satelitales.",
    items: [
      {
        id: "dark_fiu",
        name: "Gaps LatAm IUU (FIU)",
        color: "#c0392b",
        provider: "fiu",
        fiuId: "dark",
        infoText:
          "Periodos sin emisión AIS en buques de alto riesgo IUU (LatAm / FIU).",
      },
      {
        id: "dark_gfw",
        name: "Gaps AIS (GFW)",
        color: "#922b21",
        provider: "gfw",
        gfwType: "gap",
        infoText:
          "Eventos AIS-off / gaps de Global Fishing Watch. Uso no comercial.",
      },
    ],
  },
  {
    id: "ais",
    name: "Posiciones AIS",
    infoText:
      "Blancos AIS en el mapa. La identidad OMI se enriquece automáticamente (Skylight / GFW).",
    items: [
      {
        id: "ais_live",
        name: "En vivo (AISStream)",
        color: "#0b3d91",
        provider: "aisstream",
        aisSourceId: "aisstream",
        infoText:
          "Posiciones en vivo vía AISStream. El feed libre suele cubrir mal Montevideo.",
      },
      {
        id: "ais_lastknown",
        name: "Última conocida (Skylight)",
        color: "#8e44ad",
        provider: "skylight",
        aisSourceId: "skylight",
        infoText:
          "Últimas posiciones AIS conocidas vía Skylight (poll). Refuerza cobertura en el bbox.",
      },
    ],
  },
];

export const INTEL_GROUP_IDS = INTEL_GROUPS.map((g) => g.id);

export const INTEL_ALL_ITEMS = INTEL_GROUPS.flatMap((g) =>
  g.items.filter((i) => !i.hiddenInUi)
);

export const INTEL_ITEM_IDS = INTEL_ALL_ITEMS.map((i) => i.id);

export const INTEL_ITEMS_BY_ID = Object.fromEntries(
  INTEL_ALL_ITEMS.map((i) => [i.id, i])
);

export function createDefaultIntelVisibility() {
  return Object.fromEntries(INTEL_ITEM_IDS.map((id) => [id, false]));
}

/** Ítems visibles de un grupo (sin hidden). */
export function intelGroupVisibleItems(group) {
  return (group?.items || []).filter((i) => !i.hiddenInUi);
}

/**
 * Deriva visibilidad Skylight (ids de skylightLayers) desde el estado por función.
 * @param {Record<string, boolean>} intelVisibility
 */
export function deriveSkylightVisibility(intelVisibility) {
  const out = {};
  for (const item of INTEL_ALL_ITEMS) {
    if (item.provider !== "skylight" || !item.skylightId) continue;
    if (item.aisSourceId) continue; /* last-known va por AIS, no por eventos */
    out[item.skylightId] = Boolean(intelVisibility[item.id]);
  }
  return out;
}

/**
 * @param {Record<string, boolean>} intelVisibility
 */
export function deriveFiuVisibility(intelVisibility) {
  const out = {};
  for (const item of INTEL_ALL_ITEMS) {
    if (item.provider !== "fiu" || !item.fiuId) continue;
    out[item.fiuId] = Boolean(intelVisibility[item.id]);
  }
  return out;
}

/**
 * @param {Record<string, boolean>} intelVisibility
 */
export function deriveAisSourceVisibility(intelVisibility) {
  return {
    aisstream: Boolean(intelVisibility.ais_live),
    skylight: Boolean(intelVisibility.ais_lastknown),
  };
}

/**
 * Tipos GFW activos.
 * @param {Record<string, boolean>} intelVisibility
 * @returns {string[]}
 */
export function deriveGfwEventTypes(intelVisibility) {
  const types = [];
  for (const item of INTEL_ALL_ITEMS) {
    if (item.provider !== "gfw" || !item.gfwType) continue;
    if (!intelVisibility[item.id]) continue;
    types.push(item.gfwType);
  }
  return types;
}

export const GFW_ATTRIBUTION_SHORT =
  'Powered by <a href="https://globalfishingwatch.org" target="_blank" rel="noopener noreferrer">Global Fishing Watch</a>';

export const GFW_DISCLAIMER =
  "Datos Global Fishing Watch (CC BY-NC 4.0, uso no comercial). No sustituye inteligencia operativa propia.";

export const GFW_TERMS_URL =
  "https://globalfishingwatch.org/our-apis/documentation/docs/license-rate-limits#terms-of-use";

export const GFW_APIS_URL = "https://globalfishingwatch.org/our-apis/";
