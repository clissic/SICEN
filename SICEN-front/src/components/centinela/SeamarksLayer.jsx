import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const SEAMARK_URL = "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png";

/**
 * Overlay OpenSeaMap (seamarks). Se agrega/quita de forma imperativa para
 * que el checkbox del panel lateral funcione bien junto a LayersControl.
 */
export function SeamarksLayer({ enabled }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    const layer = L.tileLayer(SEAMARK_URL, {
      attribution: '&copy; <a href="https://www.openseamap.org">OpenSeaMap</a>',
      maxZoom: 18,
      opacity: 1,
      pane: "overlayPane",
      className: "centinela-seamarks-layer",
      zIndex: 450,
    });
    layerRef.current = layer;

    return () => {
      if (map.hasLayer(layer)) map.removeLayer(layer);
      layerRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const onMap = map.hasLayer(layer);
    if (enabled && !onMap) {
      layer.addTo(map);
      /* Traer al frente por si el base layer se redibuja encima. */
      if (typeof layer.bringToFront === "function") layer.bringToFront();
    } else if (!enabled && onMap) {
      map.removeLayer(layer);
    }
  }, [enabled, map]);

  return null;
}
