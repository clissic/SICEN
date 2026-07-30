import { useEffect, useState } from "react";
import { ErrorAlert } from "./ErrorAlert.jsx";

/**
 * Modal para eliminar (anular) un movimiento ya confirmado.
 * Exige motivo; el backend lo guarda en `cancellationReason`.
 */
export function SportMovementCancelConfirmedModal({
  open,
  movement,
  onClose,
  onSubmit,
  saving = false,
}) {
  const [reason, setReason] = useState("");
  const [formErr, setFormErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason("");
    setFormErr("");
  }, [open, movement?._id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormErr("");
    const trimmed = reason.trim();
    if (!trimmed) {
      setFormErr("Indique el motivo de la eliminación.");
      return;
    }
    try {
      await onSubmit({ reason: trimmed });
    } catch (err) {
      setFormErr(
        err?.message || "No se pudo eliminar el movimiento confirmado."
      );
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
              <h5 className="modal-title">Eliminar movimiento confirmado</h5>
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
                <br />
                Destino: <strong>{movement.destinationUnit || "—"}</strong>
                {movement.destinationPort
                  ? ` (${movement.destinationPort})`
                  : ""}
              </p>
              <p className="small mb-3">
                Se anulará el despacho confirmado. El buque y el patrón
                quedarán libres para un nuevo movimiento, y dejará de verse
                en arribos o demorados de la prefectura destino.
              </p>

              <ErrorAlert message={formErr} />

              <div className="mb-0">
                <label className="form-label" htmlFor="cancel-reason">
                  Motivo de la eliminación <span className="text-danger">*</span>
                </label>
                <textarea
                  id="cancel-reason"
                  className="form-control"
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={saving}
                  placeholder="Ej.: confirmación accidental; el patrón no zarpó…"
                />
              </div>
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
                className="btn btn-danger"
                disabled={saving}
              >
                {saving ? "Eliminando…" : "Eliminar movimiento"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
