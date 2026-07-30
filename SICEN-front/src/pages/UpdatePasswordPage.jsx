import { useState } from "react";
import { Link } from "react-router-dom";
import { updatePassword } from "../api/client.js";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";

export function UpdatePasswordPage() {
  const [newPassword, setNew] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const data = await updatePassword(newPassword, confirmPassword);
      setMsg(data.msg || "Listo");
      setNew("");
      setConfirm("");
    } catch (ex) {
      setErr(ex.message || ex.data?.msg || "Error");
    }
  }

  return (
    <Layout>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-4">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                  <h3 className="m-0">Cambiar contraseña</h3>
                  <Link className="btn btn-outline-secondary btn-sm" to="/home">
                    Volver
                  </Link>
                </div>

                {msg ? <div className="alert alert-success py-2">{msg}</div> : null}
                <ErrorAlert message={err} />

                <form onSubmit={onSubmit} className="vstack gap-3">
                  <div>
                    <label className="form-label">Nueva contraseña</label>
                    <input
                      className="form-control"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNew(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Confirmar</label>
                    <input
                      className="form-control"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Actualizar
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
