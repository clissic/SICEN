import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext.jsx";
import { useDocumentSicenPopovers } from "../hooks/useDocumentSicenPopovers.js";
import { AnniversaryModal } from "./AnniversaryModal.jsx";
import { IframeModal } from "./IframeModal.jsx";
import { NotificationsBell } from "./NotificationsBell.jsx";
import { ThemeToggle, useBootstrapTheme } from "./ThemeToggle.jsx";

const JPC_SITE_URL = "https://jpc-dev.uy";

function LogoutPowerButton({ onLogout, showLabel = false }) {
  async function handleClick() {
    const result = await Swal.fire({
      title: "Cerrar sesión",
      text: "¿Confirma que desea cerrar la sesión?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Cerrar sesión",
      cancelButtonText: "Cancelar",
      focusCancel: true,
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      onLogout();
    }
  }

  return (
    <button
      type="button"
      className={`btn btn-sm btn-outline-secondary btn-logout-power d-flex align-items-center justify-content-center px-2 ${
        showLabel ? "w-100 gap-2" : ""
      }`}
      onClick={handleClick}
      aria-label="Cerrar sesión"
      {...(showLabel
        ? {}
        : {
            "data-sicen-popover": "Cerrar sesión",
            "data-sicen-popover-placement": "bottom",
          })}
    >
      <i className="bi bi-power" style={{ fontSize: "1.1rem" }} aria-hidden />
      {showLabel ? <span>Cerrar sesión</span> : null}
    </button>
  );
}

function NavbarToolbar({ user, onLogout }) {
  const [compactNav, setCompactNav] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 575.98px)").matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 575.98px)");
    const onChange = () => setCompactNav(mq.matches);
    mq.addEventListener("change", onChange);
    onChange();
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (compactNav) {
    return (
      <div className="dropdown ms-auto">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center px-2"
          data-bs-toggle="dropdown"
          data-bs-auto-close="outside"
          data-bs-display="static"
          aria-expanded="false"
          aria-label="Tema y sesión"
        >
          <i className="bi bi-chevron-down" aria-hidden />
        </button>
        <div className="dropdown-menu dropdown-menu-end p-3 shadow">
          <div className="d-flex flex-column align-items-center gap-3">
            <ThemeToggle />
            {user ? <NotificationsBell embedded /> : null}
            {user ? (
              <LogoutPowerButton onLogout={onLogout} showLabel />
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-2 gap-sm-3 ms-auto text-end">
      <ThemeToggle />
      {user ? <NotificationsBell /> : null}
      {user ? <LogoutPowerButton onLogout={onLogout} /> : null}
    </div>
  );
}

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const bsTheme = useBootstrapTheme();
  const [jpcModalOpen, setJpcModalOpen] = useState(false);
  useDocumentSicenPopovers();
  const navbarEmblemSrc =
    bsTheme === "dark"
      ? "/img/Franja-PNN-CUADRADO-Blanco.png"
      : "/img/Franja-PNN-CUADRADO.png";
  const footerPnnLogoSrc =
    bsTheme === "dark" ? "/img/Logo-PNN-Blanco.png" : "/img/Logo-PNN.png";

  return (
    <div className="min-vh-100 d-flex flex-column">
      <style>{`
        footer .jpc-footer-link {
          color: inherit;
          text-decoration: none;
          font-weight: inherit;
        }
        footer .jpc-footer-link:hover {
          text-decoration: underline;
        }
        footer .jpc-footer-link-btn {
          background: transparent;
          border: 0;
          padding: 0;
          line-height: inherit;
          cursor: pointer;
          color: inherit;
        }
        footer .jpc-footer-link-btn:focus-visible {
          outline: 2px solid var(--bs-primary);
          outline-offset: 2px;
          border-radius: 2px;
        }
        footer .footer-pnn-logo {
          height: 2.5rem;
          width: auto;
          max-width: 8rem;
          object-fit: contain;
        }
        @media (min-width: 576px) {
          footer .footer-pnn-logo {
            height: 2.75rem;
          }
        }
        footer .jpc-footer-logo {
          width: auto;
          height: 1em;
          display: inline-block;
          vertical-align: -0.12em;
          object-fit: contain;
        }
        [data-bs-theme="dark"] footer .jpc-footer-logo {
          filter: brightness(0) invert(1);
        }
        .btn-logout-power:hover,
        .btn-logout-power:focus-visible {
          color: var(--bs-danger) !important;
          border-color: var(--bs-danger) !important;
          background-color: transparent;
        }
        .navbar-brand-emblem {
          height: 2.5rem;
          width: auto;
          object-fit: contain;
          flex-shrink: 0;
        }
        @media (min-width: 576px) {
          .navbar-brand-emblem {
            height: 3rem;
          }
        }
      `}</style>
      <nav className="navbar navbar-expand-lg bg-body-tertiary border-bottom">
        <div className="container-fluid">
          <Link
            className="navbar-brand d-flex flex-row align-items-center gap-2 gap-sm-3"
            to="/"
          >
            <img
              className="navbar-brand-emblem"
              src={navbarEmblemSrc}
              alt="Emblema Prefectura Nacional Naval"
              width="48"
              height="48"
            />
            <div className="d-flex flex-column align-items-start gap-0 lh-sm">
              <h1 className="mb-0">Sistema Centinela</h1>
              <p className="fw-semibold text-body mb-0">Prefectura Nacional Naval</p>
            </div>
          </Link>

          <NavbarToolbar user={user} onLogout={logout} />
        </div>
      </nav>

      <main className="flex-grow-1">{children}</main>

      <AnniversaryModal />

      <footer className="border-top py-3">
        <div className="container">
          <div className="d-flex flex-column flex-md-row flex-wrap align-items-center justify-content-center justify-content-md-between w-100 gap-3">
            <div className="d-flex flex-row align-items-center gap-3 min-w-0 justify-content-center justify-content-md-start">
              <img
                className="footer-pnn-logo flex-shrink-0"
                src={footerPnnLogoSrc}
                alt="Prefectura Nacional Naval"
                width="120"
                height="48"
                loading="lazy"
              />
              <div className="d-flex flex-column align-items-center align-items-md-start gap-1 small text-center text-md-start">
                <div className="fw-semibold text-body">
                  Sistema Centinela - 2026
                </div>
                <div className="text-muted">Versión de DESARROLLO</div>
              </div>
            </div>
            <div className="d-flex flex-column align-items-center text-center align-items-md-end text-md-end small gap-1 flex-shrink-0">
              <div className="d-inline-flex align-items-center fw-semibold justify-content-center justify-content-md-end flex-wrap gap-1">
                <span>
                  Desarrollado por{" "}
                  <button
                    type="button"
                    className="jpc-footer-link jpc-footer-link-btn"
                    onClick={() => setJpcModalOpen(true)}
                    aria-label="Abrir sitio de JPC en una vista previa"
                  >
                    <img
                      className="jpc-footer-logo flex-shrink-0"
                      src="/img/LogoJPC.svg"
                      alt=""
                      aria-hidden="true"
                      decoding="async"
                    />
                  </button>
                </span>
                
              </div>
              <div className="text-muted">Montevideo - 25/09/2023</div>
            </div>
          </div>
        </div>
      </footer>

      <IframeModal
        open={jpcModalOpen}
        onClose={() => setJpcModalOpen(false)}
        url={JPC_SITE_URL}
        titleText="JPC — jpc-dev.uy"
        logoSrc="/img/LogoJPC.svg"
        ariaLabel="Sitio de JPC en una vista previa"
      />
    </div>
  );
}
