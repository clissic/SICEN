import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/client.js";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const data = await forgotPassword(email);
      setMsg(data.msg || "Revisá tu correo");
    } catch (ex) {
      setErr(ex.message || ex.data?.msg || "Error");
    }
  }

  return (
    <Layout>
      <div className="container-sm py-5">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h3 className="mb-3">Recuperar contraseña</h3>
            {msg ? <div className="alert alert-success py-2">{msg}</div> : null}
            <ErrorAlert message={err} />

            <form onSubmit={onSubmit} className="vstack gap-3">
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
              <button type="submit" className="btn btn-primary">
                Enviar enlace
              </button>
            </form>

            <p className="small text-muted mt-3 mb-0">
              Recibirás un enlace a la pantalla de restablecimiento.
            </p>

            <div className="mt-3">
              <Link className="btn btn-link p-0" to="/login">
                Volver
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
