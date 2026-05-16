import {
  isNumericSeafarerDocumentType,
  normalizeSeafarerDocumentNumber,
  SEAFARER_DOCUMENT_TYPE_OPTIONS,
} from "../../constants/seafarerCreateForm.js";

export function SeafarerDocumentSearchBar({
  documentType,
  documentNumber,
  onDocumentTypeChange,
  onDocumentNumberChange,
  onSearch,
  searching,
  searchErr,
}) {
  const numericDoc = isNumericSeafarerDocumentType(documentType);
  const passportDoc = documentType === "Pasaporte";

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
              {SEAFARER_DOCUMENT_TYPE_OPTIONS.map((o) => (
                <option key={o.value || "empty"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="sf-search-doc-number">
              Número de documento
            </label>
            <input
              id="sf-search-doc-number"
              className="form-control"
              autoComplete="off"
              inputMode={numericDoc ? "numeric" : "text"}
              pattern={numericDoc ? "[0-9]*" : undefined}
              style={passportDoc ? { textTransform: "uppercase" } : undefined}
              value={documentNumber}
              onChange={(e) =>
                onDocumentNumberChange(
                  normalizeSeafarerDocumentNumber(
                    documentType,
                    e.target.value,
                  ),
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSearch();
                }
              }}
            />
          </div>
          <div className="col-12 col-md-4">
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
          <div className="alert alert-danger py-2 mt-3 mb-0">{searchErr}</div>
        ) : null}
      </div>
    </div>
  );
}
