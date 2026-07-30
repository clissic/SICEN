import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";

export function SignupPage() {
  const { user, loading, signup } = useAuth();
  const [form, setForm] = useState({
    avatar: "",
    first_name: "",
    last_name: "",
    rank: "",
    email: "",
    password: "",
  });
  const [err, setErr] = useState("");

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await signup({
        ...form,
        avatar: form.avatar || "./img/avatar.png",
      });
    } catch (ex) {
      setErr(ex.message || "No se pudo registrar");
    }
  }

  if (loading) return <Layout>...</Layout>;
  if (user) return <Navigate to="/home" replace />;

  return (
    <Layout>
      <div className="container-sm py-5">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h3 className="mb-3">Nueva cuenta</h3>
            <ErrorAlert message={err} />

            <form onSubmit={onSubmit} className="row g-3">
              <div className="col-12">
                <label className="form-label">Grado</label>
                <input
                  className="form-control"
                  required
                  value={form.rank}
                  onChange={(e) => set("rank", e.target.value)}
                />
              </div>
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
              <div className="col-12">
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
                <label className="form-label">Contraseña</label>
                <input
                  className="form-control"
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                />
              </div>

              <div className="col-12 d-grid">
                <button type="submit" className="btn btn-primary">
                  Registrar
                </button>
              </div>
            </form>

            <div className="mt-3">
              <Link className="btn btn-link p-0" to="/login">
                Volver al login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
