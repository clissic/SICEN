import { useEffect } from "react";
import { useMap } from "react-leaflet";

const GEBCO_ATTRIBUTION =
  '&copy; <a href="https://www.gebco.net/data_and_products/gridded_bathymetry_data/">GEBCO 2020</a>';

/**
 * Agrega o quita la atribución GEBCO en el control nativo de Leaflet.
 */
export function CentinelaGebcoAttribution({ visible }) {
  const map = useMap();

  useEffect(() => {
    const control = map.attributionControl;
    if (!control) return undefined;

    if (visible) {
      control.addAttribution(GEBCO_ATTRIBUTION);
      return () => control.removeAttribution(GEBCO_ATTRIBUTION);
    }

    return undefined;
  }, [map, visible]);

  return null;
}
