import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { paintSavedMeasurement } from "../../utils/measureSnapshot.js";

/**
 * Capa de mediciones personales guardadas (solo lectura).
 */
export function UserMeasurementsLayer({
  measurements = [],
  excludeId = null,
  showNames = false,
}) {
  const map = useMap();
  const groupRef = useRef(null);

  useEffect(() => {
    const group = L.layerGroup().addTo(map);
    groupRef.current = group;
    return () => {
      group.clearLayers();
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();

    for (const m of measurements) {
      if (m?.hidden) continue;
      const id = String(m._id || m.id || "");
      if (excludeId && id === String(excludeId)) continue;
      paintSavedMeasurement(L, group, m, { showName: showNames });
    }
  }, [measurements, excludeId, showNames]);

  return null;
}
