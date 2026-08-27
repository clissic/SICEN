import { Polygon, Popup } from "react-leaflet";
import { CENTINELA_ZONES } from "../../constants/centinelaZones.js";

/**
 * Polígonos de zonas / brevets. El padre filtra cuáles se dibujan.
 */
export function ZonesLayer({ zones = CENTINELA_ZONES }) {
  return (
    <>
      {zones.map((z) => {
        if (!Array.isArray(z.positions) || z.positions.length < 3) return null;
        return (
          <Polygon
            key={z.id}
            positions={z.positions}
            pathOptions={{
              color: z.borderColor || "#8b5cf6",
              weight: 2,
              fillColor: z.color || "#c4b5fd",
              fillOpacity: z.fillOpacity ?? 0.35,
            }}
          >
            <Popup className="centinela-zone-popup">
              <div className="centinela-zone-popup__body">
                <div className="centinela-zone-popup__name">{z.name}</div>
                {z.infoText ? (
                  <div className="centinela-zone-popup__info">{z.infoText}</div>
                ) : null}
              </div>
            </Popup>
          </Polygon>
        );
      })}
    </>
  );
}
