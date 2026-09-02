import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { IframeModal } from "../components/IframeModal.jsx";
import { NewAccountRequestModal } from "../components/NewAccountRequestModal.jsx";
import { ForgotPasswordModal } from "../components/ForgotPasswordModal.jsx";
import { ThemeToggle, useBootstrapTheme } from "../components/ThemeToggle.jsx";

const JPC_SITE_URL = "https://jpc-dev.uy";

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [jpcModalOpen, setJpcModalOpen] = useState(false);
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const loc = useLocation();
  const fromLocation = loc.state?.from;
  const from =
    fromLocation && typeof fromLocation.pathname === "string"
      ? `${fromLocation.pathname}${fromLocation.search || ""}${fromLocation.hash || ""}`
      : "/home";
  const bsTheme = useBootstrapTheme();
  const logoSrc =
    bsTheme === "dark" ? "/img/Logo-PNN-Blanco.png" : "/img/Logo-PNN.png";

  useEffect(() => {
    if (loc.state?.openNewAccount) setNewAccountOpen(true);
    if (loc.state?.openForgotPassword) setForgotPasswordOpen(true);
  }, [loc.state?.openNewAccount, loc.state?.openForgotPassword]);

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
      <div className="login-page login-page--loading">
        <div className="text-muted">Cargando…</div>
      </div>
    );
  }
  if (user) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="login-page">
      <aside className="login-brand" aria-label="Marca Prefectura Nacional Naval">
        <div className="login-brand__inner">
          <div className="login-brand__logo-wrap">
            <img
              className="login-brand__logo"
              src={logoSrc}
              alt="Logo Prefectura Nacional Naval — anclas cruzadas"
              width="512"
              height="512"
              decoding="async"
            />
          </div>
          <div className="login-brand__copy">
            <h1 className="login-brand__title">
              <span className="login-brand__title-system">Sistema</span>
              <span className="login-brand__title-name">Centinela</span>
            </h1>
            <p>Prefectura Nacional Naval</p>
          </div>
        </div>
      </aside>

      <section className="login-panel">
        <div className="login-panel__theme">
          <ThemeToggle />
        </div>

        <div className="login-panel__inner">
          <h2 className="login-panel__title">Ingresar</h2>
          <p className="login-panel__subtitle">
            Ingrese sus credenciales para continuar.
          </p>

          <ErrorAlert message={err} className="alert alert-danger py-2 mb-3" />

          <form onSubmit={onSubmit} className="vstack gap-3">
            <div>
              <label className="form-label" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                className="form-control"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="login-password">
                Contraseña
              </label>
              <div className="input-group">
                <input
                  id="login-password"
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
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  <i
                    className={showPassword ? "bi bi-eye-slash" : "bi bi-eye"}
                    aria-hidden
                  />
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-100">
              Ingresar
            </button>
          </form>

          <div className="login-panel__links">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setNewAccountOpen(true)}
            >
              Solicitar cuenta
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setForgotPasswordOpen(true)}
            >
              Recuperar contraseña
            </button>
          </div>

          <footer className="login-panel__meta">
            <div className="login-panel__meta-row">
              <img
                className="login-panel__meta-pnn"
                src={logoSrc}
                alt=""
                width="48"
                height="20"
                loading="lazy"
                aria-hidden="true"
              />
              <span>Sistema Centinela - 2026</span>
              <span aria-hidden="true">·</span>
              <span>Versión de DESARROLLO</span>
            </div>
            <div className="login-panel__meta-row">
              <span>
                Desarrollado por
                <button
                  type="button"
                  className="login-panel__meta-jpc"
                  onClick={() => setJpcModalOpen(true)}
                  aria-label="Abrir sitio de JPC en una vista previa"
                >
                  <img
                    src="/img/LogoJPC.svg"
                    alt=""
                    aria-hidden="true"
                    decoding="async"
                  />
                </button>
              </span>
              <span aria-hidden="true">·</span>
              <span>Montevideo - 25/09/2023</span>
            </div>
          </footer>
        </div>
      </section>

      <IframeModal
        open={jpcModalOpen}
        onClose={() => setJpcModalOpen(false)}
        url={JPC_SITE_URL}
        titleText="JPC — jpc-dev.uy"
        logoSrc="/img/LogoJPC.svg"
        ariaLabel="Sitio de JPC en una vista previa"
      />

      <NewAccountRequestModal
        open={newAccountOpen}
        onClose={() => setNewAccountOpen(false)}
      />

      <ForgotPasswordModal
        open={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
      />
    </div>
  );
}
