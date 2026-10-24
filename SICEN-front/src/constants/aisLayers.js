/**
 * Fuentes de la capa AIS en El Centinela (bridge unificado).
 * Los checkboxes filtran qué blancos se muestran en el mapa.
 */

export const AIS_SOURCE_ITEMS = [
  {
    id: "aisstream",
    name: "AISStream (en vivo)",
    color: "#0b3d91",
    infoText:
      "Posiciones en vivo vía AISStream (WebSocket). El feed libre suele cubrir mal Montevideo; muchos blancos quedan del lado argentino del Río.",
  },
  {
    id: "skylight",
    name: "Skylight (última conocida)",
    color: "#8e44ad",
    infoText:
      "Últimas posiciones AIS conocidas en el bbox vía Skylight (poll). Refuerza cobertura cerca de Montevideo; no es un stream en tiempo real.",
  },
  {
    id: "nmea-udp",
    name: "Receptor local (NMEA)",
    color: "#117a65",
    infoText:
      "Blancos del receptor AIS propio (AIS-catcher + RTL-SDR) vía UDP NMEA.",
  },
];

/** Clave de visibilidad (deriveAisSourceVisibility) por id de fuente. */
const VISIBILITY_KEY = {
  aisstream: "aisstream",
  skylight: "skylight",
  "nmea-udp": "nmeaUdp",
};

/** Clave en `vessel.sources` por id de fuente. */
const SOURCES_KEY = {
  aisstream: "aisstream",
  skylight: "skylight",
  "nmea-udp": "nmeaUdp",
};

export const AIS_SOURCE_IDS = AIS_SOURCE_ITEMS.map((l) => l.id);

/**
 * ¿El buque tiene contribución de esa fuente?
 * @param {object} vessel
 * @param {"aisstream"|"skylight"|"nmea-udp"} sourceId
 */
export function vesselMatchesAisSource(vessel, sourceId) {
  if (!vessel || !sourceId) return false;
  if (vessel.positionSource === sourceId) return true;
  if (vessel.sources?.[SOURCES_KEY[sourceId] || sourceId]) return true;
  /* Compat: buques viejos del stream sin `sources`. */
  if (!vessel.sources && !vessel.positionSource) {
    return sourceId === "aisstream";
  }
  return false;
}

/**
 * @param {object[]} vessels
 * @param {Record<string, boolean>} visibility
 */
export function filterVesselsByAisSources(vessels, visibility) {
  const list = Array.isArray(vessels) ? vessels : [];
  const active = AIS_SOURCE_IDS.filter((id) =>
    Boolean(visibility?.[VISIBILITY_KEY[id]])
  );
  if (active.length === 0) return [];
  return list.filter((v) => active.some((id) => vesselMatchesAisSource(v, id)));
}

/**
 * ¿Hay alguna fuente AIS visible?
 * @param {Record<string, boolean>} visibility
 */
export function anyAisSourceVisible(visibility) {
  return AIS_SOURCE_IDS.some((id) => Boolean(visibility?.[VISIBILITY_KEY[id]]));
}
