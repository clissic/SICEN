import { Polygon } from "react-leaflet";

/**
 * Polígonos de límites marítimos (12 MN / 24 MN / ZEE / Río de la Plata).
 * Solo visual: sin popup ni captura de clics (medir / coords / etc.).
 * La info va en el ícono del checkbox y en el manual.
 *
 * @param {{ zones: object[], enabled: boolean }} props
 */
export function MaritimeBoundariesLayer({ zones = [], enabled = true }) {
  if (!enabled || !zones.length) return null;
  return (
    <>
      {zones.map((z) => {
        if (!Array.isArray(z.positions) || z.positions.length < 3) return null;
        return (
          <Polygon
            key={z.id}
            positions={z.positions}
            pathOptions={{
              color: z.borderColor || "#0284c7",
              weight: 1.5,
              fillColor: z.color || "#38bdf8",
              fillOpacity: z.fillOpacity ?? 0.1,
              interactive: false,
            }}
          />
        );
      })}
    </>
  );
}
