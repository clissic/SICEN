import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Layout } from "../components/Layout.jsx";
import { useBootstrapTheme } from "../components/ThemeToggle.jsx";

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const loc = useLocation();
  const from = loc.state?.from?.pathname || "/home";
  const bsTheme = useBootstrapTheme();
  const logoSrc =
    bsTheme === "dark" ? "/img/Logo-PNN-Blanco.png" : "/img/Logo-PNN.png";

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await login(email, password);
    } catch (ex) {
      setErr(ex.message || "Error al ingresar");
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="container py-5 text-center text-muted">Cargando…</div>
      </Layout>
    );
  }
  if (user) {
    return <Navigate to={from} replace />;
  }

  return (
    <Layout>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-4">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <div className="text-center">
                  <img src={logoSrc} alt="Logo PNN" className="img-fluid w-25 m-auto" />
                  <h4 className="my-2 text-start">Ingrese sus credenciales:</h4>
                </div>
                {err ? <div className="alert alert-danger py-2">{err}</div> : null}

                <form onSubmit={onSubmit} className="vstack gap-3">
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      className="form-control"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Contraseña</label>
                    <div className="input-group">
                      <input
                        className="form-control"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={
                          showPassword
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }
                      >
                        <i
                          className={
                            showPassword ? "bi bi-eye-slash" : "bi bi-eye"
                          }
                          aria-hidden
                        />
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary w-100">
                    Ingresar
                  </button>
                </form>

                <hr className="my-4" />

                <div className="d-grid gap-2">
                  <Link
                    className="btn btn-outline-secondary w-100"
                    to="/solicitar-cuenta"
                  >
                    Solicitar cuenta
                  </Link>
                  <Link
                    className="btn btn-outline-secondary w-100"
                    to="/forgot-password"
                  >
                    Recuperar contraseña
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
