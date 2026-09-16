import { useEffect, useMemo, useRef } from "react";
import { Marker, Polygon, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";

/** Captura clics del mapa para agregar vértices a una zona en edición. */
export function ZoneMapPickClick({ active, onPick }) {
  useMapEvents({
    click(e) {
      if (!active) return;
      onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function vertexIcon(color) {
  const c = color || "#0d9488";
  return L.divIcon({
    className: "centinela-zone-vertex",
    html: `<span class="centinela-zone-vertex__dot" style="background:${c};border-color:${c}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function pathLatLngs(verts) {
  return (verts || [])
    .filter(
      (v) => v && Number.isFinite(v.lat) && Number.isFinite(v.lng)
    )
    .map((v) => [v.lat, v.lng]);
}

/**
 * Preview del polígono en edición: vértices arrastrables.
 * `vertices`: `{ index, lat, lng }[]` (index = índice en el formulario).
 * Durante el drag actualiza el path en Leaflet (sin re-render); al soltar sincroniza el form.
 */
export function ZoneDraftPreview({
  vertices = [],
  color = "#0d9488",
  interactive = true,
  onVertexDragEnd,
}) {
  const icon = useMemo(() => vertexIcon(color), [color]);
  const endRef = useRef(onVertexDragEnd);
  endRef.current = onVertexDragEnd;

  const vertsRef = useRef(vertices || []);
  const pathRef = useRef(null);

  useEffect(() => {
    vertsRef.current = vertices || [];
  }, [vertices]);

  const verts = (vertices || []).filter(
    (v) =>
      v &&
      Number.isFinite(v.index) &&
      Number.isFinite(v.lat) &&
      Number.isFinite(v.lng)
  );

  if (verts.length === 0) return null;

  const pathPositions = pathLatLngs(verts);
  const pathOptions = {
    color: color || "#0d9488",
    weight: 2,
    fillColor: color || "#0d9488",
    fillOpacity: 0.2,
    dashArray: "6 4",
    interactive: false,
  };

  function applyPathFromVerts(nextVerts) {
    vertsRef.current = nextVerts;
    const layer = pathRef.current;
    if (!layer || typeof layer.setLatLngs !== "function") return;
    const latlngs = pathLatLngs(nextVerts);
    if (latlngs.length >= 2) {
      layer.setLatLngs(latlngs);
    }
  }

  return (
    <>
      {verts.map((v) => (
        <Marker
          key={`zd-v-${v.index}`}
          position={[v.lat, v.lng]}
          icon={icon}
          draggable={Boolean(interactive)}
          autoPan={false}
          eventHandlers={{
            drag(e) {
              if (!interactive) return;
              const ll = e.target.getLatLng();
              const next = (vertsRef.current || []).map((item) =>
                item.index === v.index
                  ? { ...item, lat: ll.lat, lng: ll.lng }
                  : item
              );
              applyPathFromVerts(next);
            },
            dragend(e) {
              if (!interactive) return;
              const ll = e.target.getLatLng();
              const next = (vertsRef.current || []).map((item) =>
                item.index === v.index
                  ? { ...item, lat: ll.lat, lng: ll.lng }
                  : item
              );
              applyPathFromVerts(next);
              endRef.current?.(v.index, ll.lat, ll.lng);
            },
            click(e) {
              L.DomEvent.stopPropagation(e);
            },
          }}
        />
      ))}
      {pathPositions.length >= 3 ? (
        <Polygon
          ref={pathRef}
          positions={pathPositions}
          pathOptions={pathOptions}
        />
      ) : pathPositions.length === 2 ? (
        <Polyline
          ref={pathRef}
          positions={pathPositions}
          pathOptions={pathOptions}
        />
      ) : null}
    </>
  );
}

/**
 * Polígonos de zonas personales del usuario.
 * Solo visual (`interactive: false`); no se dibujan las ocultas.
 *
 * @param {{ zones: object[], showNames?: boolean }} props
 */
export function UserZonesLayer({ zones = [], showNames = false }) {
  const visible = (zones || []).filter(
    (z) =>
      !z.hidden &&
      Array.isArray(z.positions) &&
      z.positions.length >= 3
  );
  if (!visible.length) return null;
  return (
    <>
      {visible.map((z) => {
        const id = String(z._id || z.id || "");
        const centroid = zoneCentroid(z.positions);
        return (
          <span key={id}>
            <Polygon
              positions={z.positions}
              pathOptions={{
                color: z.color || "#0d9488",
                weight: 2,
                fillColor: z.color || "#0d9488",
                fillOpacity: 0.25,
                interactive: false,
              }}
            />
            {showNames && z.name && centroid ? (
              <Marker
                position={centroid}
                interactive={false}
                keyboard={false}
                icon={L.divIcon({
                  className: "centinela-feature-name-label",
                  html: `<span class="centinela-feature-name-label__text" style="transform:translate(-50%,-50%)">${escapeHtml(
                    z.name
                  )}</span>`,
                  iconSize: [0, 0],
                  iconAnchor: [0, 0],
                })}
              />
            ) : null}
          </span>
        );
      })}
    </>
  );
}

function zoneCentroid(positions) {
  if (!Array.isArray(positions) || positions.length === 0) return null;
  let latSum = 0;
  let lngSum = 0;
  let n = 0;
  for (const p of positions) {
    const lat = Number(Array.isArray(p) ? p[0] : p?.lat);
    const lng = Number(Array.isArray(p) ? p[1] : p?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    latSum += lat;
    lngSum += lng;
    n += 1;
  }
  if (!n) return null;
  return [latSum / n, lngSum / n];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
