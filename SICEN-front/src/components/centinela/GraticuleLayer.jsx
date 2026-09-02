import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { formatCoordDms } from "../../utils/geoDms.js";

function stepForZoom(zoom) {
  if (zoom >= 15) return 0.05;
  if (zoom >= 13) return 0.1;
  if (zoom >= 11) return 0.25;
  if (zoom >= 9) return 0.5;
  if (zoom >= 7) return 1;
  if (zoom >= 5) return 2;
  return 5;
}

function formatLineLabel(value, kind) {
  return formatCoordDms(value, kind);
}

/**
 * Grilla de latitud/longitud. Las líneas van en Leaflet; las etiquetas
 * se anclan a los bordes del contenedor del mapa (pantalla).
 */
export function GraticuleLayer({ enabled = true }) {
  const map = useMap();
  const groupRef = useRef(null);
  const edgeRef = useRef(null);

  useEffect(() => {
    const group = L.layerGroup();
    groupRef.current = group;

    const edge = L.DomUtil.create(
      "div",
      "centinela-graticule-edge",
      map.getContainer()
    );
    edge.setAttribute("aria-hidden", "true");
    edgeRef.current = edge;

    function redraw() {
      group.clearLayers();
      edge.innerHTML = "";

      const bounds = map.getBounds();
      const size = map.getSize();
      const step = stepForZoom(map.getZoom());
      const south = bounds.getSouth();
      const north = bounds.getNorth();
      const west = bounds.getWest();
      const east = bounds.getEast();

      /* Extender un poco las líneas fuera del viewport. */
      const pad = step;
      const pathOpts = {
        color: "#64748b",
        weight: 1,
        opacity: 0.45,
        interactive: false,
        className: "centinela-graticule-line",
      };

      const edgePad = 18;

      for (
        let i = Math.ceil(south / step);
        i <= Math.floor(north / step);
        i += 1
      ) {
        const y = Number((i * step).toFixed(6));
        L.polyline(
          [
            [y, west - pad],
            [y, east + pad],
          ],
          pathOpts
        ).addTo(group);

        const pt = map.latLngToContainerPoint([y, west]);
        if (pt.y < edgePad || pt.y > size.y - edgePad) continue;

        const el = L.DomUtil.create(
          "div",
          "centinela-graticule-edge__label centinela-graticule-edge__label--lat",
          edge
        );
        el.textContent = formatLineLabel(y, "lat");
        el.style.top = `${pt.y}px`;
      }

      for (
        let i = Math.ceil(west / step);
        i <= Math.floor(east / step);
        i += 1
      ) {
        const x = Number((i * step).toFixed(6));
        L.polyline(
          [
            [south - pad, x],
            [north + pad, x],
          ],
          pathOpts
        ).addTo(group);

        const pt = map.latLngToContainerPoint([south, x]);
        if (pt.x < edgePad + 36 || pt.x > size.x - edgePad) continue;

        const el = L.DomUtil.create(
          "div",
          "centinela-graticule-edge__label centinela-graticule-edge__label--lng",
          edge
        );
        el.textContent = formatLineLabel(x, "lng");
        el.style.left = `${pt.x}px`;
      }
    }

    map.on("move zoom viewreset resize", redraw);
    redraw();

    return () => {
      map.off("move zoom viewreset resize", redraw);
      group.clearLayers();
      if (map.hasLayer(group)) map.removeLayer(group);
      groupRef.current = null;
      if (edge.parentNode) edge.parentNode.removeChild(edge);
      edgeRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const group = groupRef.current;
    const edge = edgeRef.current;
    if (!group || !edge) return;
    const onMap = map.hasLayer(group);
    if (enabled && !onMap) {
      group.addTo(map);
      edge.hidden = false;
    } else if (!enabled && onMap) {
      map.removeLayer(group);
      edge.hidden = true;
    } else {
      edge.hidden = !enabled;
    }
  }, [enabled, map]);

  return null;
}
