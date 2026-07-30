import { useState } from "react";
import { Link } from "react-router-dom";
import { shipFineCreateAndRender } from "../api/client.js";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";
import { SHIP_FINE_ARTICLE_OPTIONS } from "../constants/fineArticles.js";
import { FLAG_STATE_OPTIONS } from "../constants/flagStates.js";
import { preventNegativeNumberKeys } from "../utils/nonNegativeNumberInput.js";
import { scrollElementIntoViewById } from "../utils/scrollPageToTop.js";

const initial = {
  fine_date: "",
  fine_time: "",
  fine_article: "",
  fine_amount: "",
  fine_extra_amount: "",
  omi: "",
  ship_reg_number: "",
  flag: "",
  owner_ci: "",
  owner_name: "",
  owner_tel: "",
  owner_dir: "",
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

export function ShipFineFormPage() {
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

    const omiNumber = Number(form.omi);
    if (!Number.isFinite(omiNumber) || omiNumber <= 0) {
      setErr("El número OMI debe ser un valor numérico mayor a 0.");
      scrollElementIntoViewById("ship-fine-form-feedback");
      return;
    }

    const files = proves.filter(Boolean);
    if (files.length === 0) {
      setErr("Adjunte al menos una foto de prueba (.jpg, hasta 5 MB).");
      scrollElementIntoViewById("ship-fine-form-feedback");
      return;
    }
    for (let i = 0; i < proves.length; i++) {
      if (proves[i]) {
        const check = isValidProveFile(proves[i]);
        if (check !== true) {
          setErr(`Prueba ${i + 1}: ${check}`);
          scrollElementIntoViewById("ship-fine-form-feedback");
          return;
        }
      }
    }
    setSubmitting(true);
    try {
      const data = await shipFineCreateAndRender(
        {
          ...form,
          omi: omiNumber,
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
      scrollElementIntoViewById("ship-fine-form-feedback");
    }
  }

  return (
    <Layout>
      <div className="container-lg py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Cargar nueva multa (buque)</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/multas/buques">
            Volver
          </Link>
        </div>

        <div id="ship-fine-form-feedback" style={{ scrollMarginTop: "1rem" }}>
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
                <label className="form-label" htmlFor="fine_date">
                  Fecha*
                </label>
                <input
                  className="form-control"
                  type="date"
                  id="fine_date"
                  required
                  value={form.fine_date}
                  onChange={(e) => set("fine_date", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="fine_time">
                  Hora*
                </label>
                <input
                  className="form-control"
                  type="time"
                  id="fine_time"
                  required
                  value={form.fine_time}
                  onChange={(e) => set("fine_time", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="fine_article">
                  N° Artículo*
                </label>
                <select
                  className="form-select"
                  id="fine_article"
                  required
                  value={form.fine_article}
                  onChange={(e) => set("fine_article", e.target.value)}
                >
                  <option value="" disabled>
                    Seleccionar artículo…
                  </option>
                  {SHIP_FINE_ARTICLE_OPTIONS.map((o) => (
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
                <label className="form-label" htmlFor="fine_amount">
                  Cantidad U.R.*
                </label>
                <input
                  className="form-control"
                  type="number"
                  id="fine_amount"
                  required
                  min={0}
                  step="any"
                  onKeyDown={preventNegativeNumberKeys}
                  value={form.fine_amount}
                  onChange={(e) => set("fine_amount", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="fine_extra_amount">
                  Cantidad extra U.R.
                </label>
                <input
                  className="form-control"
                  type="number"
                  id="fine_extra_amount"
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
                    const inputId = `fine_proves_${idx + 1}`;
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
                <h6 className="text-muted mb-0">Datos del buque</h6>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="omi">
                  Número OMI*
                </label>
                <input
                  className="form-control"
                  type="number"
                  id="omi"
                  required
                  min={0}
                  step={1}
                  inputMode="numeric"
                  onKeyDown={(e) => {
                    preventNegativeNumberKeys(e);
                    if (e.key === ".") e.preventDefault();
                  }}
                  value={form.omi}
                  onChange={(e) =>
                    set("omi", e.target.value.replace(/[^\d]/g, ""))
                  }
                />
                <div className="form-text">Solo dígitos (sin guiones ni espacios).</div>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="ship_reg_number">
                  Matrícula del buque*
                </label>
                <input
                  className="form-control text-uppercase"
                  id="ship_reg_number"
                  required
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={form.ship_reg_number}
                  onChange={(e) =>
                    set(
                      "ship_reg_number",
                      e.target.value.replace(/\s+/g, "").toUpperCase()
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === " ") e.preventDefault();
                  }}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    if (/\s/.test(text)) {
                      e.preventDefault();
                      set(
                        "ship_reg_number",
                        text.replace(/\s+/g, "").toUpperCase()
                      );
                    }
                  }}
                  style={{ textTransform: "uppercase" }}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="flag">
                  Bandera
                </label>
                <select
                  className="form-select"
                  id="flag"
                  value={form.flag}
                  onChange={(e) => set("flag", e.target.value)}
                >
                  <option value="">Seleccione país…</option>
                  {FLAG_STATE_OPTIONS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <div className="form-text">
                  Pabellón del buque al momento de la infracción.
                </div>
              </div>

              <div className="col-12 mt-2">
                <h6 className="text-muted mb-0">Datos del propietario</h6>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="owner_ci">
                  DNI / Pasaporte
                </label>
                <input
                  className="form-control"
                  id="owner_ci"
                  value={form.owner_ci}
                  onChange={(e) => set("owner_ci", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-8">
                <label className="form-label" htmlFor="owner_name">
                  Nombre
                </label>
                <input
                  className="form-control"
                  id="owner_name"
                  value={form.owner_name}
                  onChange={(e) => set("owner_name", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="owner_tel">
                  Teléfono
                </label>
                <input
                  className="form-control"
                  type="tel"
                  id="owner_tel"
                  value={form.owner_tel}
                  onChange={(e) => set("owner_tel", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="owner_dir">
                  Dirección
                </label>
                <input
                  className="form-control"
                  id="owner_dir"
                  value={form.owner_dir}
                  onChange={(e) => set("owner_dir", e.target.value)}
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
