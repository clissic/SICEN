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
];

export const AIS_SOURCE_IDS = AIS_SOURCE_ITEMS.map((l) => l.id);

/**
 * ¿El buque tiene contribución de esa fuente?
 * @param {object} vessel
 * @param {"aisstream"|"skylight"} sourceId
 */
export function vesselMatchesAisSource(vessel, sourceId) {
  if (!vessel || !sourceId) return false;
  if (vessel.positionSource === sourceId) return true;
  if (vessel.sources?.[sourceId]) return true;
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
  const showAis = Boolean(visibility?.aisstream);
  const showSky = Boolean(visibility?.skylight);
  if (!showAis && !showSky) return [];
  if (showAis && showSky) return list;
  return list.filter((v) => {
    if (showAis && vesselMatchesAisSource(v, "aisstream")) return true;
    if (showSky && vesselMatchesAisSource(v, "skylight")) return true;
    return false;
  });
}
