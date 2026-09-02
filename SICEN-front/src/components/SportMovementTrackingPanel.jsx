import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import { sportMovementTrack } from "../api/client.js";
import { ErrorAlert } from "./ErrorAlert.jsx";
import { SicenPositioningLayer } from "./centinela/SicenPositioningLayer.jsx";
import { formatCoordDms } from "../utils/geoDms.js";
import "leaflet/dist/leaflet.css";

const COMM_LABELS = {
  normal: "Señal normal",
  no_signal_3: "Sin señal (5 min)",
  no_signal_5: "Sin señal (5 min)",
};

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapCenter(points) {
  if (!points?.length) return [-34.9, -56.2];
  const lat =
    points.reduce((s, p) => s + p.latitude, 0) / points.length;
  const lng =
    points.reduce((s, p) => s + p.longitude, 0) / points.length;
  return [lat, lng];
}

/**
 * Panel/modal con recorrido GPS de un movimiento deportivo.
 */
export function SportMovementTrackingPanel({
  open,
  movement,
  onClose,
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [track, setTrack] = useState(null);

  const movementId = movement?._id;

  useEffect(() => {
    if (!open || !movementId) return;
    let cancelled = false;
    setLoading(true);
    setErr("");
    setTrack(null);
    sportMovementTrack(movementId)
      .then((data) => {
        if (!cancelled) setTrack(data);
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.message || "No se pudo cargar el recorrido.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, movementId]);

  const points = track?.points || [];
  const center = useMemo(() => mapCenter(points), [points]);
  const layerItem = useMemo(() => {
    if (!movement) return null;
    const lp = track?.movement?.tracking?.lastPosition;
    return {
      movementId: movement._id,
      vesselName: movement.vesselSnapshot?.name,
      vesselReg: movement.vesselSnapshot?.nationalRegistryNumber,
      skipperName: movement.skipper?.fullName,
      originUnit: movement.originUnit,
      destinationUnit: movement.destinationUnit,
      eta: movement.eta,
      tracking: track?.movement?.tracking || movement.tracking,
      lastPosition: lp,
      trackPoints: points,
    };
  }, [movement, track, points]);

  if (!open || !movement) return null;

  const comm =
    track?.movement?.tracking?.communicationState ||
    movement.tracking?.communicationState ||
    "normal";

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      style={{ background: "rgba(0,0,0,0.45)" }}
    >
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Seguimiento GPS</h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Cerrar"
              onClick={onClose}
            />
          </div>
          <div className="modal-body">
            <p className="small text-muted mb-2">
              <strong>{movement.vesselSnapshot?.name || "—"}</strong> ·{" "}
              {movement.vesselSnapshot?.nationalRegistryNumber || "—"}
            </p>
            <dl className="row small mb-3">
              <dt className="col-sm-4 text-muted">Patrón</dt>
              <dd className="col-sm-8">{movement.skipper?.fullName || "—"}</dd>
              <dt className="col-sm-4 text-muted">Ruta</dt>
              <dd className="col-sm-8">
                {movement.originUnit} → {movement.destinationUnit}
              </dd>
              <dt className="col-sm-4 text-muted">Comunicación</dt>
              <dd className="col-sm-8">{COMM_LABELS[comm] || comm}</dd>
              <dt className="col-sm-4 text-muted">Posiciones</dt>
              <dd className="col-sm-8">{track?.summary?.count ?? "—"}</dd>
              <dt className="col-sm-4 text-muted">Última posición</dt>
              <dd className="col-sm-8">
                {formatDateTime(track?.summary?.lastTimestamp)}
                {Number.isFinite(layerItem?.lastPosition?.latitude) &&
                Number.isFinite(layerItem?.lastPosition?.longitude) ? (
                  <div className="small text-muted">
                    Lat. {formatCoordDms(layerItem.lastPosition.latitude, "lat")}
                    <br />
                    Long. {formatCoordDms(layerItem.lastPosition.longitude, "lng")}
                  </div>
                ) : null}
              </dd>
            </dl>
            <ErrorAlert message={err} />
            {loading ? (
              <p className="small text-muted">Cargando recorrido…</p>
            ) : points.length >= 2 ? (
              <div className="rounded border overflow-hidden mb-3" style={{ height: 320 }}>
                <MapContainer
                  center={center}
                  zoom={10}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Polyline
                    positions={points.map((p) => [p.latitude, p.longitude])}
                    pathOptions={{ color: "#c45c26", weight: 3 }}
                  />
                  {layerItem ? <SicenPositioningLayer items={[layerItem]} /> : null}
                </MapContainer>
              </div>
            ) : (
              <p className="small text-muted">
                Aún no hay posiciones registradas para este movimiento.
              </p>
            )}
            <Link to="/centinela" className="btn btn-sm btn-outline-primary">
              Ver en El Centinela
            </Link>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
