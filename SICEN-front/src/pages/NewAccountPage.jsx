import { useState } from "react";
import { Link } from "react-router-dom";
import { newAccountRequest } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";

export function NewAccountPage() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    rank: "",
    email: "",
    newAccBody: "",
  });
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
      const data = await newAccountRequest(form);
      setMsg(data.msg || "Enviado");
    } catch (ex) {
      setErr(ex.message || ex.data?.msg || "Error");
    }
  }

  return (
    <Layout>
      <div className="container-md py-5">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
              <h3 className="m-0">Solicitar nueva cuenta</h3>
              <Link className="btn btn-outline-secondary btn-sm" to="/login">
                Volver al login
              </Link>
            </div>

            {msg ? <div className="alert alert-success py-2">{msg}</div> : null}
            {err ? <div className="alert alert-danger py-2">{err}</div> : null}

            <form onSubmit={onSubmit} className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Nombre</label>
                <input
                  className="form-control"
                  required
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Apellido</label>
                <input
                  className="form-control"
                  required
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Grado</label>
                <input
                  className="form-control"
                  required
                  value={form.rank}
                  onChange={(e) => set("rank", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Mensaje / motivo</label>
                <textarea
                  className="form-control"
                  rows={5}
                  required
                  value={form.newAccBody}
                  onChange={(e) => set("newAccBody", e.target.value)}
                />
              </div>
              <div className="col-12 d-grid">
                <button type="submit" className="btn btn-primary">
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
