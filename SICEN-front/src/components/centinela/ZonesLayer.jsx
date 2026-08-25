import { Polygon, Popup } from "react-leaflet";
import { CENTINELA_ZONES } from "../../constants/centinelaZones.js";

/**
 * Polígonos de zonas operativas. El padre filtra cuáles se dibujan.
 */
export function ZonesLayer({ zones = CENTINELA_ZONES }) {
  return (
    <>
      {zones.map((z) => (
        <Polygon
          key={z.id}
          positions={z.positions}
          pathOptions={{
            color: z.borderColor || "#8b5cf6",
            weight: 2,
            fillColor: z.color || "#c4b5fd",
            fillOpacity: 0.35,
          }}
        >
          <Popup>
            <div className="fw-semibold">{z.name}</div>
          </Popup>
        </Polygon>
      ))}
    </>
  );
}
