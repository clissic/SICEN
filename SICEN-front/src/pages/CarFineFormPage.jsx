import { useState } from "react";
import { Link } from "react-router-dom";
import { carFineCreateAndRender } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import { FINE_ARTICLE_OPTIONS } from "../constants/fineArticles.js";
import { preventNegativeNumberKeys } from "../utils/nonNegativeNumberInput.js";

const initial = {
  fine_date: "",
  fine_time: "",
  fine_article: "",
  fine_amount: "",
  fine_extra_amount: "",
  fine_proves: "",
  car_brand: "",
  car_model: "",
  car_reg_number: "",
  owner_ci: "",
  owner_name: "",
  owner_tel: "",
  owner_dir: "",
};

export function CarFineFormPage() {
  const [form, setForm] = useState(initial);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const data = await carFineCreateAndRender({
        ...form,
        fine_amount: Number(form.fine_amount),
        fine_extra_amount: form.fine_extra_amount
          ? Number(form.fine_extra_amount)
          : 0,
      });
      setMsg(data.msg || "Multa creada");
      setForm(initial);
    } catch (ex) {
      setErr(ex.message || "Error al crear");
    }
  }

  return (
    <Layout>
      <div className="container-lg py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Cargar nueva multa (vehículo terrestre)</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/multas/vehiculos">
            Volver
          </Link>
        </div>

        {msg ? <div className="alert alert-success py-2">{msg}</div> : null}
        {err ? <div className="alert alert-danger py-2">{err}</div> : null}

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
                  {FINE_ARTICLE_OPTIONS.map((o) => (
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
                <label className="form-label" htmlFor="fine_proves">
                  Pruebas*
                </label>
                <input
                  className="form-control"
                  type="text"
                  id="fine_proves"
                  required
                  value={form.fine_proves}
                  onChange={(e) => set("fine_proves", e.target.value)}
                />
              </div>

              <div className="col-12 mt-2">
                <h6 className="text-muted mb-0">Datos del vehículo</h6>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="car_brand">
                  Marca*
                </label>
                <input
                  className="form-control"
                  id="car_brand"
                  required
                  value={form.car_brand}
                  onChange={(e) => set("car_brand", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="car_model">
                  Modelo*
                </label>
                <input
                  className="form-control"
                  id="car_model"
                  required
                  value={form.car_model}
                  onChange={(e) => set("car_model", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="car_reg_number">
                  Matrícula*
                </label>
                <input
                  className="form-control"
                  id="car_reg_number"
                  required
                  value={form.car_reg_number}
                  onChange={(e) => set("car_reg_number", e.target.value)}
                />
              </div>

              <div className="col-12 mt-2">
                <h6 className="text-muted mb-0">Datos del propietario</h6>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="owner_ci">
                  C.I. / Pasaporte
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
                <button type="submit" className="btn btn-primary">
                  Crear multa
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
