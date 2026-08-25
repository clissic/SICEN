import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

const NAV_STATUS = {
  0: "En navegación con motor",
  1: "Fondeado",
  2: "Sin mando",
  3: "Maniobrabilidad restringida",
  4: "Restringido por calado",
  5: "Amarrado",
  6: "Encallado",
  7: "Pesca",
  8: "Navegación a vela",
};

function shipIcon(heading) {
  const rot =
    typeof heading === "number" && Number.isFinite(heading) ? heading : 0;
  return L.divIcon({
    className: "centinela-ais-marker",
    html: `<div class="centinela-ais-marker__body" style="transform:rotate(${rot}deg)" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path fill="#0b3d91" stroke="#fff" stroke-width="1.2"
          d="M12 2 L19 20 L12 16 L5 20 Z"/>
      </svg>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -10],
  });
}

/**
 * Capa de markers AIS. El padre controla si se monta (toggle de capa).
 */
export function AisVesselLayer({ vessels }) {
  const icons = useMemo(() => {
    const map = new Map();
    for (const v of vessels) {
      map.set(String(v.mmsi), shipIcon(v.heading ?? v.cog));
    }
    return map;
  }, [vessels]);

  return (
    <>
      {vessels.map((v) => {
        if (!Number.isFinite(v.lat) || !Number.isFinite(v.lon)) return null;
        const mmsi = String(v.mmsi);
        return (
          <Marker
            key={mmsi}
            position={[v.lat, v.lon]}
            icon={icons.get(mmsi)}
          >
            <Popup>
              <div className="centinela-ais-popup">
                <div className="fw-semibold">
                  {v.name?.trim() || "Buque sin nombre"}
                </div>
                <div className="small text-muted">MMSI {mmsi}</div>
                <ul className="list-unstyled small mb-0 mt-2">
                  {typeof v.sog === "number" ? (
                    <li>SOG: {(v.sog * 1).toFixed(1)} kn</li>
                  ) : null}
                  {typeof v.cog === "number" ? (
                    <li>COG: {Math.round(v.cog)}°</li>
                  ) : null}
                  {typeof v.heading === "number" ? (
                    <li>Rumbo: {Math.round(v.heading)}°</li>
                  ) : null}
                  {typeof v.navStatus === "number" ? (
                    <li>
                      Estado:{" "}
                      {NAV_STATUS[v.navStatus] ?? `Código ${v.navStatus}`}
                    </li>
                  ) : null}
                  {v.callsign ? <li>Indicativo: {v.callsign}</li> : null}
                </ul>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
