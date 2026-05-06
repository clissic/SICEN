import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword, validateRecoveryToken } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const qEmail = params.get("email") || "";

  const [email, setEmail] = useState(qEmail);
  const [valid, setValid] = useState(null);
  const [newPassword, setNew] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!token || !qEmail) {
      setValid(false);
      return;
    }
    validateRecoveryToken(token, qEmail)
      .then((d) => setValid(!!d.ok))
      .catch(() => setValid(false));
  }, [token, qEmail]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const data = await resetPassword(email, newPassword, confirmPassword);
      setMsg(data.msg || "Contraseña actualizada");
    } catch (ex) {
      setErr(ex.message || ex.data?.msg || "Error");
    }
  }

  return (
    <Layout>
      <div className="container-sm py-5">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
              <h3 className="m-0">Nueva contraseña</h3>
              <Link className="btn btn-outline-secondary btn-sm" to="/login">
                Ir al login
              </Link>
            </div>

            {valid === false ? (
              <div className="alert alert-danger py-2">
                Token inválido o expirado.
              </div>
            ) : null}
            {valid === null ? (
              <div className="text-muted small">Validando token…</div>
            ) : null}

            {msg ? <div className="alert alert-success py-2">{msg}</div> : null}
            {err ? <div className="alert alert-danger py-2">{err}</div> : null}

            {valid ? (
              <form onSubmit={onSubmit} className="vstack gap-3 mt-3">
                <div>
                  <label className="form-label">Email</label>
                  <input
                    className="form-control"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
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
                  Guardar
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </Layout>
  );
}
