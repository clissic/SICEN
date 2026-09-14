import { useEffect } from "react";
import { useMap } from "react-leaflet";

const VLIZ_ATTRIBUTION =
  'Límites marítimos &copy;&nbsp;<a href="https://www.marineregions.org/" target="_blank" rel="noopener noreferrer">MarineRegions / VLIZ</a>';

/**
 * Atribución MarineRegions cuando hay alguna capa de límite marítimo activa.
 */
export function CentinelaMaritimeBoundariesAttribution({ visible }) {
  const map = useMap();

  useEffect(() => {
    const control = map.attributionControl;
    if (!control) return undefined;

    if (visible) {
      control.addAttribution(VLIZ_ATTRIBUTION);
      return () => control.removeAttribution(VLIZ_ATTRIBUTION);
    }

    return undefined;
  }, [map, visible]);

  return null;
}
