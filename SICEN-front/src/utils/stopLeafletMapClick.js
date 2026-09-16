import L from "leaflet";

/**
 * Impide que un click en un elemento de capa (buque, evento, etc.)
 * también dispare el `click` / `preclick` del mapa (cartel de coordenadas).
 *
 * Leaflet dispara el evento a varios targets; el `stopPropagation` nativo
 * solo no alcanza — hay que marcar `_stopped` en el evento DOM.
 */
export function stopLeafletMapClick(e) {
  const oe = e?.originalEvent || e;
  if (!oe) return;
  L.DomEvent.stopPropagation(oe);
  L.DomEvent.preventDefault(oe);
  oe._stopped = true;
}

/** True si el click cayó sobre un marker / path interactivo de Leaflet. */
export function leafletClickOnInteractive(e) {
  if (e?.originalEvent?._stopped) return true;
  const t = e?.originalEvent?.target;
  if (!t || typeof t.closest !== "function") return false;
  return Boolean(
    t.closest(
      ".leaflet-marker-icon, .leaflet-marker-shadow, .leaflet-interactive"
    )
  );
}
