import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import { formatCoordDms } from "../../utils/geoDms.js";
import {
  NAUTICAL_MILE_METERS,
  niceScaleBarNm,
  formatScaleBarNm,
} from "../../utils/geoMeasure.js";

const MAX_BAR_PX = 96;
const EMPTY_LAT_DMS = "00° 00′ 00.0″ X";
const EMPTY_LNG_DMS = "000° 00′ 00.0″ X";

/**
 * Escala MN (+ Lat/Long en desktop) en la esquina inferior derecha,
 * mismo estilo que las atribuciones del mapa.
 */
export function MapCursorScaleBar({
  enabled = true,
  showCursorCoords = true,
}) {
  const map = useMap();
  const [coords, setCoords] = useState(null);
  const [bar, setBar] = useState({ widthPx: 0, label: "—" });
  const [cornerEl, setCornerEl] = useState(null);

  useEffect(() => {
    function findCorner() {
      const corner = map
        .getContainer()
        ?.querySelector(".leaflet-bottom.leaflet-right");
      setCornerEl(corner || null);
      return Boolean(corner);
    }
    if (findCorner()) return undefined;
    const raf = requestAnimationFrame(findCorner);
    const timer = setTimeout(findCorner, 80);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [map]);

  useEffect(() => {
    if (!enabled) {
      setCoords(null);
      return undefined;
    }

    function updateScale() {
      const size = map.getSize();
      if (!size || size.x < 40 || size.y < 40) return;
      const y = size.y / 2;
      const maxMeters = map.distance(
        map.containerPointToLatLng([0, y]),
        map.containerPointToLatLng([MAX_BAR_PX, y])
      );
      if (!(maxMeters > 0)) return;
      const maxNm = maxMeters / NAUTICAL_MILE_METERS;
      const niceNm = niceScaleBarNm(maxNm);
      if (!(niceNm > 0)) return;
      const widthPx = Math.max(20, Math.round((niceNm / maxNm) * MAX_BAR_PX));
      setBar({ widthPx, label: formatScaleBarNm(niceNm) });
    }

    updateScale();
    map.on("moveend", updateScale);
    map.on("zoomend", updateScale);
    map.on("resize", updateScale);

    if (!showCursorCoords) {
      setCoords(null);
      return () => {
        map.off("moveend", updateScale);
        map.off("zoomend", updateScale);
        map.off("resize", updateScale);
      };
    }

    function onMove(e) {
      const { lat, lng } = e.latlng;
      setCoords({ lat, lng });
    }

    function onOut() {
      setCoords(null);
    }

    map.on("mousemove", onMove);
    map.on("mouseout", onOut);

    return () => {
      map.off("moveend", updateScale);
      map.off("zoomend", updateScale);
      map.off("resize", updateScale);
      map.off("mousemove", onMove);
      map.off("mouseout", onOut);
    };
  }, [map, enabled, showCursorCoords]);

  if (!enabled || !cornerEl) return null;

  return createPortal(
    <div
      className={[
        "centinela-map-scale",
        "leaflet-control",
        showCursorCoords ? "" : "centinela-map-scale--bar-only",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="centinela-map-scale__bar-row">
        <span
          className="centinela-map-scale__bar"
          style={{ width: `${bar.widthPx}px` }}
        />
        <span className="centinela-map-scale__label centinela-map-scale__accent">
          {bar.label}
        </span>
      </span>
      {showCursorCoords ? (
        <>
          <span className="centinela-map-scale__sep" aria-hidden>
            ·
          </span>
          <span className="centinela-map-scale__line">
            Lat.{" "}
            <span className="centinela-map-scale__accent">
              {coords ? formatCoordDms(coords.lat, "lat") : EMPTY_LAT_DMS}
            </span>
          </span>
          <span className="centinela-map-scale__sep" aria-hidden>
            ·
          </span>
          <span className="centinela-map-scale__line">
            Long.{" "}
            <span className="centinela-map-scale__accent">
              {coords ? formatCoordDms(coords.lng, "lng") : EMPTY_LNG_DMS}
            </span>
          </span>
        </>
      ) : null}
    </div>,
    cornerEl
  );
}
