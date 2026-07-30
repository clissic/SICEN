import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { shipFineDelete, shipFineForDelete } from "../api/client.js";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { CarFineProveViewer } from "../components/CarFineProveViewer.jsx";
import { Layout } from "../components/Layout.jsx";
import { ShipFineCard } from "../components/ShipFineCard.jsx";
import { formatPlate } from "../utils/carFineFormatters.js";
import {
  confirmDelete,
  escapeHtml,
  notifyDeleteError,
  notifyDeleteSuccess,
} from "../utils/confirmDelete.js";
import { preventNegativeNumberKeys } from "../utils/nonNegativeNumberInput.js";

export function DeleteShipFinePage() {
  const [num, setNum] = useState("");
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [searching, setSearching] = useState(false);
  const [viewer, setViewer] = useState(null);
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

  async function loadFine(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setPreview(null);
    setSearching(true);
    try {
      const data = await shipFineForDelete(num);
      if (!data.ok || !data.shipFine) {
        setErr(data.msg || "No se encontró la multa.");
        return;
      }
      setPreview(data.shipFine);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSearching(false);
    }
  }

  async function handleDelete() {
    if (!preview) return;
    const plate = formatPlate(preview.ship_reg_number);
    const omi = String(preview.omi ?? "").trim();
    const article = preview.fine_article
      ? `Art. ${preview.fine_article}`
      : "";
    const result = await confirmDelete({
      resource: "multa de buque",
      summaryHtml: `
        <p class="mb-2">
          Se eliminará la siguiente multa de buque:
        </p>
        <ul class="mb-2 ps-3">
          <li>N° de multa: <strong>${escapeHtml(preview.fine_number)}</strong></li>
          ${plate ? `<li>Matrícula: <strong>${escapeHtml(plate)}</strong></li>` : ""}
          ${omi ? `<li>N° OMI: <strong>${escapeHtml(omi)}</strong></li>` : ""}
          ${article ? `<li>${escapeHtml(article)}</li>` : ""}
        </ul>
      `,
      extraNote: "También se borrarán las fotos de prueba asociadas.",
    });
    if (!result.isConfirmed) return;

    setDeleting(true);
    setErr("");
    try {
      const data = await shipFineDelete(preview.fine_number);
      setPreview(null);
      setNum("");
      setMsg(
        data.msg ||
          `Multa N° ${preview.fine_number} eliminada correctamente.`,
      );
      await notifyDeleteSuccess(data.msg);
    } catch (ex) {
      await notifyDeleteError(ex, "No se pudo eliminar la multa.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Layout>
      <div className="container-lg py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Eliminar multa de buque</h3>
          <Link
            className="btn btn-outline-secondary btn-sm"
            to="/multas/buques"
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
                <label className="form-label" htmlFor="delete_ship_fine_number">
                  N° multa
                </label>
                <input
                  id="delete_ship_fine_number"
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

        <ErrorAlert message={err} />
        {msg ? (
          <div className="alert alert-success py-2" role="status">
            {msg}
          </div>
        ) : null}

        {preview ? (
          <>
            <ShipFineCard
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
                onClick={handleDelete}
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
                    <span>ELIMINAR</span>
                  </>
                )}
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
    </Layout>
  );
}
