import { useEffect, useMemo, useState } from "react";
import { CircleMarker, GeoJSON, Pane, useMap, useMapEvents } from "react-leaflet";

/** Captura un clic del mapa para el panel HC. */
export function HcMapPickClick({ active, onPick }) {
  useMapEvents({
    click(e) {
      if (!active) return;
      onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/**
 * Capa de mancha HC: contorno + partículas del timestep activo.
 */
export function HcSpillLayer({
  result,
  timeIndex = 0,
  enabled = true,
}) {
  const map = useMap();
  const timesteps = result?.timesteps || [];
  const contours = result?.contours || [];
  const idx = Math.max(0, Math.min(timeIndex, Math.max(0, timesteps.length - 1)));
  const step = timesteps[idx] || null;
  const contour = useMemo(() => {
    if (!step?.t) return null;
    return (
      contours.find((c) => c.t === step.t)?.geojson ||
      contours[Math.min(idx, contours.length - 1)]?.geojson ||
      null
    );
  }, [contours, step, idx]);

  const release = result?.meta
    ? [result.meta.releaseLat, result.meta.releaseLon]
    : null;

  useEffect(() => {
    if (!enabled || !release?.[0] || !map) return;
    // No forzar fly en cada tick; solo al montar resultado nuevo
  }, [enabled, release, map]);

  if (!enabled || !step) return null;

  const points = step.features?.features || [];

  return (
    <Pane name="hc-spill" style={{ zIndex: 460 }}>
      {contour ? (
        <GeoJSON
          key={`hc-contour-${step.t}`}
          data={contour}
          style={{
            color: "#c0392b",
            weight: 2,
            fillColor: "#e74c3c",
            fillOpacity: 0.18,
          }}
        />
      ) : null}
      {points.map((f, i) => {
        const [lng, lat] = f.geometry?.coordinates || [];
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return (
          <CircleMarker
            key={`hc-p-${step.t}-${i}`}
            center={[lat, lng]}
            radius={3}
            pathOptions={{
              color: "#922b21",
              fillColor: "#e74c3c",
              fillOpacity: 0.75,
              weight: 1,
            }}
          />
        );
      })}
      {release && Number.isFinite(release[0]) && Number.isFinite(release[1]) ? (
        <CircleMarker
          center={release}
          radius={7}
          pathOptions={{
            color: "#fff",
            fillColor: "#c0392b",
            fillOpacity: 1,
            weight: 2,
          }}
        />
      ) : null}
    </Pane>
  );
}

export function useHcTimeIndex(result, playing) {
  const [timeIndex, setTimeIndex] = useState(0);
  const n = result?.timesteps?.length || 0;

  useEffect(() => {
    setTimeIndex(0);
  }, [result]);

  useEffect(() => {
    if (!playing || n <= 1) return undefined;
    const id = setInterval(() => {
      setTimeIndex((i) => (i + 1) % n);
    }, 900);
    return () => clearInterval(id);
  }, [playing, n]);

  return [timeIndex, setTimeIndex];
}
