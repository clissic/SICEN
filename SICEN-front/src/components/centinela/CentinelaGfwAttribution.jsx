import { useEffect } from "react";
import { useMap } from "react-leaflet";
import {
  GFW_APIS_URL,
  GFW_ATTRIBUTION_SHORT,
} from "../../constants/centinelaIntelLayers.js";

const GFW_ATTRIBUTION =
  `${GFW_ATTRIBUTION_SHORT}` +
  ` · <a href="${GFW_APIS_URL}" target="_blank" rel="noopener noreferrer">APIs</a>` +
  ` · CC BY-NC 4.0`;

/**
 * Atribución obligatoria GFW (Terms of Use §3): "Powered by Global Fishing Watch"
 * con link a https://globalfishingwatch.org
 */
export function CentinelaGfwAttribution({ visible }) {
  const map = useMap();

  useEffect(() => {
    const control = map.attributionControl;
    if (!control) return undefined;

    if (visible) {
      control.addAttribution(GFW_ATTRIBUTION);
      return () => control.removeAttribution(GFW_ATTRIBUTION);
    }

    return undefined;
  }, [map, visible]);

  return null;
}
