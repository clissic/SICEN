import { useState } from "react";
import { Link } from "react-router-dom";
import { deleteSeafarer, findSeafarerByDocument } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import { SeafarerBasicDataTable } from "../components/seafarer/SeafarerBasicDataTable.jsx";
import { SeafarerDocumentSearchBar } from "../components/seafarer/SeafarerDocumentSearchBar.jsx";
import {
  formatSeafarerIdentification,
  isCcDocumentSearchType,
  normalizeSeafarerDocumentNumber,
} from "../constants/seafarerCreateForm.js";
import {
  confirmDelete,
  escapeHtml,
  notifyDeleteError,
  notifyDeleteSuccess,
} from "../utils/confirmDelete.js";
import { displaySeafarerText } from "../utils/seafarerDisplay.js";
import { scrollPageToTop } from "../utils/scrollPageToTop.js";

export function SeafarerDeletePage() {
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [ccSeries, setCcSeries] = useState("");
  const [ccNumber, setCcNumber] = useState("");
  const [seafarer, setSeafarer] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const seafarerId = seafarer?._id ? String(seafarer._id) : "";

  function onDocumentTypeChange(nextType) {
    setDocumentType(nextType);
    setDocumentNumber((n) => normalizeSeafarerDocumentNumber(nextType, n));
    if (nextType !== "CC") {
      setCcSeries("");
      setCcNumber("");
    }
  }

  async function handleSearch() {
    setSearchErr("");
    setFeedback("");
    setSeafarer(null);

    if (!String(documentType).trim()) {
      setSearchErr("Seleccione el tipo de documento.");
      scrollPageToTop();
      return;
    }
    if (isCcDocumentSearchType(documentType)) {
      if (!String(ccSeries).trim()) {
        setSearchErr("Indique la serie de la credencial cívica.");
        scrollPageToTop();
        return;
      }
      if (!String(ccNumber).trim()) {
        setSearchErr("Indique el número de la credencial cívica.");
        scrollPageToTop();
        return;
      }
    } else if (!String(documentNumber).trim()) {
      setSearchErr(
        documentType === "DNI"
          ? "Indique el DNI."
          : "Indique el número de pasaporte.",
      );
      scrollPageToTop();
      return;
    }

    setSearching(true);
    try {
      const data = await findSeafarerByDocument(
        documentType,
        documentNumber,
        ccSeries,
        ccNumber,
      );
      setSeafarer(data?.seafarer ?? null);
      if (!data?.seafarer) {
        setSearchErr("No se encontró ningún registro con ese documento.");
      }
    } catch (e) {
      setSeafarer(null);
      setSearchErr(e.message || e.data?.msg || "Error al buscar el registro.");
      scrollPageToTop();
    } finally {
      setSearching(false);
    }
  }

  async function handleDelete() {
    if (!seafarerId) return;
    const pd = seafarer?.personalData ?? {};
    const fullName = `${displaySeafarerText(pd.firstName)} ${displaySeafarerText(pd.lastName)}`.trim();
    const idLabel = formatSeafarerIdentification(seafarer);

    const result = await confirmDelete({
      resource: "registro de gente de mar",
      summaryHtml: `
        <p class="mb-2">
          Se eliminará de forma permanente el registro de gente de mar:
        </p>
        <ul class="mb-2 ps-3">
          <li><strong>${escapeHtml(fullName || "—")}</strong></li>
          <li class="text-muted small">${escapeHtml(idLabel)}</li>
        </ul>
      `,
      extraNote:
        "También se borrarán títulos, licencias, cursos, sanciones y observaciones asociadas.",
    });
    if (!result.isConfirmed) return;

    setDeleting(true);
    try {
      const data = await deleteSeafarer(seafarerId);
      setSeafarer(null);
      setDocumentType("");
      setDocumentNumber("");
      setCcSeries("");
      setCcNumber("");
      setFeedback(
        data?.msg || "Registro de gente de mar eliminado correctamente.",
      );
      await notifyDeleteSuccess(data?.msg);
      scrollPageToTop();
    } catch (e) {
      await notifyDeleteError(
        e,
        "Ocurrió un error al eliminar el registro.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">
            Eliminar — gente de mar / nautas deportivos
          </h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/base-gente-mar">
            Gestión de gente de mar / nautas deportivos
          </Link>
        </div>

        {feedback ? (
          <div className="alert alert-success py-2">{feedback}</div>
        ) : null}

        <SeafarerDocumentSearchBar
          documentType={documentType}
          documentNumber={documentNumber}
          ccSeries={ccSeries}
          ccNumber={ccNumber}
          onDocumentTypeChange={onDocumentTypeChange}
          onDocumentNumberChange={setDocumentNumber}
          onCcSeriesChange={setCcSeries}
          onCcNumberChange={setCcNumber}
          onSearch={handleSearch}
          searching={searching}
          searchErr={searchErr}
        />

        {seafarer ? (
          <>
            <SeafarerBasicDataTable seafarer={seafarer} />

            <div className="card shadow-sm border-danger mb-4">
              <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <h6 className="text-danger mb-1">
                    <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden />
                    Eliminar registro
                  </h6>
                  <p className="text-muted small mb-0">
                    Se borrará permanentemente este registro junto con todos sus
                    títulos, licencias, cursos, sanciones y observaciones.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Eliminando…" : "Eliminar registro"}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
