import { useEffect, useState } from "react";
import { ErrorAlert } from "./ErrorAlert.jsx";

function formatEta(iso) {
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

/**
 * Confirmación de arribo informado por náuta (cierra movimiento y notifica prefecturas).
 */
export function SkipperReportArrivalModal({
  open,
  movement,
  onClose,
  onSubmit,
  saving = false,
}) {
  const [observations, setObservations] = useState("");
  const [formErr, setFormErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setObservations("");
    setFormErr("");
  }, [open, movement?._id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormErr("");
    try {
      await onSubmit({ observations: observations.trim() });
    } catch (err) {
      setFormErr(err?.message || "No se pudo informar el arribo.");
    }
  }

  if (!open || !movement) return null;

  const vesselName = movement.vesselSnapshot?.name || "—";
  const vesselReg = movement.vesselSnapshot?.nationalRegistryNumber || "—";

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      style={{ background: "rgba(0,0,0,0.45)" }}
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Informar arribo</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={onClose}
                disabled={saving}
              />
            </div>
            <div className="modal-body">
              <p className="small text-muted mb-3">
                Buque: <strong>{vesselName}</strong> · Matrícula:{" "}
                <strong>{vesselReg}</strong>
              </p>
              <dl className="row small mb-3">
                <dt className="col-sm-5 text-muted">Destino</dt>
                <dd className="col-sm-7">
                  {movement.destinationPort || "—"} (
                  {movement.destinationUnit || "—"})
                </dd>
                <dt className="col-sm-5 text-muted">ETA</dt>
                <dd className="col-sm-7">{formatEta(movement.eta)}</dd>
              </dl>
              <p className="small mb-3">
                Al confirmar, el movimiento se cerrará como{" "}
                <strong>Arribado</strong> y se notificará por correo a las
                prefecturas involucradas.
              </p>
              <ErrorAlert message={formErr} />
              <label className="form-label" htmlFor="skipper-arrival-obs">
                Observaciones (opcional)
              </label>
              <textarea
                id="skipper-arrival-obs"
                className="form-control"
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                disabled={saving}
                maxLength={2000}
              />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? "Enviando…" : "Confirmar arribo"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
