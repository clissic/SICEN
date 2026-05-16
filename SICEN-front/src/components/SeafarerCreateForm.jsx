import { FLAG_STATE_OPTIONS } from "../constants/flagStates.js";
import {
  isNumericSeafarerDocumentType,
  normalizeSeafarerDocumentNumber,
  SEAFARER_DOCUMENT_TYPE_OPTIONS,
  SEAFARER_GENDER_OPTIONS,
} from "../constants/seafarerCreateForm.js";
import { Link } from "react-router-dom";

/**
 * Formulario de alta de gente de mar (solo datos que carga el usuario en el alta).
 * El backend completa estado general, arrays vacíos y metadata de auditoría.
 */
export function SeafarerCreateForm({
  form,
  set,
  onSubmit,
  submitting,
  msg,
  err,
}) {
  const onDocumentTypeChange = (nextType) => {
    set("documentType", nextType);
    set(
      "documentNumber",
      normalizeSeafarerDocumentNumber(nextType, form.documentNumber),
    );
  };

  const onDocumentNumberChange = (raw) => {
    set(
      "documentNumber",
      normalizeSeafarerDocumentNumber(form.documentType, raw),
    );
  };

  const numericDoc = isNumericSeafarerDocumentType(form.documentType);
  const passportDoc = form.documentType === "Pasaporte";

  return (
    <>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <h3 className="m-0">Registrar gente de mar</h3>
        <Link className="btn btn-outline-secondary btn-sm" to="/base-gente-mar">
          Gestión de gente de mar
        </Link>
      </div>
      <p className="text-muted small mb-3">
        Los datos de{" "}
        <strong>licencias</strong>, <strong>cursos</strong>,{" "}
        <strong>embarques</strong>, <strong>sanciones</strong>,{" "}
        <strong>observaciones</strong> y <strong>restricciones</strong> se cargan
        en otras secciones del sistema.
      </p>

      {msg ? <div className="alert alert-success py-2">{msg}</div> : null}
      {err ? <div className="alert alert-danger py-2">{err}</div> : null}

      <form onSubmit={onSubmit}>
        <fieldset className="border rounded-3 px-3 pt-2 pb-3 mb-4">
          <legend className="float-none w-auto px-2 fs-6 fw-semibold text-body">
            Documento
          </legend>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="sf-doc-type">
                Tipo de documento <span className="text-danger">*</span>
              </label>
              <select
                id="sf-doc-type"
                className="form-select"
                required
                value={form.documentType}
                onChange={(e) => onDocumentTypeChange(e.target.value)}
              >
                {SEAFARER_DOCUMENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value || "empty"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="sf-doc-number">
                Número de documento <span className="text-danger">*</span>
              </label>
              <input
                id="sf-doc-number"
                className="form-control"
                required
                autoComplete="off"
                inputMode={numericDoc ? "numeric" : "text"}
                pattern={numericDoc ? "[0-9]*" : undefined}
                style={passportDoc ? { textTransform: "uppercase" } : undefined}
                value={form.documentNumber}
                onChange={(e) => onDocumentNumberChange(e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="border rounded-3 px-3 pt-2 pb-3 mb-4">
          <legend className="float-none w-auto px-2 fs-6 fw-semibold text-body">
            Datos personales
          </legend>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="sf-first">
                Nombres <span className="text-danger">*</span>
              </label>
              <input
                id="sf-first"
                className="form-control"
                required
                autoComplete="given-name"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="sf-last">
                Apellidos <span className="text-danger">*</span>
              </label>
              <input
                id="sf-last"
                className="form-control"
                required
                autoComplete="family-name"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6 col-lg-4">
              <label className="form-label" htmlFor="sf-birth">
                Fecha de nacimiento <span className="text-danger">*</span>
              </label>
              <input
                id="sf-birth"
                type="date"
                className="form-control"
                required
                value={form.birthDate}
                onChange={(e) => set("birthDate", e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6 col-lg-4">
              <label className="form-label" htmlFor="sf-nationality">
                Nacionalidad <span className="text-danger">*</span>
              </label>
              <select
                id="sf-nationality"
                className="form-select"
                required
                value={form.nationality}
                onChange={(e) => set("nationality", e.target.value)}
              >
                <option value="">Seleccione país…</option>
                {FLAG_STATE_OPTIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6 col-lg-4">
              <label className="form-label" htmlFor="sf-gender">
                Género <span className="text-danger">*</span>
              </label>
              <select
                id="sf-gender"
                className="form-select"
                required
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
              >
                {SEAFARER_GENDER_OPTIONS.map((o) => (
                  <option key={o.value || "empty"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="border rounded-3 px-3 pt-2 pb-3 mb-4">
          <legend className="float-none w-auto px-2 fs-6 fw-semibold text-body">
            Aptitud náutica
          </legend>
          <div className="row g-3">
            <div className="col-12">
              <h6 className="text-body-secondary small text-uppercase mb-2">
                Libreta de embarque
              </h6>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small" htmlFor="sf-sb-num">
                Número
              </label>
              <input
                id="sf-sb-num"
                className="form-control"
                autoComplete="off"
                value={form.seamanBookNumber}
                onChange={(e) => set("seamanBookNumber", e.target.value)}
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small" htmlFor="sf-sb-exp">
                Vencimiento
              </label>
              <input
                id="sf-sb-exp"
                type="date"
                className="form-control"
                value={form.seamanBookExpiration}
                onChange={(e) => set("seamanBookExpiration", e.target.value)}
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small" htmlFor="sf-sb-st">
                Estado
              </label>
              <input
                id="sf-sb-st"
                className="form-control"
                placeholder="Ej. En trámite"
                value={form.seamanBookStatus}
                onChange={(e) => set("seamanBookStatus", e.target.value)}
              />
            </div>
            <div className="col-12 mt-2">
              <h6 className="text-body-secondary small text-uppercase mb-2">
                Carné de salud
              </h6>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small" htmlFor="sf-med-exp">
                Vencimiento
              </label>
              <input
                id="sf-med-exp"
                type="date"
                className="form-control"
                value={form.medicalExpiration}
                onChange={(e) => set("medicalExpiration", e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small" htmlFor="sf-med-st">
                Estado
              </label>
              <input
                id="sf-med-st"
                className="form-control"
                value={form.medicalStatus}
                onChange={(e) => set("medicalStatus", e.target.value)}
              />
            </div>
            <div className="col-12 mt-2">
              <h6 className="text-body-secondary small text-uppercase mb-2">
                Carné de vacunación
              </h6>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small" htmlFor="sf-vac-exp">
                Vencimiento
              </label>
              <input
                id="sf-vac-exp"
                type="date"
                className="form-control"
                value={form.vaccinationExpiration}
                onChange={(e) => set("vaccinationExpiration", e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label small" htmlFor="sf-vac-st">
                Estado
              </label>
              <input
                id="sf-vac-st"
                className="form-control"
                value={form.vaccinationStatus}
                onChange={(e) => set("vaccinationStatus", e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="border rounded-3 px-3 pt-2 pb-3 mb-4">
          <legend className="float-none w-auto px-2 fs-6 fw-semibold text-body">
            Contacto
          </legend>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="sf-phone">
                Teléfono <span className="text-danger">*</span>
              </label>
              <input
                id="sf-phone"
                type="tel"
                className="form-control"
                required
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="sf-email">
                Correo electrónico <span className="text-danger">*</span>
              </label>
              <input
                id="sf-email"
                type="email"
                className="form-control"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="sf-address">
                Domicilio
              </label>
              <textarea
                id="sf-address"
                className="form-control"
                rows={2}
                autoComplete="street-address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <div className="d-flex flex-wrap gap-2 justify-content-end">
          <Link className="btn btn-outline-secondary" to="/base-gente-mar">
            Cancelar
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? "Guardando…" : "Guardar registro"}
          </button>
        </div>
      </form>
    </>
  );
}
