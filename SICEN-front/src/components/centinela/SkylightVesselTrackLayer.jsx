import { Fragment, useMemo } from "react";
import { CircleMarker, Polyline, Marker } from "react-leaflet";
import L from "leaflet";
import { formatCoordDms } from "../../utils/geoDms.js";
import { formatSkylightWhen } from "../../utils/skylightEventHelpers.js";
import { stopLeafletMapClick } from "../../utils/stopLeafletMapClick.js";

const DEFAULT_TRACK_COLOR = "#0b6bcb";
const DEFAULT_PRED_COLOR = "#c0392b";

function predIconFor(color) {
  const fill = color || DEFAULT_PRED_COLOR;
  return L.divIcon({
    className: "centinela-skylight-pred-marker",
    html: `<div class="centinela-skylight-pred-marker__body" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="18" height="18">
      <circle cx="12" cy="12" r="8" fill="${fill}" stroke="#fff" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="#fff"/>
    </svg>
  </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/**
 * Track histórico + predicción de uno o varios dossiers (colores distintos).
 * `sessions`: [{ key, dossier, color }]
 */
export function SkylightVesselTrackLayer({
  sessions = null,
  dossier = null,
  color = DEFAULT_TRACK_COLOR,
  onOpenDetail,
}) {
  const items = useMemo(() => {
    if (Array.isArray(sessions) && sessions.length > 0) {
      return sessions.filter((s) => s?.dossier);
    }
    if (dossier) {
      return [{ key: dossier.mmsi || "vessel", dossier, color }];
    }
    return [];
  }, [sessions, dossier, color]);

  if (items.length === 0) return null;

  return (
    <>
      {items.map((session) => {
        const d = session.dossier;
        const trackColor = session.color || DEFAULT_TRACK_COLOR;
        const predColor = session.color || DEFAULT_PRED_COLOR;
        const tracks = Array.isArray(d.tracks) ? d.tracks : [];
        const pred = d.prediction;
        const originLat = Number(pred?.origin?.lat);
        const originLon = Number(pred?.origin?.lon);
        const predLat = Number(pred?.lat);
        const predLon = Number(pred?.lon);
        const hasOrigin =
          Number.isFinite(originLat) && Number.isFinite(originLon);
        const hasPred = Number.isFinite(predLat) && Number.isFinite(predLon);
        const predPath =
          Array.isArray(pred?.path) && pred.path.length >= 2
            ? pred.path
            : null;
        const icon = predIconFor(predColor);
        const keyBase = String(session.key || d.mmsi || "vessel");

        return (
          <Fragment key={keyBase}>
            {tracks.map((t) => (
              <Polyline
                key={`${keyBase}:${t.subpathId}`}
                positions={t.positions}
                pathOptions={{
                  color: trackColor,
                  weight: 3,
                  opacity: 0.85,
                }}
              />
            ))}

            {predPath ? (
              <Polyline
                positions={predPath}
                pathOptions={{
                  color: predColor,
                  weight: 2.5,
                  opacity: 0.9,
                  dashArray: "8 6",
                }}
              />
            ) : hasOrigin && hasPred ? (
              <Polyline
                positions={[
                  [originLat, originLon],
                  [predLat, predLon],
                ]}
                pathOptions={{
                  color: predColor,
                  weight: 2.5,
                  opacity: 0.9,
                  dashArray: "8 6",
                }}
              />
            ) : null}

            {hasPred ? (
              <Marker
                position={[predLat, predLon]}
                icon={icon}
                bubblingMouseEvents={false}
                eventHandlers={{
                  click: (e) => {
                    stopLeafletMapClick(e);
                    const oe = e?.originalEvent;
                    onOpenDetail?.({
                      id: `pred:${d.mmsi || keyBase}`,
                      title: "Predicción (dead reckoning)",
                      anchor:
                        Number.isFinite(oe?.clientX) &&
                        Number.isFinite(oe?.clientY)
                          ? { x: oe.clientX, y: oe.clientY }
                          : null,
                      body: (
                        <div className="centinela-skylight-popup">
                          <div className="centinela-skylight-popup__name">
                            Predicción (dead reckoning)
                          </div>
                          <ul className="centinela-skylight-popup__meta list-unstyled mb-0">
                            <li>Lat. {formatCoordDms(predLat, "lat")}</li>
                            <li>Long. {formatCoordDms(predLon, "lng")}</li>
                            {pred?.origin?.sentAt ? (
                              <li>
                                Origen: {formatSkylightWhen(pred.origin.sentAt)}
                              </li>
                            ) : null}
                          </ul>
                        </div>
                      ),
                    });
                  },
                }}
              />
            ) : null}

            {hasOrigin ? (
              <CircleMarker
                center={[originLat, originLon]}
                radius={5}
                pathOptions={{
                  color: "#fff",
                  weight: 1.5,
                  fillColor: trackColor,
                  fillOpacity: 0.95,
                }}
                interactive={false}
              />
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}
