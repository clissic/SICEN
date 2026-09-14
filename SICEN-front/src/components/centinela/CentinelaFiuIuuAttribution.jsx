import { useEffect } from "react";
import { useMap } from "react-leaflet";
import {
  FIU_IUU_DASHBOARD_URL,
  FIU_IUU_SRH_URL,
} from "../../constants/fiuIuuLayers.js";

const FIU_IUU_ATTRIBUTION =
  `Datos:&nbsp;<a href="${FIU_IUU_SRH_URL}" target="_blank" rel="noopener noreferrer">Windward vía FIU SRH LAC IUU</a>` +
  ` · <a href="${FIU_IUU_DASHBOARD_URL}" target="_blank" rel="noopener noreferrer">Dashboard</a>` +
  ` · FIU Jack Gordon Institute · Daitrix · UF Geomatics`;

/**
 * Agrega o quita la atribución FIU LAC IUU en el control nativo de Leaflet.
 */
export function CentinelaFiuIuuAttribution({ visible }) {
  const map = useMap();

  useEffect(() => {
    const control = map.attributionControl;
    if (!control) return undefined;

    if (visible) {
      control.addAttribution(FIU_IUU_ATTRIBUTION);
      return () => control.removeAttribution(FIU_IUU_ATTRIBUTION);
    }

    return undefined;
  }, [map, visible]);

  return null;
}
