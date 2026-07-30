import {
  isCcDocumentSearchType,
  normalizeSeafarerCcNumber,
  normalizeSeafarerCcSeries,
  normalizeSeafarerDni,
  normalizeSeafarerDocumentNumber,
  normalizeSeafarerPassport,
  SEAFARER_DOCUMENT_SEARCH_OPTIONS,
} from "../../constants/seafarerCreateForm.js";
import { ErrorAlert } from "../ErrorAlert.jsx";

export function SeafarerDocumentSearchBar({
  documentType,
  documentNumber,
  ccSeries,
  ccNumber,
  onDocumentTypeChange,
  onDocumentNumberChange,
  onCcSeriesChange,
  onCcNumberChange,
  onSearch,
  searching,
  searchErr,
}) {
  const isCc = isCcDocumentSearchType(documentType);
  const isPassport = documentType === "Pasaporte";

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-body">
        <h5 className="card-title mb-3">Buscar por documento</h5>
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="sf-search-doc-type">
              Tipo de documento
            </label>
            <select
              id="sf-search-doc-type"
              className="form-select"
              value={documentType}
              onChange={(e) => onDocumentTypeChange(e.target.value)}
            >
              {SEAFARER_DOCUMENT_SEARCH_OPTIONS.map((o) => (
                <option key={o.value || "empty"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {isCc ? (
            <>
              <div className="col-12 col-md-3">
                <label className="form-label" htmlFor="sf-search-cc-series">
                  CC — Serie
                </label>
                <input
                  id="sf-search-cc-series"
                  className="form-control"
                  autoComplete="off"
                  style={{ textTransform: "uppercase" }}
                  value={ccSeries}
                  onChange={(e) =>
                    onCcSeriesChange(normalizeSeafarerCcSeries(e.target.value))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onSearch();
                    }
                  }}
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label" htmlFor="sf-search-cc-number">
                  CC — Número
                </label>
                <input
                  id="sf-search-cc-number"
                  className="form-control"
                  autoComplete="off"
                  inputMode="numeric"
                  value={ccNumber}
                  onChange={(e) =>
                    onCcNumberChange(normalizeSeafarerCcNumber(e.target.value))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onSearch();
                    }
                  }}
                />
              </div>
            </>
          ) : (
            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="sf-search-doc-number">
                {documentType === "DNI" ? "DNI" : "Número de pasaporte"}
              </label>
              <input
                id="sf-search-doc-number"
                className="form-control"
                autoComplete="off"
                inputMode={documentType === "DNI" ? "numeric" : "text"}
                style={isPassport ? { textTransform: "uppercase" } : undefined}
                value={documentNumber}
                onChange={(e) => {
                  const raw = e.target.value;
                  const next =
                    documentType === "DNI"
                      ? normalizeSeafarerDni(raw)
                      : documentType === "Pasaporte"
                        ? normalizeSeafarerPassport(raw)
                        : normalizeSeafarerDocumentNumber(documentType, raw);
                  onDocumentNumberChange(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSearch();
                  }
                }}
              />
            </div>
          )}
          <div className="col-12 col-md-2">
            <button
              type="button"
              className="btn btn-primary w-100"
              disabled={searching}
              onClick={onSearch}
            >
              {searching ? "Buscando…" : "Buscar"}
            </button>
          </div>
        </div>
        {searchErr ? (
          <ErrorAlert message={searchErr} className="alert alert-danger py-2 mt-3 mb-0" />
        ) : null}
      </div>
    </div>
  );
}

