/**
 * Capas Skylight en El Centinela (checkboxes del desplegable).
 * `eventTypes` se envían al proxy; `dark_only` es un filtro sobre detecciones.
 * `satellite_frames` usa el endpoint `/frames` (no es un eventType).
 */

export const SKYLIGHT_LAYER_ITEMS = [
  {
    id: "sar_sentinel1",
    name: "Radar Sentinel-1",
    kind: "detection",
    eventTypes: ["sar_sentinel1"],
    color: "#e67e22",
  },
  {
    id: "eo_sentinel2",
    name: "Óptico Sentinel-2",
    kind: "detection",
    eventTypes: ["eo_sentinel2"],
    color: "#27ae60",
  },
  {
    id: "eo_landsat_8_9",
    name: "Óptico Landsat 8/9",
    kind: "detection",
    eventTypes: ["eo_landsat_8_9"],
    color: "#1abc9c",
  },
  {
    id: "viirs",
    name: "Luces nocturnas (VIIRS)",
    kind: "detection",
    eventTypes: ["viirs"],
    color: "#f1c40f",
  },
  {
    id: "dark_only",
    name: "Solo buques sin AIS (dark)",
    kind: "filter",
    eventTypes: [],
    color: "#c0392b",
    infoText:
      "Muestra solo detecciones satelitales no correlacionadas con AIS (buques «dark»).",
  },
  {
    id: "fishing_activity_history",
    name: "Actividad de pesca",
    kind: "behavior",
    eventTypes: ["fishing_activity_history"],
    color: "#2980b9",
  },
  {
    id: "standard_rendezvous",
    name: "STS (ambos en AIS)",
    kind: "behavior",
    eventTypes: ["standard_rendezvous"],
    color: "#8e44ad",
    infoText: "Ship to Ship: encuentro con ambos buques emitiendo AIS.",
  },
  {
    id: "dark_rendezvous",
    name: "STS dark",
    kind: "behavior",
    eventTypes: ["dark_rendezvous"],
    color: "#9b59b6",
    infoText:
      "Ship to Ship donde solo uno de los buques emite AIS (posible transbordo).",
  },
  {
    id: "aoi_visit",
    name: "Entrada a zona (AOI)",
    kind: "aoi",
    eventTypes: ["aoi_visit"],
    color: "#0d9488",
    /** Oculto en UI hasta tener AOIs cargados en la cuenta Skylight. */
    hiddenInUi: true,
    infoText:
      "Entradas a AOIs de Skylight. Se filtran por las zonas locales visibles emparejadas.",
  },
  {
    id: "speed_range",
    name: "Rango de velocidad (AOI)",
    kind: "aoi",
    eventTypes: ["speed_range"],
    color: "#ea580c",
    /** Oculto en UI hasta tener AOIs cargados en la cuenta Skylight. */
    hiddenInUi: true,
    infoText:
      "Tramos de velocidad en AOIs. Se filtran por las zonas locales visibles emparejadas.",
  },
  {
    id: "satellite_frames",
    name: "Pasadas satelitales",
    kind: "frames",
    eventTypes: [],
    color: "#64748b",
    /** Oculto en UI hasta definir el flujo operativo para el usuario. */
    hiddenInUi: true,
    infoText:
      "Huellas de imágenes Sentinel/Landsat procesadas (conteo correlacionado / dark).",
  },
];

export const SKYLIGHT_DETECTION_LAYER_IDS = SKYLIGHT_LAYER_ITEMS.filter(
  (l) => l.kind === "detection"
).map((l) => l.id);

export const SKYLIGHT_BEHAVIOR_LAYER_IDS = SKYLIGHT_LAYER_ITEMS.filter(
  (l) => l.kind === "behavior" && !l.hiddenInUi
).map((l) => l.id);

export const SKYLIGHT_TOGGLE_LAYER_IDS = SKYLIGHT_LAYER_ITEMS.filter(
  (l) => l.kind !== "filter" && !l.hiddenInUi
).map((l) => l.id);

export const SKYLIGHT_LAYERS_BY_ID = Object.fromEntries(
  SKYLIGHT_LAYER_ITEMS.map((l) => [l.id, l])
);

export const SKYLIGHT_EVENT_TYPE_LABELS = {
  sar_sentinel1: "Radar Sentinel-1",
  eo_sentinel2: "Óptico Sentinel-2",
  eo_landsat_8_9: "Óptico Landsat 8/9",
  viirs: "VIIRS",
  fishing_activity_history: "Actividad de pesca",
  standard_rendezvous: "STS",
  dark_rendezvous: "STS dark",
  aoi_visit: "Entrada a zona",
  speed_range: "Rango de velocidad",
};

/** Horizonte por defecto al consultar el proxy (7 días). */
export const SKYLIGHT_DEFAULT_LOOKBACK_HOURS = 168;

/**
 * Overrides manuales zona local → AOI Skylight.
 * Completar cuando exista el AOI correspondiente en la cuenta Skylight.
 * @type {Record<string, string>}
 */
export const SKYLIGHT_ZONE_AOI_OVERRIDES = {
  // "zona-alijo-alfa": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
};
