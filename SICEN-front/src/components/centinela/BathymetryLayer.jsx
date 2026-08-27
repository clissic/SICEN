import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  depthColor,
  fetchBathymetryAtPoints,
  formatDepthSummary,
} from "../../api/gebcoBathymetry.js";
import { isCurrentsWaterPoint } from "../../utils/currentsWaterMask.js";
import { bathymetrySampleForBounds } from "../../utils/bathymetryGrid.js";

const REFRESH_DEBOUNCE_MS = 700;
const BATHY_PANE_Z = 350;

function formatLabel(depthM) {
  if (depthM == null) return "";
  if (depthM < 10) return depthM.toFixed(1);
  return String(Math.round(depthM));
}

function popupHtml(point) {
  return `<div class="centinela-bathy-popup">
    <div class="centinela-bathy-popup__title">Profundidad</div>
    <div>${formatDepthSummary(point?.depthM)}</div>
    <div class="centinela-bathy-popup__source">GEBCO 2020 · orientativo</div>
  </div>`;
}

/**
 * Profundidades (números coloreados) solo sobre agua.
 */
export function BathymetryLayer({ enabled, onStatusChange }) {
  const map = useMap();
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;
  const groupRef = useRef(null);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!map.getPane("centinelaBathymetryPane")) {
      const pane = map.createPane("centinelaBathymetryPane");
      pane.style.zIndex = String(BATHY_PANE_Z);
    }
    const group = L.layerGroup([], { pane: "centinelaBathymetryPane" });
    groupRef.current = group;
    return () => {
      if (map.hasLayer(group)) map.removeLayer(group);
      groupRef.current = null;
    };
  }, [map]);

  function paintAll(points) {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();

    for (const pt of points) {
      const color = depthColor(pt.depthM);
      const label = formatLabel(pt.depthM);
      const marker = L.marker([pt.lat, pt.lon], {
        pane: "centinelaBathymetryPane",
        interactive: true,
        keyboard: false,
        icon: L.divIcon({
          className: "centinela-bathy-label",
          html: `<span class="centinela-bathy-label__num" style="color:${color}">${label}</span>`,
          iconSize: [36, 16],
          iconAnchor: [18, 8],
        }),
      });
      marker.bindPopup(popupHtml(pt), {
        className: "centinela-bathy-popup-wrap",
        closeButton: true,
      });
      group.addLayer(marker);
    }
  }

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return undefined;

    if (!enabled) {
      abortRef.current?.abort();
      if (map.hasLayer(group)) map.removeLayer(group);
      group.clearLayers();
      onStatusChangeRef.current?.({
        loading: false,
        error: null,
        pointCount: 0,
      });
      return undefined;
    }

    if (!map.hasLayer(group)) group.addTo(map);

    async function loadGrid() {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const bounds = map.getBounds();
      const zoom = map.getZoom();
      const sample = bathymetrySampleForBounds(bounds, zoom);

      onStatusChangeRef.current?.({
        loading: true,
        error: null,
        pointCount: sample.points.length,
      });

      try {
        const raw = await fetchBathymetryAtPoints(sample.points, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        const labelPoints = [];
        for (let i = 0; i < raw.length; i += 1) {
          const pt = raw[i];
          const seed = sample.points[i];
          const lat = pt?.lat ?? seed?.lat;
          const lon = pt?.lon ?? seed?.lon;
          if (lat == null || lon == null) continue;
          if (!isCurrentsWaterPoint(lat, lon)) continue;
          if (pt?.depthM == null || pt.depthM <= 0) continue;
          labelPoints.push({ lat, lon, depthM: pt.depthM });
        }

        paintAll(labelPoints);

        onStatusChangeRef.current?.({
          loading: false,
          error: null,
          pointCount: labelPoints.length,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        onStatusChangeRef.current?.({
          loading: false,
          error: err?.message || "No se pudo cargar la batimetría",
          pointCount: 0,
        });
      }
    }

    function scheduleLoad() {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(loadGrid, REFRESH_DEBOUNCE_MS);
    }

    scheduleLoad();
    map.on("moveend", scheduleLoad);
    map.on("zoomend", scheduleLoad);
    map.on("resize", scheduleLoad);

    return () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
      map.off("moveend", scheduleLoad);
      map.off("zoomend", scheduleLoad);
      map.off("resize", scheduleLoad);
    };
  }, [enabled, map]);

  return null;
}
