import { useState } from "react";
import { Link } from "react-router-dom";
import { updateDataRequest } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Layout } from "../components/Layout.jsx";
import { UserUnitSelect } from "../components/UserUnitSelect.jsx";
import { RANK_OPTIONS } from "../constants/ranks.js";

export function UpdateDataPage() {
  const { user } = useAuth();
  const [newFirstName, setNf] = useState("");
  const [newLastName, setNl] = useState("");
  const [newRank, setNr] = useState("");
  const [newRole, setNrole] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newEmail, setNe] = useState("");
  const [newDataBody, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const data = await updateDataRequest({
        first_name: user.first_name,
        newFirstName,
        last_name: user.last_name,
        newLastName,
        rank: user.rank,
        newRank,
        role: user.role,
        newRole,
        unit: user.unit,
        newUnit,
        email: user.email,
        newEmail,
        newDataBody,
      });
      setMsg(data.msg || "Solicitud enviada");
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
              <h3 className="m-0">Solicitud de actualización de datos</h3>
              <Link className="btn btn-outline-secondary btn-sm" to="/home">
                Volver
              </Link>
            </div>

            <p className="small text-muted">
              Complete solo los campos que desea modificar y el motivo.
            </p>

            {msg ? <div className="alert alert-success py-2">{msg}</div> : null}
            {err ? <div className="alert alert-danger py-2">{err}</div> : null}

            <form onSubmit={onSubmit} className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Nuevo nombre</label>
                <input
                  className="form-control"
                  value={newFirstName}
                  onChange={(e) => setNf(e.target.value)}
                />
                <div className="form-text">
                  Actual: {user?.first_name ? user.first_name : "—"}
                </div>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Nuevo apellido</label>
                <input
                  className="form-control"
                  value={newLastName}
                  onChange={(e) => setNl(e.target.value)}
                />
                <div className="form-text">
                  Actual: {user?.last_name ? user.last_name : "—"}
                </div>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Nuevo grado</label>
                <select
                  className="form-select"
                  value={newRank}
                  onChange={(e) => setNr(e.target.value)}
                  aria-label="Nuevo grado"
                >
                  <option value="">Seleccionar grado…</option>
                  {RANK_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <div className="form-text">Actual: {user?.rank ? user.rank : "—"}</div>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="update-data-unit">
                  Unidad
                </label>
                <UserUnitSelect
                  id="update-data-unit"
                  value={newUnit}
                  onChange={setNewUnit}
                />
                <div className="form-text">
                  Actual: {user?.unit ? user.unit : "—"}
                </div>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Nuevo rol (solicitud)</label>
                <input
                  className="form-control"
                  value={newRole}
                  onChange={(e) => setNrole(e.target.value)}
                />
                <div className="form-text">Actual: {user?.role ? user.role : "—"}</div>
              </div>
              <div className="col-12">
                <label className="form-label">Nuevo email</label>
                <input
                  className="form-control"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNe(e.target.value)}
                />
                <div className="form-text">Actual: {user?.email ? user.email : "—"}</div>
              </div>
              <div className="col-12">
                <label className="form-label">Motivo / cuerpo del mensaje</label>
                <textarea
                  className="form-control"
                  rows={5}
                  required
                  value={newDataBody}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
              <div className="col-12 d-grid">
                <button type="submit" className="btn btn-primary">
                  Enviar solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
