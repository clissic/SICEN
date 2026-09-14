import { Fragment } from "react";
import { CircleMarker, Polyline, Marker } from "react-leaflet";
import L from "leaflet";
import { formatCoordDms } from "../../utils/geoDms.js";
import { formatSkylightWhen } from "../../utils/skylightEventHelpers.js";

const TRACK_COLOR = "#0b6bcb";
const PRED_COLOR = "#c0392b";

const predIcon = L.divIcon({
  className: "centinela-skylight-pred-marker",
  html: `<div class="centinela-skylight-pred-marker__body" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="18" height="18">
      <circle cx="12" cy="12" r="8" fill="${PRED_COLOR}" stroke="#fff" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="#fff"/>
    </svg>
  </div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/**
 * Track histórico + predicción del dossier Skylight seleccionado.
 */
export function SkylightVesselTrackLayer({ dossier, onOpenDetail }) {
  if (!dossier) return null;

  const tracks = Array.isArray(dossier.tracks) ? dossier.tracks : [];
  const pred = dossier.prediction;
  const originLat = Number(pred?.origin?.lat);
  const originLon = Number(pred?.origin?.lon);
  const predLat = Number(pred?.lat);
  const predLon = Number(pred?.lon);
  const hasOrigin =
    Number.isFinite(originLat) && Number.isFinite(originLon);
  const hasPred = Number.isFinite(predLat) && Number.isFinite(predLon);
  const predPath =
    Array.isArray(pred?.path) && pred.path.length >= 2 ? pred.path : null;

  return (
    <>
      {tracks.map((t) => (
        <Fragment key={t.subpathId}>
          <Polyline
            positions={t.positions}
            pathOptions={{
              color: TRACK_COLOR,
              weight: 3,
              opacity: 0.85,
            }}
          />
        </Fragment>
      ))}

      {predPath ? (
        <Polyline
          positions={predPath}
          pathOptions={{
            color: PRED_COLOR,
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
            color: PRED_COLOR,
            weight: 2.5,
            opacity: 0.9,
            dashArray: "8 6",
          }}
        />
      ) : null}

      {hasPred ? (
        <Marker
          position={[predLat, predLon]}
          icon={predIcon}
          eventHandlers={{
            click: (e) => {
              if (e?.originalEvent) {
                L.DomEvent.stopPropagation(e.originalEvent);
                L.DomEvent.preventDefault(e.originalEvent);
              }
              onOpenDetail?.({
                id: `pred:${dossier.mmsi || "vessel"}`,
                title: "Predicción (dead reckoning)",
                body: (
                  <div className="centinela-skylight-popup">
                    <div className="centinela-skylight-popup__name">
                      Predicción (dead reckoning)
                    </div>
                    <ul className="centinela-skylight-popup__meta list-unstyled mb-0">
                      <li>Lat. {formatCoordDms(predLat, "lat")}</li>
                      <li>Long. {formatCoordDms(predLon, "lng")}</li>
                      {pred?.origin?.sentAt ? (
                        <li>Origen: {formatSkylightWhen(pred.origin.sentAt)}</li>
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
            fillColor: TRACK_COLOR,
            fillOpacity: 0.95,
          }}
          interactive={false}
        />
      ) : null}
    </>
  );
}
