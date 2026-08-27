import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { fetchCurrentAtPoints } from "../../api/openMeteoCurrents.js";
import { ensureLeafletVelocity, L } from "../../utils/leafletVelocitySetup.js";
import {
  currentPointsToVelocityData,
  currentVelocityLayerOptions,
  velocityGridForBounds,
} from "../../utils/currentsVelocityData.js";
import {
  applyCurrentsWaterMask,
  isCurrentsWaterPoint,
} from "../../utils/currentsWaterMask.js";

const REFRESH_DEBOUNCE_MS = 600;
const CURRENTS_PANE_Z = 435;

function maskLandPoints(points) {
  return points.map((pt) => {
    if (pt?.lat == null || pt?.lon == null) return pt;
    if (isCurrentsWaterPoint(pt.lat, pt.lon)) return pt;
    return {
      ...pt,
      speedKn: null,
      directionDeg: null,
    };
  });
}

function getVelocityCanvas(layer, map) {
  const fromLayer = layer?._canvasLayer?._canvas;
  if (fromLayer) return fromLayer;
  return map.getPane("centinelaCurrentsPane")?.querySelector("canvas") ?? null;
}

/**
 * Capa de partículas de corrientes (leaflet-velocity) vía `/api/currents/points`.
 * Máscara de agua: no se proyecta sobre tierra.
 */
export function CurrentsLayer({
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
  const maskRafRef = useRef(0);
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;

  useEffect(() => {
    if (!map.getPane("centinelaCurrentsPane")) {
      const pane = map.createPane("centinelaCurrentsPane");
      pane.style.zIndex = String(CURRENTS_PANE_Z);
    }
  }, [map]);

  /* Máscara cada frame: leaflet-velocity redibuja el canvas en loop. */
  useEffect(() => {
    if (!enabled) {
      cancelAnimationFrame(maskRafRef.current);
      return undefined;
    }

    function tick() {
      const layer = velocityLayerRef.current;
      const canvas = getVelocityCanvas(layer, map);
      if (canvas) applyCurrentsWaterMask(map, canvas);
      maskRafRef.current = requestAnimationFrame(tick);
    }

    maskRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(maskRafRef.current);
  }, [enabled, map]);

  useEffect(() => {
    if (!enabled) {
      abortRef.current?.abort();
      cancelAnimationFrame(maskRafRef.current);
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
        const rawPoints = await fetchCurrentAtPoints(grid.points, {
          signal: controller.signal,
          forecastHoursOffset,
        });
        if (controller.signal.aborted) return;

        const currentPoints = maskLandPoints(rawPoints);
        const velocityData = currentPointsToVelocityData(currentPoints, grid);
        let latestTime = null;
        let validCount = 0;
        for (const pt of currentPoints) {
          if (pt?.speedKn != null) validCount += 1;
          if (pt?.time && (!latestTime || pt.time > latestTime)) {
            latestTime = pt.time;
          }
        }

        const opts = currentVelocityLayerOptions(isDarkRef.current);
        let layer = velocityLayerRef.current;

        if (!layer) {
          layer = L.velocityLayer({ ...opts, data: velocityData });
          layer.addTo(map);
          velocityLayerRef.current = layer;
        } else {
          layer.setOptions({
            colorScale: opts.colorScale,
            opacity: opts.opacity,
            maxVelocity: opts.maxVelocity,
            velocityScale: opts.velocityScale,
          });
          layer.setData(velocityData);
        }

        const canvas = getVelocityCanvas(layer, map);
        if (canvas) applyCurrentsWaterMask(map, canvas);

        onStatusChangeRef.current?.({
          loading: false,
          error: null,
          pointCount: validCount,
          time: latestTime,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        onStatusChangeRef.current?.({
          loading: false,
          error: err?.message || "No se pudieron cargar las corrientes",
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
    const opts = currentVelocityLayerOptions(isDark);
    layer.setOptions({
      colorScale: opts.colorScale,
      opacity: opts.opacity,
      lineWidth: opts.lineWidth,
    });
  }, [isDark, enabled]);

  return null;
}
