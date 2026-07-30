import { useEffect, useState } from "react";
import { ErrorAlert } from "./ErrorAlert.jsx";

const OUTCOME_OPTIONS = [
  { value: "arrived", label: "Arribado" },
  { value: "maritimeIncident", label: "Incidente marítimo" },
];

/**
 * Modal para cerrar un movimiento en tránsito.
 * - mode "close" (default): demorados — Arribado / Incidente marítimo
 * - mode "confirmArrival": arribos — solo confirma arribo (outcome arrived)
 */
export function SportMovementCloseModal({
  open,
  movement,
  onClose,
  onSubmit,
  saving = false,
  mode = "close",
}) {
  const confirmArrival = mode === "confirmArrival";
  const [outcome, setOutcome] = useState("arrived");
  const [observations, setObservations] = useState("");
  const [formErr, setFormErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setOutcome("arrived");
    setObservations("");
    setFormErr("");
  }, [open, movement?._id, mode]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormErr("");
    const finalOutcome = confirmArrival ? "arrived" : outcome;
    if (!finalOutcome) {
      setFormErr("Seleccione el resultado del cierre.");
      return;
    }
    try {
      await onSubmit({
        outcome: finalOutcome,
        observations: observations.trim(),
      });
    } catch (err) {
      setFormErr(
        err?.message ||
          (confirmArrival
            ? "No se pudo confirmar el arribo."
            : "No se pudo cerrar el caso.")
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
              <h5 className="modal-title">
                {confirmArrival ? "Confirmar arribo" : "Cerrar caso"}
              </h5>
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
                Desde: <strong>{movement.originUnit || "—"}</strong>
              </p>

              {formErr ? (
                <ErrorAlert message={formErr} />
              ) : null}

              {confirmArrival ? (
                <p className="small mb-3">
                  El movimiento se registrará como{" "}
                  <strong>Arribado</strong> y pasará a buques arribados.
                </p>
              ) : (
                <div className="mb-3">
                  <label className="form-label" htmlFor="close-outcome">
                    Resultado
                  </label>
                  <select
                    id="close-outcome"
                    className="form-select"
                    required
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    disabled={saving}
                  >
                    {OUTCOME_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <div className="form-text">
                    «Incidente marítimo» se registrará como{" "}
                    <strong>Siniestrado</strong> en buques arribados.
                  </div>
                </div>
              )}

              <div className="mb-0">
                <label className="form-label" htmlFor="close-obs">
                  Observaciones
                </label>
                <textarea
                  id="close-obs"
                  className="form-control"
                  rows={3}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  disabled={saving}
                  placeholder={
                    confirmArrival
                      ? "Detalle opcional del arribo…"
                      : "Detalle opcional del cierre…"
                  }
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
                className="btn btn-primary"
                disabled={saving}
              >
                {saving
                  ? confirmArrival
                    ? "Confirmando…"
                    : "Cerrando…"
                  : confirmArrival
                    ? "Confirmar arribo"
                    : "Cerrar caso"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
