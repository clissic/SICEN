import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { fetchWaveAtPoints } from "../../api/openMeteoWaves.js";
import { ensureLeafletVelocity, L } from "../../utils/leafletVelocitySetup.js";
import {
  applyCurrentsWaterMask,
  isCurrentsWaterPoint,
} from "../../utils/currentsWaterMask.js";
import {
  velocityGridForBounds,
  wavePointsToVelocityData,
  waveVelocityLayerOptions,
  waveVelocityScaleForPeriods,
} from "../../utils/wavesVelocityData.js";

const REFRESH_DEBOUNCE_MS = 600;
const WAVES_PANE_Z = 430;

function maskLandPoints(points) {
  return points.map((pt) => {
    if (pt?.lat == null || pt?.lon == null) return pt;
    if (isCurrentsWaterPoint(pt.lat, pt.lon)) return pt;
    return {
      ...pt,
      periodS: null,
      directionDeg: null,
      heightM: null,
    };
  });
}

function getVelocityCanvas(layer, map) {
  const fromLayer = layer?._canvasLayer?._canvas;
  if (fromLayer) return fromLayer;
  return map.getPane("centinelaWavesPane")?.querySelector("canvas") ?? null;
}

/**
 * Partículas de oleaje (leaflet-velocity): magnitud ∝ período; dirección = desde.
 * Máscara de agua: no se proyecta sobre tierra.
 */
export function WavesLayer({
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
    if (!map.getPane("centinelaWavesPane")) {
      const pane = map.createPane("centinelaWavesPane");
      pane.style.zIndex = String(WAVES_PANE_Z);
    }
  }, [map]);

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
        const rawPoints = await fetchWaveAtPoints(grid.points, {
          signal: controller.signal,
          forecastHoursOffset,
        });
        if (controller.signal.aborted) return;

        const wavePoints = maskLandPoints(rawPoints);
        const velocityData = wavePointsToVelocityData(wavePoints, grid);
        let latestTime = null;
        let validCount = 0;
        for (const pt of wavePoints) {
          if (pt?.heightM != null && pt?.directionDeg != null) validCount += 1;
          if (pt?.time && (!latestTime || pt.time > latestTime)) {
            latestTime = pt.time;
          }
        }

        const velocityScale = waveVelocityScaleForPeriods(wavePoints);
        const opts = waveVelocityLayerOptions(
          isDarkRef.current,
          velocityScale
        );
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
          error: err?.message || "No se pudo cargar el oleaje",
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
    const opts = waveVelocityLayerOptions(isDark);
    layer.setOptions({
      colorScale: opts.colorScale,
      opacity: opts.opacity,
      lineWidth: opts.lineWidth,
    });
  }, [isDark, enabled]);

  return null;
}
