import { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import { formatCoordDms } from "../../utils/geoDms.js";

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

function formatAisAge(vessel) {
  let sec = Number(vessel?.ageOfPositionSeconds);
  if (!Number.isFinite(sec) || sec < 0) {
    const ts = vessel?.sentAt || vessel?.updatedAt;
    if (ts == null) return null;
    const t = typeof ts === "number" ? ts : Date.parse(ts);
    if (!Number.isFinite(t)) return null;
    sec = Math.max(0, Math.round((Date.now() - t) / 1000));
  }
  if (sec < 60) return "hace unos segundos";
  if (sec < 3600) {
    const m = Math.round(sec / 60);
    return `hace ${m} min`;
  }
  if (sec < 86400) {
    const h = Math.round(sec / 3600);
    return `hace ${h} h`;
  }
  const d = Math.round(sec / 86400);
  return `hace ${d} d`;
}

function aisSourceLabel(vessel) {
  const src = vessel?.positionSource;
  if (src === "skylight") return "Skylight (última conocida)";
  if (src === "aisstream") return "AISStream (en vivo)";
  if (vessel?.sources?.skylight && !vessel?.sources?.aisstream) {
    return "Skylight (última conocida)";
  }
  if (vessel?.sources?.aisstream) return "AISStream (en vivo)";
  return null;
}

function shipIcon(heading, { matched, selected } = {}) {
  const rot =
    typeof heading === "number" && Number.isFinite(heading) ? heading : 0;
  const fill = selected ? "#6c3483" : matched ? "#8e44ad" : "#0b3d91";
  const ring = selected || matched ? "2.2" : "1.2";
  return L.divIcon({
    className: [
      "centinela-ais-marker",
      matched ? "is-skylight-matched" : "",
      selected ? "is-selected" : "",
    ]
      .filter(Boolean)
      .join(" "),
    html: `<div class="centinela-ais-marker__body" style="transform:rotate(${rot}deg)" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path fill="${fill}" stroke="#fff" stroke-width="${ring}"
          d="M12 2 L19 20 L12 16 L5 20 Z"/>
      </svg>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

/** Cuerpo de detalle AIS (ventana fija). */
export function AisVesselDetailBody({
  vessel,
  matched = false,
  onOpenDossier,
}) {
  if (!vessel) return null;
  const mmsi = String(vessel.mmsi);
  const ageLabel = formatAisAge(vessel);
  const sourceLabel = aisSourceLabel(vessel);
  return (
    <div className="centinela-ais-popup">
      <div className="centinela-ais-popup__name">
        {vessel.name?.trim() || "Buque sin nombre"}
      </div>
      <div className="centinela-ais-popup__ids">
        <div>MMSI {mmsi}</div>
        {vessel.imo != null && Number(vessel.imo) > 0 ? (
          <div>OMI {vessel.imo}</div>
        ) : (
          <div>OMI no disponible</div>
        )}
        {matched ? (
          <div className="centinela-ais-popup__match">Cruce Skylight</div>
        ) : null}
      </div>
      <ul className="centinela-ais-popup__meta list-unstyled mb-0">
        <li>Lat. {formatCoordDms(vessel.lat, "lat")}</li>
        <li>Long. {formatCoordDms(vessel.lon, "lng")}</li>
        {typeof vessel.sog === "number" ? (
          <li>SOG: {(vessel.sog * 1).toFixed(1)} kn</li>
        ) : null}
        {typeof vessel.cog === "number" ? (
          <li>COG: {Math.round(vessel.cog)}°</li>
        ) : null}
        {typeof vessel.heading === "number" ? (
          <li>Rumbo: {Math.round(vessel.heading)}°</li>
        ) : null}
        {typeof vessel.navStatus === "number" ? (
          <li>
            Estado:{" "}
            {NAV_STATUS[vessel.navStatus] ?? `Código ${vessel.navStatus}`}
          </li>
        ) : null}
        {vessel.callsign ? <li>Indicativo: {vessel.callsign}</li> : null}
        {vessel.aisClass ? <li>Clase AIS: {vessel.aisClass}</li> : null}
        {ageLabel ? <li>Antigüedad: {ageLabel}</li> : null}
        {sourceLabel ? <li>Fuente: {sourceLabel}</li> : null}
        {vessel.sources?.gfw ? (
          <li>Identidad: Global Fishing Watch</li>
        ) : null}
      </ul>
      {onOpenDossier ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-primary mt-2 centinela-ais-popup__dossier-btn"
          onClick={() => onOpenDossier(vessel)}
        >
          Historial / predicción
        </button>
      ) : null}
    </div>
  );
}

/**
 * Capa de markers AIS. El padre controla si se monta (toggle de capa).
 */
export function AisVesselLayer({
  vessels,
  matchedMmsis = null,
  selectedMmsi = null,
  onSelectVessel,
}) {
  const matched =
    matchedMmsis instanceof Set ? matchedMmsis : new Set(matchedMmsis || []);

  const icons = useMemo(() => {
    const map = new Map();
    for (const v of vessels) {
      const mmsi = String(v.mmsi);
      map.set(
        mmsi,
        shipIcon(v.heading ?? v.cog, {
          matched: matched.has(mmsi),
          selected: selectedMmsi != null && String(selectedMmsi) === mmsi,
        })
      );
    }
    return map;
  }, [vessels, matched, selectedMmsi]);

  return (
    <>
      {vessels.map((v) => {
        if (!Number.isFinite(v.lat) || !Number.isFinite(v.lon)) return null;
        const mmsi = String(v.mmsi);
        const isMatched = matched.has(mmsi);
        return (
          <Marker
            key={mmsi}
            position={[v.lat, v.lon]}
            icon={icons.get(mmsi)}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e.originalEvent);
                L.DomEvent.preventDefault(e.originalEvent);
                onSelectVessel?.(v);
              },
            }}
            zIndexOffset={
              selectedMmsi != null && String(selectedMmsi) === mmsi
                ? 800
                : isMatched
                  ? 400
                  : 0
            }
          />
        );
      })}
    </>
  );
}
