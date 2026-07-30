import { useState } from "react";
import { Link } from "react-router-dom";
import { personalFineCreateAndRender } from "../api/client.js";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";
import { PERSONAL_FINE_ARTICLE_OPTIONS } from "../constants/fineArticles.js";
import { preventNegativeNumberKeys } from "../utils/nonNegativeNumberInput.js";
import { scrollElementIntoViewById } from "../utils/scrollPageToTop.js";

const SEX_OPTIONS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
  { value: "X", label: "Otro / No especifica" },
];

const initial = {
  fine_date: "",
  fine_time: "",
  fine_article: "",
  fine_amount: "",
  fine_extra_amount: "",
  person_ci: "",
  person_first_name: "",
  person_last_name: "",
  person_nationality: "Uruguaya",
  person_birth_date: "",
  person_sex: "",
  person_tel: "",
  person_dir: "",
};

const PROVE_MAX_BYTES = 5 * 1024 * 1024;
const PROVE_SLOTS = [0, 1, 2];

function isValidProveFile(f) {
  if (!f) return true;
  const name = (f.name || "").toLowerCase();
  const okExt = name.endsWith(".jpg") || name.endsWith(".jpeg");
  const okMime = f.type === "image/jpeg" || f.type === "image/pjpeg";
  if (!okExt || !okMime) {
    return "Solo se aceptan archivos JPEG (.jpg / .jpeg).";
  }
  if (f.size > PROVE_MAX_BYTES) {
    return "Cada foto debe pesar 5 MB o menos.";
  }
  return true;
}

const today = new Date().toISOString().slice(0, 10);

