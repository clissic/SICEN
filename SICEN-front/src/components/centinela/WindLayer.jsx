import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { fetchWindAtPoints } from "../../api/openMeteoWind.js";
import { ensureLeafletVelocity, L } from "../../utils/leafletVelocitySetup.js";
import {
  velocityGridForBounds,
  velocityLayerOptions,
  windPointsToVelocityData,
} from "../../utils/windVelocityData.js";

const REFRESH_DEBOUNCE_MS = 600;
const WIND_PANE_Z = 440;

/**
 * Capa de partículas de viento (leaflet-velocity) alimentada por el proxy `/api/wind/points`.
 */
export function WindLayer({
  enabled,
  forecastHoursOffset = 0,
  isDark = false,
  onStatusChange,
}) {
  const map = useMap();
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;
  const velocityLayerRef = useRef(null);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;

  useEffect(() => {
    if (!map.getPane("centinelaWindPane")) {
      const pane = map.createPane("centinelaWindPane");
      pane.style.zIndex = String(WIND_PANE_Z);
    }
  }, [map]);

  useEffect(() => {
    if (!enabled) {
      abortRef.current?.abort();
      const layer = velocityLayerRef.current;
      if (layer && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
      velocityLayerRef.current = null;
      onStatusChangeRef.current?.({
        loading: false,
        error: null,
        pointCount: 0,
        time: null,
      });
      return undefined;
    }

    async function loadVelocity() {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const bounds = map.getBounds();
      const zoom = map.getZoom();
      const grid = velocityGridForBounds(bounds, zoom);

      onStatusChangeRef.current?.({
        loading: true,
        error: null,
        pointCount: grid.points.length,
        time: null,
      });

      try {
        await ensureLeafletVelocity();
        const windPoints = await fetchWindAtPoints(grid.points, {
          signal: controller.signal,
          forecastHoursOffset,
        });
        if (controller.signal.aborted) return;

        const velocityData = windPointsToVelocityData(windPoints, grid);
        let latestTime = null;
        for (const pt of windPoints) {
          if (pt?.time && (!latestTime || pt.time > latestTime)) {
            latestTime = pt.time;
          }
        }

        const opts = velocityLayerOptions(isDarkRef.current);
        let layer = velocityLayerRef.current;

        if (!layer) {
          layer = L.velocityLayer({ ...opts, data: velocityData });
          layer.addTo(map);
          velocityLayerRef.current = layer;
        } else {
          layer.setOptions({
            colorScale: opts.colorScale,
            opacity: opts.opacity,
          });
          layer.setData(velocityData);
        }

        onStatusChangeRef.current?.({
          loading: false,
          error: null,
          pointCount: windPoints.length,
          time: latestTime,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        onStatusChangeRef.current?.({
          loading: false,
          error: err?.message || "No se pudo cargar el viento",
          pointCount: 0,
          time: null,
        });
      }
    }

    function scheduleLoad() {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(loadVelocity, REFRESH_DEBOUNCE_MS);
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
  }, [enabled, forecastHoursOffset, map]);

  useEffect(() => {
    const layer = velocityLayerRef.current;
    if (!layer || !enabled) return;
    const opts = velocityLayerOptions(isDark);
    layer.setOptions({
      colorScale: opts.colorScale,
      opacity: opts.opacity,
    });
  }, [isDark, enabled]);

  return null;
}
