import { Polygon } from "react-leaflet";
import { CENTINELA_ZONES } from "../../constants/centinelaZones.js";

/**
 * Polígonos de zonas / brevets. El padre filtra cuáles se dibujan.
 * Solo visual: sin popup ni captura de clics (medir / coords / etc.).
 * La info va en el ícono del checkbox (cuando hay `infoText`).
 * Soporta `rings` (MultiPolygon) o un solo `positions`.
 */
export function ZonesLayer({ zones = CENTINELA_ZONES }) {
  return (
    <>
      {zones.flatMap((z) => {
        const rings =
          Array.isArray(z.rings) && z.rings.length
            ? z.rings
            : Array.isArray(z.positions) && z.positions.length >= 3
              ? [z.positions]
              : [];
        return rings.map((positions, idx) => {
          if (!Array.isArray(positions) || positions.length < 3) return null;
          return (
            <Polygon
              key={`${z.id}-${idx}`}
              positions={positions}
              pathOptions={{
                color: z.borderColor || "#8b5cf6",
                weight: 2,
                fillColor: z.color || "#c4b5fd",
                fillOpacity: z.fillOpacity ?? 0.35,
                interactive: false,
              }}
            />
          );
        });
      })}
    </>
  );
}
