import { useEffect, useMemo, useState } from "react";
import { ErrorAlert } from "../ErrorAlert.jsx";
import { FLAG_STATE_OPTIONS } from "../../constants/flagStates.js";
import {
  INITIAL_SEAFARER_CREATE_FORM,
  normalizeSeafarerCcNumber,
  normalizeSeafarerCcSeries,
  normalizeSeafarerDni,
  normalizeSeafarerPassport,
  seafarerCreateFormToPayload,
  seafarerToCreateForm,
  SEAFARER_BLOOD_GROUP_OPTIONS,
  SEAFARER_BLOOD_RH_OPTIONS,
  SEAFARER_EYE_COLOR_OPTIONS,
  SEAFARER_GENDER_OPTIONS,
  SEAFARER_HAIR_COLOR_MULTICOLOR,
  SEAFARER_HAIR_COLOR_OPTIONS,
  SEAFARER_HAIR_COLORATION_OPTIONS,
  SEAFARER_SKIN_COLOR_OPTIONS,
} from "../../constants/seafarerCreateForm.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GENERAL_STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "disqualified", label: "Inhabilitado" },
  { value: "deceased", label: "Fallecido" },
];

function generalStatusToOption(gs) {
  if (!gs || typeof gs !== "object") return "active";
  if (gs.deceased) return "deceased";
  if (gs.disqualified) return "disqualified";
  return "active";
}

function generalStatusFromOption(opt) {
  return {
    active: opt === "active",
    disqualified: opt === "disqualified",
    deceased: opt === "deceased",
  };
}

function validateClient(form) {
  if (!String(form.dni ?? "").trim()) return "Indique el DNI.";
  if (!String(form.ccSeries ?? "").trim()) {
    return "Indique la serie de la credencial cívica.";
  }
  if (!String(form.ccNumber ?? "").trim()) {
    return "Indique el número de la credencial cívica.";
  }
  if (!String(form.firstName ?? "").trim()) return "Indique los nombres.";
  if (!String(form.lastName ?? "").trim()) return "Indique los apellidos.";
  if (!String(form.birthDate ?? "").trim()) {
    return "Indique la fecha de nacimiento.";
  }
  if (!String(form.nationality ?? "").trim()) {
    return "Seleccione la nacionalidad.";
  }
  if (!String(form.gender ?? "").trim()) return "Seleccione el género.";
  if (!String(form.bloodGroup ?? "").trim()) {
    return "Seleccione el grupo sanguíneo.";
  }
  if (!String(form.bloodRh ?? "").trim()) return "Seleccione el factor Rh.";
  const heightRaw = String(form.heightCm ?? "").trim();
  if (heightRaw) {
    const h = Number(heightRaw);
    if (!Number.isFinite(h) || h <= 0) {
      return "La altura debe ser un número mayor que cero (en centímetros).";
    }
  }
  if (!String(form.phone ?? "").trim()) return "Indique el teléfono.";
  if (!String(form.email ?? "").trim()) {
    return "Indique el correo electrónico.";
  }
  if (!EMAIL_RE.test(String(form.email).trim())) {
    return "El correo electrónico no es válido.";
  }
  return "";
}

/**
 * Modal centrado para modificar los datos básicos de un seafarer.
 * Reusa el mismo shape de form que el SeafarerCreateForm.
 */
