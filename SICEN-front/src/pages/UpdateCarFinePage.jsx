import { useState } from "react";
import { Link } from "react-router-dom";
import { carFineForUpdate, carFineUpdate } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import { FINE_ARTICLE_OPTIONS } from "../constants/fineArticles.js";

function mapFine(cf) {
  if (!cf) return {};
  return {
    fine_date: cf.fine_date ?? "",
    fine_time: cf.fine_time ?? "",
    fine_article: cf.fine_article ?? "",
    fine_amount: cf.fine_amount ?? "",
    fine_extra_amount: cf.fine_extra_amount ?? "",
    fine_proves: cf.fine_proves ?? "",
    fine_status: cf.fine_status ?? "",
    car_brand: cf.car_brand ?? "",
    car_model: cf.car_model ?? "",
    car_reg_number: cf.car_reg_number ?? "",
    owner_ci: cf.owner_ci ?? "",
    owner_name: cf.owner_name ?? "",
    owner_tel: cf.owner_tel ?? "",
    owner_dir: cf.owner_dir ?? "",
  };
}

export function UpdateCarFinePage() {
  const [num, setNum] = useState("");
  const [form, setForm] = useState(null);
  const [fineNo, setFineNo] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function loadFine(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const data = await carFineForUpdate(num);
      if (!data.ok || !data.carFine) {
        setForm(null);
        setErr(data.msg || "No encontrada");
        return;
      }
      setFineNo(data.carFine.fine_number);
      setForm(mapFine(data.carFine));
    } catch (ex) {
      setForm(null);
      setErr(ex.message);
    }
  }

  async function save(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const data = await carFineUpdate(fineNo, {
        ...form,
        fine_amount: Number(form.fine_amount),
        fine_extra_amount: form.fine_extra_amount
          ? Number(form.fine_extra_amount)
          : 0,
      });
      setMsg(data.msg || "Actualizado");
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <Layout>
      <div className="container-lg py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Modificar multa</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/multas/vehiculos">
            Volver
          </Link>
        </div>

        <div className="card shadow-sm mb-3">
          <div className="card-body p-4">
            <form onSubmit={loadFine} className="row g-2 align-items-end">
              <div className="col-12 col-sm-6 col-md-4">
                <label className="form-label">N° multa</label>
                <input
                  className="form-control"
                  type="number"
                  value={num}
                  onChange={(e) => setNum(e.target.value)}
                  required
                />
              </div>
              <div className="col-12 col-sm-auto">
                <button type="submit" className="btn btn-primary">
                  Buscar
                </button>
              </div>
            </form>
          </div>
        </div>

        {err ? <div className="alert alert-danger py-2">{err}</div> : null}
        {msg ? <div className="alert alert-success py-2">{msg}</div> : null}

        {form ? (
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <form onSubmit={save} className="row g-3">
                <div className="col-12 col-md-4">
                  <label className="form-label">Fecha</label>
                  <input
                    className="form-control"
                    type="date"
                    value={form.fine_date}
                    onChange={(e) => set("fine_date", e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label">Hora</label>
                  <input
                    className="form-control"
                    type="time"
                    value={form.fine_time}
                    onChange={(e) => set("fine_time", e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label">Artículo</label>
                  <select
                    className="form-select"
                    value={form.fine_article}
                    onChange={(e) => set("fine_article", e.target.value)}
                  >
                    {FINE_ARTICLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label">U.R.</label>
                  <input
                    className="form-control"
                    type="number"
                    value={form.fine_amount}
                    onChange={(e) => set("fine_amount", e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label">Estado</label>
                  <input
                    className="form-control"
                    value={form.fine_status}
                    onChange={(e) => set("fine_status", e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label">Matrícula</label>
                  <input
                    className="form-control"
                    value={form.car_reg_number}
                    onChange={(e) => set("car_reg_number", e.target.value)}
                  />
                </div>

                <div className="col-12 d-grid">
                  <button type="submit" className="btn btn-primary">
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
