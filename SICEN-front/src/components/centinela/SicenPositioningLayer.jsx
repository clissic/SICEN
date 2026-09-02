import { useMemo, useState } from "react";
import { Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import { formatCoordDms } from "../../utils/geoDms.js";
import { SportMovementSkipperContactModal } from "../SportMovementSkipperContactModal.jsx";
import { SportMovementPositionHistoryModal } from "../SportMovementPositionHistoryModal.jsx";

const COMM_LABELS = {
  normal: "Señal normal",
  no_signal_3: "Sin señal (5 min)",
  no_signal_5: "Sin señal (5 min)",
};

function formatTs(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function vesselIcon() {
  return L.divIcon({
    className: "centinela-sicen-pos-marker",
    html: `<div class="centinela-sicen-pos-marker__body" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="20" height="20">
        <circle cx="12" cy="12" r="8" fill="#c45c26" stroke="#fff" stroke-width="1.5"/>
      </svg>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -8],
  });
}

function mapItemToMovement(item) {
  if (!item) return null;
  return {
    _id: item.movementId,
    movementId: item.movementId,
    vesselName: item.vesselName,
    vesselReg: item.vesselReg,
    vesselSnapshot: {
      name: item.vesselName,
      nationalRegistryNumber: item.vesselReg,
    },
    skipper: item.skipper?.fullName
      ? item.skipper
      : { fullName: item.skipperName || "" },
    originUnit: item.originUnit,
    destinationUnit: item.destinationUnit,
    eta: item.eta,
    tracking: item.tracking,
  };
}

/**
 * Capa de posicionamiento SICEN (movimientos deportivos en tránsito).
 */
export function SicenPositioningLayer({ items = [] }) {
  const icon = useMemo(() => vesselIcon(), []);
  const [contactItem, setContactItem] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);

  const contactMovement = useMemo(
    () => mapItemToMovement(contactItem),
    [contactItem]
  );
  const historyMovement = useMemo(
    () => mapItemToMovement(historyItem),
    [historyItem]
  );

  return (
    <>
      {items.map((item) => {
        const lp = item.lastPosition || item.tracking?.lastPosition;
        const lat = lp?.latitude;
        const lng = lp?.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const id = String(item.movementId);
        const comm = item.tracking?.communicationState || "normal";
        const etaOverdue = Boolean(
          item.tracking?.etaOverdueAlertAt || item.delayedNotifiedAt
        );
        const trackPoints = item.trackPoints;
        const skipperLabel =
          item.skipper?.fullName?.trim() || item.skipperName?.trim() || "";
        return (
          <span key={id}>
            {Array.isArray(trackPoints) && trackPoints.length >= 2 ? (
              <Polyline
                positions={trackPoints.map((p) => [p.latitude, p.longitude])}
                pathOptions={{
                  color: "#c45c26",
                  weight: 3,
                  opacity: 0.75,
                }}
              />
            ) : null}
            <Marker position={[lat, lng]} icon={icon}>
              <Popup className="centinela-ais-leaflet-popup">
                <div className="centinela-ais-popup">
                  <div className="centinela-ais-popup__name">
                    {item.vesselName?.trim() || "Buque deportivo"}
                  </div>
                  <div className="centinela-ais-popup__ids">
                    {item.vesselReg ? <div>Mat. {item.vesselReg}</div> : null}
                    {skipperLabel ? (
                      <div>
                        Patrón:{" "}
                        <button
                          type="button"
                          className="centinela-sicen-popup__skipper-link"
                          onClick={() => setContactItem(item)}
                        >
                          {skipperLabel}
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <ul className="centinela-ais-popup__meta list-unstyled mb-0">
                    <li>
                      {item.originUnit} → {item.destinationUnit}
                    </li>
                    <li>ETA: {formatTs(item.eta)}</li>
                    <li>Comunicación: {COMM_LABELS[comm] || comm}</li>
                    {etaOverdue ? (
                      <li className="text-warning">ETA vencida</li>
                    ) : null}
                    <li>
                      Última posición:{" "}
                      {formatTs(lp.positionTimestamp || lp.receivedAt)}
                      <div className="small text-muted">
                        Lat. {formatCoordDms(lat, "lat")}
                        <br />
                        Long. {formatCoordDms(lng, "lng")}
                      </div>
                    </li>
                    {typeof lp.accuracy === "number" ? (
                      <li>Precisión: ±{Math.round(lp.accuracy)} m</li>
                    ) : null}
                  </ul>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary w-100 mt-2"
                    onClick={() => setHistoryItem(item)}
                  >
                    Ver historial
                  </button>
                </div>
              </Popup>
            </Marker>
          </span>
        );
      })}

      <SportMovementSkipperContactModal
        open={Boolean(contactMovement)}
        movement={contactMovement}
        onClose={() => setContactItem(null)}
      />

      <SportMovementPositionHistoryModal
        open={Boolean(historyMovement)}
        movement={historyMovement}
        onClose={() => setHistoryItem(null)}
      />
    </>
  );
}