export function SeafarerBasicDataEditModal({
  open,
  seafarer,
  onClose,
  onSave,
  saving,
  saveErr,
}) {
  const initialForm = useMemo(
    () => (seafarer ? seafarerToCreateForm(seafarer) : { ...INITIAL_SEAFARER_CREATE_FORM }),
    [seafarer]
  );
  const initialStatus = useMemo(
    () => generalStatusToOption(seafarer?.generalStatus),
    [seafarer]
  );

  const [form, setForm] = useState(initialForm);
  const [generalStatus, setGeneralStatus] = useState(initialStatus);
  const [clientErr, setClientErr] = useState("");

  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setGeneralStatus(initialStatus);
      setClientErr("");
    }
  }, [open, initialForm, initialStatus]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, saving]);

  if (!open) return null;

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setClientErr("");
    const msg = validateClient(form);
    if (msg) {
      setClientErr(msg);
      return;
    }
    const payload = seafarerCreateFormToPayload(form);
    payload.generalStatus = generalStatusFromOption(generalStatus);
    await onSave?.(payload);
  }

  return (
    <>
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1080 }}
        aria-hidden
      />
      <div
        className="modal fade show d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seafarer-basic-edit-title"
        style={{ zIndex: 1085, overflowY: "auto" }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !saving) onClose?.();
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-xl">
          <form
            className="modal-content position-relative"
            onSubmit={handleSubmit}
          >
            <div className="modal-header">
              <h5 className="modal-title" id="seafarer-basic-edit-title">
                Modificar datos del registro
              </h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                disabled={saving}
                onClick={onClose}
              />
            </div>

            <div className="modal-body">
                <ErrorAlert message={clientErr || saveErr} />

                <fieldset className="border rounded-3 px-3 pt-2 pb-3 mb-3">
                  <legend className="float-none w-auto px-2 fs-6 fw-semibold text-body">
                    Documentos de identificación
                  </legend>
                  <div className="row g-3">
                    <div className="col-12 col-md-6 col-lg-4">
                      <label className="form-label" htmlFor="sf-edit-dni">
                        DNI <span className="text-danger">*</span>
                      </label>
                      <input
                        id="sf-edit-dni"
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
                      <label className="form-label" htmlFor="sf-edit-passport">
                        Pasaporte
                      </label>
                      <input
                        id="sf-edit-passport"
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
                      <label className="form-label" htmlFor="sf-edit-cc-series">
                        CC — Serie <span className="text-danger">*</span>
                      </label>
                      <input
                        id="sf-edit-cc-series"
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
                      <label className="form-label" htmlFor="sf-edit-cc-number">
                        CC — Número <span className="text-danger">*</span>
                      </label>
                      <input
                        id="sf-edit-cc-number"
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

                <fieldset className="border rounded-3 px-3 pt-2 pb-3 mb-3">
                  <legend className="float-none w-auto px-2 fs-6 fw-semibold text-body">
                    Datos personales
                  </legend>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label" htmlFor="sf-edit-first">
                        Nombres <span className="text-danger">*</span>
                      </label>
                      <input
                        id="sf-edit-first"
                        className="form-control"
                        required
                        autoComplete="given-name"
                        value={form.firstName}
                        onChange={(e) => set("firstName", e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label" htmlFor="sf-edit-last">
                        Apellidos <span className="text-danger">*</span>
                      </label>
                      <input
                        id="sf-edit-last"
                        className="form-control"
                        required
                        autoComplete="family-name"
                        value={form.lastName}
                        onChange={(e) => set("lastName", e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-6 col-lg-4">
                      <label className="form-label" htmlFor="sf-edit-birth">
                        Fecha de nacimiento <span className="text-danger">*</span>
                      </label>
                      <input
                        id="sf-edit-birth"
                        type="date"
                        className="form-control"
                        required
                        value={form.birthDate}
                        onChange={(e) => set("birthDate", e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-6 col-lg-4">
                      <label className="form-label" htmlFor="sf-edit-nationality">
                        Nacionalidad <span className="text-danger">*</span>
                      </label>
                      <select
                        id="sf-edit-nationality"
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
                      <label className="form-label" htmlFor="sf-edit-gender">
                        Género <span className="text-danger">*</span>
                      </label>
                      <select
                        id="sf-edit-gender"
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
                      <label className="form-label" htmlFor="sf-edit-blood-group">
                        Grupo sanguíneo <span className="text-danger">*</span>
                      </label>
                      <select
                        id="sf-edit-blood-group"
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
                      <label className="form-label" htmlFor="sf-edit-blood-rh">
                        Factor Rh <span className="text-danger">*</span>
                      </label>
                      <select
                        id="sf-edit-blood-rh"
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
                    <div className="col-12 col-md-6 col-lg-6">
                      <label className="form-label" htmlFor="sf-edit-status">
                        Estado general
                      </label>
                      <select
                        id="sf-edit-status"
                        className="form-select"
                        value={generalStatus}
                        onChange={(e) => setGeneralStatus(e.target.value)}
                      >
                        {GENERAL_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </fieldset>

                <fieldset className="border rounded-3 px-3 pt-2 pb-3 mb-3">
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
                            <label className="form-label" htmlFor="sf-edit-hair">
                              Color de cabello
                            </label>
                            <select
                              id="sf-edit-hair"
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
                              <label
                                className="form-label"
                                htmlFor="sf-edit-hair-detail"
                              >
                                Detalle (multicolor)
                              </label>
                              <input
                                id="sf-edit-hair-detail"
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
                            <label
                              className="form-label"
                              htmlFor="sf-edit-hair-coloration"
                            >
                              Coloración del cabello
                            </label>
                            <select
                              id="sf-edit-hair-coloration"
                              className="form-select"
                              value={form.hairColoration}
                              onChange={(e) =>
                                set("hairColoration", e.target.value)
                              }
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
                      <label className="form-label" htmlFor="sf-edit-eyes">
                        Color de ojos
                      </label>
                      <select
                        id="sf-edit-eyes"
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
                      <label className="form-label" htmlFor="sf-edit-skin">
                        Color de cutis
                      </label>
                      <select
                        id="sf-edit-skin"
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
                      <label className="form-label" htmlFor="sf-edit-height">
                        Altura (cm)
                      </label>
                      <input
                        id="sf-edit-height"
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

                <fieldset className="border rounded-3 px-3 pt-2 pb-3 mb-3">
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
                      <label className="form-label small" htmlFor="sf-edit-med-exp">
                        Vencimiento
                      </label>
                      <input
                        id="sf-edit-med-exp"
                        type="date"
                        className="form-control"
                        value={form.medicalExpiration}
                        onChange={(e) => set("medicalExpiration", e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small" htmlFor="sf-edit-med-st">
                        Estado
                      </label>
                      <input
                        id="sf-edit-med-st"
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
                      <label className="form-label small" htmlFor="sf-edit-vac-exp">
                        Vencimiento
                      </label>
                      <input
                        id="sf-edit-vac-exp"
                        type="date"
                        className="form-control"
                        value={form.vaccinationExpiration}
                        onChange={(e) =>
                          set("vaccinationExpiration", e.target.value)
                        }
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small" htmlFor="sf-edit-vac-st">
                        Estado
                      </label>
                      <input
                        id="sf-edit-vac-st"
                        className="form-control"
                        value={form.vaccinationStatus}
                        onChange={(e) => set("vaccinationStatus", e.target.value)}
                      />
                    </div>
                  </div>
                </fieldset>

                <fieldset className="border rounded-3 px-3 pt-2 pb-3">
                  <legend className="float-none w-auto px-2 fs-6 fw-semibold text-body">
                    Contacto
                  </legend>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label" htmlFor="sf-edit-phone">
                        Teléfono <span className="text-danger">*</span>
                      </label>
                      <input
                        id="sf-edit-phone"
                        type="tel"
                        className="form-control"
                        required
                        autoComplete="tel"
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label" htmlFor="sf-edit-email">
                        Correo electrónico <span className="text-danger">*</span>
                      </label>
                      <input
                        id="sf-edit-email"
                        type="email"
                        className="form-control"
                        required
                        autoComplete="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="sf-edit-address">
                        Domicilio
                      </label>
                      <textarea
                        id="sf-edit-address"
                        className="form-control"
                        rows={2}
                        autoComplete="street-address"
                        value={form.address}
                        onChange={(e) => set("address", e.target.value)}
                      />
                    </div>
                  </div>
                </fieldset>
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
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