export function PersonalFineFormPage() {
  const [form, setForm] = useState(initial);
  const [proves, setProves] = useState([null, null, null]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setProveAt(idx, file) {
    if (file) {
      const check = isValidProveFile(file);
      if (check !== true) {
        setErr(`Prueba ${idx + 1}: ${check}`);
        return;
      }
    }
    setErr("");
    setProves((prev) => {
      const next = [...prev];
      next[idx] = file ?? null;
      return next;
    });
  }

  function resetForm() {
    setForm(initial);
    setProves([null, null, null]);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");

    const ci = form.person_ci.replace(/[^\d]/g, "");
    if (ci.length < 6 || ci.length > 9) {
      setErr("El DNI debe contener entre 6 y 9 dígitos.");
      scrollElementIntoViewById("personal-fine-form-feedback");
      return;
    }
    if (
      !form.person_first_name.trim() ||
      !form.person_last_name.trim() ||
      !form.person_nationality.trim() ||
      !form.person_birth_date ||
      !form.person_sex
    ) {
      setErr(
        "Nombre, apellido, nacionalidad, fecha de nacimiento y sexo son obligatorios."
      );
      scrollElementIntoViewById("personal-fine-form-feedback");
      return;
    }

    const files = proves.filter(Boolean);
    if (files.length === 0) {
      setErr("Adjunte al menos una foto de prueba (.jpg, hasta 5 MB).");
      scrollElementIntoViewById("personal-fine-form-feedback");
      return;
    }
    for (let i = 0; i < proves.length; i++) {
      if (proves[i]) {
        const check = isValidProveFile(proves[i]);
        if (check !== true) {
          setErr(`Prueba ${i + 1}: ${check}`);
          scrollElementIntoViewById("personal-fine-form-feedback");
          return;
        }
      }
    }
    setSubmitting(true);
    try {
      const data = await personalFineCreateAndRender(
        {
          ...form,
          person_ci: ci,
          fine_amount: Number(form.fine_amount),
          fine_extra_amount: form.fine_extra_amount
            ? Number(form.fine_extra_amount)
            : 0,
        },
        files
      );
      setMsg(data.msg || "Multa creada");
      resetForm();
    } catch (ex) {
      setErr(ex.message || "Error al crear");
    } finally {
      setSubmitting(false);
      scrollElementIntoViewById("personal-fine-form-feedback");
    }
  }

  return (
    <Layout>
      <div className="container-lg py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Cargar nueva multa (persona)</h3>
          <Link
            className="btn btn-outline-secondary btn-sm"
            to="/multas/personales"
          >
            Volver
          </Link>
        </div>

        <div
          id="personal-fine-form-feedback"
          style={{ scrollMarginTop: "1rem" }}
        >
          {msg ? <div className="alert alert-success py-2">{msg}</div> : null}
          <ErrorAlert message={err} />
        </div>

        <div className="card shadow-sm">
          <div className="card-body p-4">
            <form onSubmit={onSubmit} className="row g-3">
              <div className="col-12">
                <h6 className="text-muted mb-0">Datos de la multa</h6>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="pf_fine_date">
                  Fecha*
                </label>
                <input
                  className="form-control"
                  type="date"
                  id="pf_fine_date"
                  required
                  value={form.fine_date}
                  onChange={(e) => set("fine_date", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="pf_fine_time">
                  Hora*
                </label>
                <input
                  className="form-control"
                  type="time"
                  id="pf_fine_time"
                  required
                  value={form.fine_time}
                  onChange={(e) => set("fine_time", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="pf_fine_article">
                  N° Artículo*
                </label>
                <select
                  className="form-select"
                  id="pf_fine_article"
                  required
                  value={form.fine_article}
                  onChange={(e) => set("fine_article", e.target.value)}
                >
                  <option value="" disabled>
                    Seleccionar artículo…
                  </option>
                  {PERSONAL_FINE_ARTICLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <a
                  className="small text-decoration-none"
                  target="_blank"
                  rel="noreferrer"
                  href="https://www.impo.com.uy/bases/decretos-reglamento/100-1991"
                >
                  Consultar el Decreto 100/91
                </a>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="pf_fine_amount">
                  Cantidad U.R.*
                </label>
                <input
                  className="form-control"
                  type="number"
                  id="pf_fine_amount"
                  required
                  min={0}
                  step="any"
                  onKeyDown={preventNegativeNumberKeys}
                  value={form.fine_amount}
                  onChange={(e) => set("fine_amount", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="pf_fine_extra_amount">
                  Cantidad extra U.R.
                </label>
                <input
                  className="form-control"
                  type="number"
                  id="pf_fine_extra_amount"
                  min={0}
                  step="any"
                  onKeyDown={preventNegativeNumberKeys}
                  value={form.fine_extra_amount}
                  onChange={(e) => set("fine_extra_amount", e.target.value)}
                />
              </div>

              <div className="col-12">
                <label className="form-label d-block">Pruebas*</label>
                <div className="text-muted small mb-2">
                  Adjunte hasta 3 fotografías como evidencia. Formato JPG,
                  máximo 5 MB por archivo.
                </div>
                <div className="row g-2">
                  {PROVE_SLOTS.map((idx) => {
                    const inputId = `pf_fine_proves_${idx + 1}`;
                    const file = proves[idx];
                    return (
                      <div className="col-12 col-md-4" key={inputId}>
                        <label
                          className="form-label small text-muted mb-1"
                          htmlFor={inputId}
                        >
                          Prueba {idx + 1}
                          {idx === 0 ? "*" : ""}
                        </label>
                        <input
                          className="form-control"
                          type="file"
                          id={inputId}
                          accept="image/jpeg,.jpg,.jpeg"
                          required={idx === 0 && !file}
                          onChange={(e) =>
                            setProveAt(idx, e.target.files?.[0] ?? null)
                          }
                        />
                        {file ? (
                          <div className="d-flex align-items-center justify-content-between mt-1">
                            <small className="text-muted text-truncate me-2">
                              {file.name} ·{" "}
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </small>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm py-0 px-2"
                              onClick={() => setProveAt(idx, null)}
                              aria-label={`Quitar prueba ${idx + 1}`}
                            >
                              Quitar
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="col-12 mt-2">
                <h6 className="text-muted mb-0">Datos de la persona</h6>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="pf_person_ci">
                  DNI*
                </label>
                <input
                  className="form-control"
                  id="pf_person_ci"
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.person_ci}
                  onChange={(e) =>
                    set("person_ci", e.target.value.replace(/[^\d]/g, ""))
                  }
                />
                <div className="form-text">
                  Solo dígitos (sin puntos ni guion).
                </div>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="pf_person_first_name">
                  Nombre*
                </label>
                <input
                  className="form-control"
                  id="pf_person_first_name"
                  required
                  value={form.person_first_name}
                  onChange={(e) => set("person_first_name", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="pf_person_last_name">
                  Apellido*
                </label>
                <input
                  className="form-control"
                  id="pf_person_last_name"
                  required
                  value={form.person_last_name}
                  onChange={(e) => set("person_last_name", e.target.value)}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="pf_person_nationality">
                  Nacionalidad*
                </label>
                <input
                  className="form-control"
                  id="pf_person_nationality"
                  required
                  value={form.person_nationality}
                  onChange={(e) => set("person_nationality", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="pf_person_birth_date">
                  Fecha de nacimiento*
                </label>
                <input
                  className="form-control"
                  type="date"
                  id="pf_person_birth_date"
                  required
                  max={today}
                  value={form.person_birth_date}
                  onChange={(e) => set("person_birth_date", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="pf_person_sex">
                  Sexo*
                </label>
                <select
                  className="form-select"
                  id="pf_person_sex"
                  required
                  value={form.person_sex}
                  onChange={(e) => set("person_sex", e.target.value)}
                >
                  <option value="" disabled>
                    Seleccionar…
                  </option>
                  {SEX_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="pf_person_tel">
                  Teléfono
                </label>
                <input
                  className="form-control"
                  type="tel"
                  id="pf_person_tel"
                  value={form.person_tel}
                  onChange={(e) => set("person_tel", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="pf_person_dir">
                  Dirección
                </label>
                <input
                  className="form-control"
                  id="pf_person_dir"
                  value={form.person_dir}
                  onChange={(e) => set("person_dir", e.target.value)}
                />
              </div>

              <div className="col-12 d-grid mt-2">
                <button
                  type="submit"
                  className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2"
                  disabled={submitting}
                  aria-busy={submitting}
                >
                  {submitting ? (
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
                      <span>Creando…</span>
                    </>
                  ) : (
                    "Crear multa"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
