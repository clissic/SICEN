import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from "react-leaflet";
import { sportMovementTrack } from "../api/client.js";
import { getCentinelaBaseTiles } from "../constants/centinelaMapTiles.js";
import { ErrorAlert } from "./ErrorAlert.jsx";
import { ModalPortal, SICEN_MODAL_Z_INDEX } from "./ModalPortal.jsx";
import { useBootstrapTheme } from "./ThemeToggle.jsx";
import { formatCoordDms } from "../utils/geoDms.js";
import "leaflet/dist/leaflet.css";

function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const id = requestAnimationFrame(() => map.invalidateSize());
    return () => cancelAnimationFrame(id);
  }, [map]);
  return null;
}

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
    second: "2-digit",
  });
}

function mapCenter(points) {
  if (!points?.length) return [-34.9, -56.2];
  const lat = points.reduce((s, p) => s + p.latitude, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.longitude, 0) / points.length;
  return [lat, lng];
}

/**
 * Modal con mapa del recorrido completo y tabla de posiciones GPS.
 */
export function SportMovementPositionHistoryModal({
  open,
  movement,
  onClose,
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [track, setTrack] = useState(null);

  const bsTheme = useBootstrapTheme();
  const isDark = bsTheme === "dark";
  const baseTiles = getCentinelaBaseTiles(isDark);

  const movementId = movement?._id || movement?.movementId;

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
        if (!cancelled) {
          setErr(e?.message || "No se pudo cargar el historial de posiciones.");
        }
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
  const polyline = useMemo(
    () => points.map((p) => [p.latitude, p.longitude]),
    [points]
  );

  if (!open || !movement) return null;

  const vesselName =
    movement.vesselSnapshot?.name || movement.vesselName || "Buque";
  const vesselReg =
    movement.vesselSnapshot?.nationalRegistryNumber ||
    movement.vesselReg ||
    "—";

  return (
    <ModalPortal>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        style={{ background: "rgba(0,0,0,0.45)", zIndex: SICEN_MODAL_Z_INDEX }}
        onClick={onClose}
      >
      <div
        className="modal-dialog modal-xl modal-dialog-scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Historial de posiciones</h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Cerrar"
              onClick={onClose}
            />
          </div>
          <div className="modal-body">
            <p className="small text-muted mb-3">
              <strong>{vesselName}</strong> · Matrícula: <strong>{vesselReg}</strong>
              {track?.summary?.count != null ? (
                <>
                  {" "}
                  · <strong>{track.summary.count}</strong> posición
                  {track.summary.count === 1 ? "" : "es"}
                </>
              ) : null}
            </p>
            <ErrorAlert message={err} />
            {loading ? (
              <p className="small text-muted">Cargando historial…</p>
            ) : points.length > 0 ? (
              <>
                <div
                  className="rounded border overflow-hidden mb-3 sicen-leaflet-map"
                  style={{ height: 360 }}
                >
                  <MapContainer
                    key={isDark ? "dark" : "light"}
                    className="sicen-leaflet-map__canvas"
                    center={center}
                    zoom={11}
                    style={{ height: "100%", width: "100%" }}
                    scrollWheelZoom
                  >
                    <TileLayer
                      attribution={baseTiles.attribution}
                      url={baseTiles.url}
                    />
                    <MapInvalidateSize />
                    {polyline.length >= 2 ? (
                      <Polyline
                        positions={polyline}
                        pathOptions={{ color: "#c45c26", weight: 3 }}
                      />
                    ) : null}
                    {points.map((p, idx) => (
                      <CircleMarker
                        key={`${p.positionTimestamp}-${idx}`}
                        center={[p.latitude, p.longitude]}
                        radius={idx === 0 || idx === points.length - 1 ? 6 : 3}
                        pathOptions={{
                          color: "#fff",
                          weight: 1,
                          fillColor:
                            idx === 0
                              ? "#198754"
                              : idx === points.length - 1
                                ? "#c45c26"
                                : "#6c757d",
                          fillOpacity: 0.9,
                        }}
                      />
                    ))}
                  </MapContainer>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm table-striped align-middle mb-0">
                    <thead>
                      <tr>
                        <th scope="col">Nº</th>
                        <th scope="col">Fecha / hora</th>
                        <th scope="col">Latitud</th>
                        <th scope="col">Longitud</th>
                      </tr>
                    </thead>
                    <tbody>
                      {points.map((p, idx) => (
                        <tr key={`row-${p.positionTimestamp}-${idx}`}>
                          <td>{idx + 1}</td>
                          <td className="text-nowrap">
                            {formatDateTime(p.positionTimestamp || p.receivedAt)}
                          </td>
                          <td className="text-nowrap">
                            {formatCoordDms(p.latitude, "lat")}
                          </td>
                          <td className="text-nowrap">
                            {formatCoordDms(p.longitude, "lng")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="small text-muted mb-0">
                Aún no hay posiciones registradas para este movimiento.
              </p>
            )}
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
    </ModalPortal>
  );
}
