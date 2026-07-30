import { useState } from "react";
import { Link } from "react-router-dom";
import { newAccountRequest } from "../api/client.js";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";
import { UserUnitSelect } from "../components/UserUnitSelect.jsx";
import { RANK_OPTIONS } from "../constants/ranks.js";

export function NewAccountPage() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    rank: "",
    unit: "",
    position: "",
    email: "",
    newAccBody: "",
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setSubmitting(true);
    try {
      const data = await newAccountRequest(form);
      setMsg(data.msg || "Enviado");
    } catch (ex) {
      setErr(ex.message || ex.data?.msg || "Error");
    } finally {
      setSubmitting(false);
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
            <ErrorAlert message={err} />

            <form onSubmit={onSubmit} className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="new-acc-first-name">
                  Nombre
                </label>
                <input
                  id="new-acc-first-name"
                  className="form-control"
                  required
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="new-acc-last-name">
                  Apellido
                </label>
                <input
                  id="new-acc-last-name"
                  className="form-control"
                  required
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="new-acc-rank">
                  Grado
                </label>
                <select
                  id="new-acc-rank"
                  className="form-select"
                  required
                  value={form.rank}
                  onChange={(e) => set("rank", e.target.value)}
                  aria-label="Grado"
                >
                  <option value="">Seleccionar grado…</option>
                  {RANK_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="new-acc-unit">
                  Unidad
                </label>
                <UserUnitSelect
                  id="new-acc-unit"
                  value={form.unit}
                  onChange={(v) => set("unit", v)}
                  required
                  usePublicEndpoint
                  extraOptions={[
                    {
                      value: "OTRA",
                      label: "Otra — Aclarar en el cuerpo del mensaje",
                    },
                  ]}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="new-acc-position">
                  Cargo que desempeña
                </label>
                <input
                  id="new-acc-position"
                  className="form-control"
                  required
                  value={form.position}
                  onChange={(e) => set("position", e.target.value)}
                  placeholder="Ej.: Jefe de Unidad, Jefe de División, Radio Operador, etc."
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="new-acc-email">
                  Email
                </label>
                <input
                  id="new-acc-email"
                  className="form-control"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="Debe ser un email Armada (Ej. napellido@armada.mil.uy)"
                />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="new-acc-body">
                  Mensaje / motivo
                </label>
                <textarea
                  id="new-acc-body"
                  className="form-control"
                  rows={5}
                  required
                  value={form.newAccBody}
                  onChange={(e) => set("newAccBody", e.target.value)}
                />
              </div>
              <div className="col-12 d-grid">
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
                        style={{ width: "1em", height: "1em", borderWidth: "0.15em" }}
                      />
                      <span>Enviando…</span>
                    </>
                  ) : (
                    "Enviar"
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
