import { FLAG_STATE_OPTIONS } from "../constants/flagStates.js";
import {
  INITIAL_SEAFARER_CREATE_FORM,
  normalizeSeafarerCcNumber,
  normalizeSeafarerCcSeries,
  normalizeSeafarerDni,
  normalizeSeafarerPassport,
  SEAFARER_BLOOD_GROUP_OPTIONS,
  SEAFARER_BLOOD_RH_OPTIONS,
  SEAFARER_EYE_COLOR_OPTIONS,
  SEAFARER_GENDER_OPTIONS,
  SEAFARER_HAIR_COLOR_MULTICOLOR,
  SEAFARER_HAIR_COLOR_OPTIONS,
  SEAFARER_HAIR_COLORATION_OPTIONS,
  SEAFARER_SKIN_COLOR_OPTIONS,
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
  return (
    <>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <h3 className="m-0">Registrar gente de mar / nautas deportivos</h3>
        <Link className="btn btn-outline-secondary btn-sm" to="/base-gente-mar">
          Gestión de gente de mar / nautas deportivos
        </Link>
      </div>
      <p className="text-muted small mb-3">
        Los datos de <strong>licencias</strong> (incluida la libreta de embarque),{" "}
        <strong>títulos</strong>, <strong>cursos</strong>, <strong>embarques</strong>,{" "}
        <strong>sanciones</strong>, <strong>observaciones</strong> y{" "}
        <strong>restricciones</strong> se cargan en otras secciones del sistema.
      </p>

      {msg ? <div className="alert alert-success py-2">{msg}</div> : null}
      {err ? <div className="alert alert-danger py-2">{err}</div> : null}

      <form onSubmit={onSubmit}>
        <fieldset className="border rounded-3 px-3 pt-2 pb-3 mb-4">
          <legend className="float-none w-auto px-2 fs-6 fw-semibold text-body">
            Documentos de identificación
          </legend>
          <div className="row g-3">
            <div className="col-12 col-md-6 col-lg-4">
              <label className="form-label" htmlFor="sf-dni">
                DNI <span className="text-danger">*</span>
              </label>
              <input
                id="sf-dni"
                className="form-control"
                required
                autoComplete="off"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.dni}
                onChange={(e) =>
                  set("dni", normalizeSeafarerDni(e.target.value))
                }
              />
            </div>
            <div className="col-12 col-md-6 col-lg-4">
              <label className="form-label" htmlFor="sf-passport">
                Pasaporte
              </label>
              <input
                id="sf-passport"
                className="form-control"
                autoComplete="off"
                style={{ textTransform: "uppercase" }}
                value={form.passport}
                onChange={(e) =>
                  set("passport", normalizeSeafarerPassport(e.target.value))
                }
              />
            </div>
            <div className="col-12 col-md-6 col-lg-2">
              <label className="form-label" htmlFor="sf-cc-series">
                CC — Serie <span className="text-danger">*</span>
              </label>
              <input
                id="sf-cc-series"
                className="form-control"
                required
                autoComplete="off"
                style={{ textTransform: "uppercase" }}
                value={form.ccSeries}
                onChange={(e) =>
                  set("ccSeries", normalizeSeafarerCcSeries(e.target.value))
                }
              />
            </div>
            <div className="col-12 col-md-6 col-lg-2">
              <label className="form-label" htmlFor="sf-cc-number">
                CC — Número <span className="text-danger">*</span>
              </label>
              <input
                id="sf-cc-number"
                className="form-control"
                required
                autoComplete="off"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.ccNumber}
                onChange={(e) =>
                  set("ccNumber", normalizeSeafarerCcNumber(e.target.value))
                }
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
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label" htmlFor="sf-blood-group">
                Grupo sanguíneo <span className="text-danger">*</span>
              </label>
              <select
                id="sf-blood-group"
                className="form-select"
                required
                value={form.bloodGroup}
                onChange={(e) => set("bloodGroup", e.target.value)}
              >
                {SEAFARER_BLOOD_GROUP_OPTIONS.map((o) => (
                  <option key={o.value || "empty"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label" htmlFor="sf-blood-rh">
                Factor Rh <span className="text-danger">*</span>
              </label>
              <select
                id="sf-blood-rh"
                className="form-select"
                required
                value={form.bloodRh}
                onChange={(e) => set("bloodRh", e.target.value)}
              >
                {SEAFARER_BLOOD_RH_OPTIONS.map((o) => (
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
            Datos morfológicos
          </legend>
          <div className="row g-3">
            <div className="col-12">
              <div className="border rounded-3 px-3 pt-2 pb-3 bg-body-tertiary bg-opacity-25">
                <h6 className="text-body-secondary small text-uppercase mb-3">
                  Cabello
                </h6>
                <div className="row g-3">
                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label" htmlFor="sf-hair">
                      Color de cabello
                    </label>
                    <select
                      id="sf-hair"
                      className="form-select"
                      value={form.hairColor}
                      onChange={(e) => {
                        const next = e.target.value;
                        set("hairColor", next);
                        if (next !== SEAFARER_HAIR_COLOR_MULTICOLOR) {
                          set("hairColorDetail", "");
                        }
                      }}
                    >
                      {SEAFARER_HAIR_COLOR_OPTIONS.map((o) => (
                        <option key={o.value || "hair-empty"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {form.hairColor === SEAFARER_HAIR_COLOR_MULTICOLOR ? (
                    <div className="col-12 col-md-6 col-lg-4">
                      <label className="form-label" htmlFor="sf-hair-detail">
                        Detalle (multicolor)
                      </label>
                      <input
                        id="sf-hair-detail"
                        type="text"
                        className="form-control"
                        placeholder="Ej. mechas rubias y base castaña"
                        value={form.hairColorDetail}
                        onChange={(e) =>
                          set("hairColorDetail", e.target.value)
                        }
                      />
                    </div>
                  ) : null}
                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label" htmlFor="sf-hair-coloration">
                      Coloración del cabello
                    </label>
                    <select
                      id="sf-hair-coloration"
                      className="form-select"
                      value={form.hairColoration}
                      onChange={(e) => set("hairColoration", e.target.value)}
                    >
                      {SEAFARER_HAIR_COLORATION_OPTIONS.map((o) => (
                        <option
                          key={o.value || "coloration-empty"}
                          value={o.value}
                        >
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label" htmlFor="sf-eyes">
                Color de ojos
              </label>
              <select
                id="sf-eyes"
                className="form-select"
                value={form.eyeColor}
                onChange={(e) => set("eyeColor", e.target.value)}
              >
                {SEAFARER_EYE_COLOR_OPTIONS.map((o) => (
                  <option key={o.value || "eye-empty"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label" htmlFor="sf-skin">
                Color de cutis
              </label>
              <select
                id="sf-skin"
                className="form-select"
                value={form.skinColor}
                onChange={(e) => set("skinColor", e.target.value)}
              >
                {SEAFARER_SKIN_COLOR_OPTIONS.map((o) => (
                  <option key={o.value || "skin-empty"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label" htmlFor="sf-height">
                Altura (cm)
              </label>
              <input
                id="sf-height"
                type="number"
                className="form-control"
                min={1}
                max={300}
                step={1}
                value={form.heightCm}
                onChange={(e) => set("heightCm", e.target.value)}
              />
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
