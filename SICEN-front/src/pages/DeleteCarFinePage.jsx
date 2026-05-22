import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { carFineDelete, carFineForDelete } from "../api/client.js";
import { CarFineCard } from "../components/CarFineCard.jsx";
import { CarFineProveViewer } from "../components/CarFineProveViewer.jsx";
import { Layout } from "../components/Layout.jsx";
import { formatPlate } from "../utils/carFineFormatters.js";
import { preventNegativeNumberKeys } from "../utils/nonNegativeNumberInput.js";

export function DeleteCarFinePage() {
  const [num, setNum] = useState("");
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [searching, setSearching] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const closeViewer = useCallback(() => setViewer(null), []);
  const stepViewer = useCallback((delta) => {
    setViewer((current) => {
      if (!current) return current;
      const len = current.items.length;
      if (len <= 1) return current;
      const next = (current.index + delta + len) % len;
      return { ...current, index: next };
    });
  }, []);

  const closeConfirm = useCallback(() => {
    if (deleting) return;
    setConfirmOpen(false);
  }, [deleting]);

  useEffect(() => {
    if (!confirmOpen) return undefined;
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeConfirm();
      }
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [confirmOpen, closeConfirm]);

  async function loadFine(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setPreview(null);
    setSearching(true);
    try {
      const data = await carFineForDelete(num);
      if (!data.ok || !data.carFine) {
        setErr(data.msg || "No se encontró la multa.");
        return;
      }
      setPreview(data.carFine);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSearching(false);
    }
  }

  async function confirmDelete() {
    if (!preview) return;
    setDeleting(true);
    setErr("");
    setMsg("");
    try {
      const data = await carFineDelete(preview.fine_number);
      setMsg(
        data.msg ||
          `Multa N° ${preview.fine_number} eliminada correctamente.`
      );
      setPreview(null);
      setNum("");
      setConfirmOpen(false);
    } catch (ex) {
      setErr(ex.message || "No se pudo eliminar la multa.");
    } finally {
      setDeleting(false);
    }
  }

  const plate = preview ? formatPlate(preview.car_reg_number) : "";

  return (
    <Layout>
      <div className="container-lg py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Eliminar multa</h3>
          <Link
            className="btn btn-outline-secondary btn-sm"
            to="/multas/vehiculos"
          >
            Volver
          </Link>
        </div>

        <div className="card shadow-sm mb-3">
          <div className="card-body p-4">
            <form
              onSubmit={loadFine}
              className="row g-2 align-items-end"
              autoComplete="off"
            >
              <div className="col-12 col-sm-6">
                <label className="form-label" htmlFor="delete_car_fine_number">
                  N° multa
                </label>
                <input
                  id="delete_car_fine_number"
                  className="form-control"
                  type="number"
                  min={0}
                  step={1}
                  onKeyDown={preventNegativeNumberKeys}
                  value={num}
                  onChange={(e) => setNum(e.target.value)}
                  required
                />
              </div>
              <div className="col-12 col-sm-auto">
                <button
                  type="submit"
                  className="btn btn-primary d-inline-flex align-items-center gap-2"
                  disabled={searching}
                  aria-busy={searching}
                >
                  {searching ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden
                        style={{
                          width: "1em",
                          height: "1em",
                          borderWidth: "0.15em",
                        }}
                      />
                      <span>Buscando…</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-search" aria-hidden />
                      <span>Buscar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {err ? <div className="alert alert-danger py-2">{err}</div> : null}
        {msg ? (
          <div className="alert alert-success py-2" role="status">
            {msg}
          </div>
        ) : null}

        {preview ? (
          <>
            <CarFineCard
              fine={preview}
              onOpenProve={(info) => setViewer(info)}
            />

            <div className="alert alert-warning py-2 mt-3 mb-2 d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill" aria-hidden />
              <span>
                Revisá los datos antes de eliminar. La acción no se puede
                deshacer.
              </span>
            </div>

            <div className="d-flex justify-content-end">
              <button
                type="button"
                className="btn btn-danger d-inline-flex align-items-center gap-2"
                onClick={() => setConfirmOpen(true)}
              >
                <i className="bi bi-trash3" aria-hidden />
                <span>ELIMINAR</span>
              </button>
            </div>
          </>
        ) : null}
      </div>

      <CarFineProveViewer
        viewer={viewer}
        onClose={closeViewer}
        onStep={stepViewer}
      />

      {confirmOpen && preview ? (
        <div
          className="car-fine-status-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar eliminación de multa"
          onClick={closeConfirm}
        >
          <div
            className="car-fine-status-modal__dialog card shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header d-flex align-items-center justify-content-between gap-2">
              <div>
                <div className="fw-semibold">
                  Eliminar Multa N° {preview.fine_number}
                </div>
                {plate ? (
                  <small className="text-muted">Matrícula {plate}</small>
                ) : null}
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={closeConfirm}
                disabled={deleting}
              />
            </div>
            <div className="card-body">
              <div className="alert alert-danger d-flex align-items-start gap-2 mb-3">
                <i
                  className="bi bi-exclamation-octagon-fill fs-4 flex-shrink-0"
                  aria-hidden
                />
                <div>
                  <div className="fw-semibold">
                    ¿Confirmás eliminar esta multa?
                  </div>
                  <div className="small">
                    Se borrarán también las fotos de prueba asociadas. Esta
                    acción no se puede deshacer.
                  </div>
                </div>
              </div>
              {err ? (
                <div className="alert alert-danger py-2">{err}</div>
              ) : null}
            </div>
            <div className="card-footer d-flex flex-wrap justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={closeConfirm}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger d-inline-flex align-items-center gap-2"
                onClick={confirmDelete}
                disabled={deleting}
                aria-busy={deleting}
              >
                {deleting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden
                      style={{
                        width: "1em",
                        height: "1em",
                        borderWidth: "0.15em",
                      }}
                    />
                    <span>Eliminando…</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-trash3" aria-hidden />
                    <span>Confirmar eliminación</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
