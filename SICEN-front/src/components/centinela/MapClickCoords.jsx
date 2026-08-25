import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

function formatCoord(value, kind) {
  const abs = Math.abs(value);
  const hemi =
    kind === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "O";
  return `${abs.toFixed(5)}° ${hemi}`;
}

/**
 * Al hacer click en el mapa (fondo), abre un popup con lat/lon del punto.
 */
export function MapClickCoords() {
  const map = useMap();

  useEffect(() => {
    function onClick(e) {
      const { lat, lng } = e.latlng;
      L.popup({
        className: "centinela-coords-popup",
        closeButton: true,
        autoPan: true,
      })
        .setLatLng(e.latlng)
        .setContent(
          `<div class="centinela-coords-popup__body">
            <div class="centinela-coords-popup__title">Coordenadas</div>
            <div><span class="centinela-coords-popup__label">Lat</span> ${formatCoord(lat, "lat")}</div>
            <div><span class="centinela-coords-popup__label">Lon</span> ${formatCoord(lng, "lng")}</div>
            <div class="centinela-coords-popup__decimal">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
          </div>`
        )
        .openOn(map);
    }

    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map]);

  return null;
}
