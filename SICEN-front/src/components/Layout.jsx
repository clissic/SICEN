import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";

function LogoutPowerButton({ onLogout }) {
  const btnRef = useRef(null);

  useEffect(() => {
    const el = btnRef.current;
    const Popover = globalThis.bootstrap?.Popover;
    if (!el || !Popover) return;

    const popover = new Popover(el, {
      content: "Cerrar sesión",
      trigger: "hover focus",
      placement: "bottom",
      customClass: "popover-cerrar-sesion",
    });

    return () => {
      popover.dispose();
    };
  }, []);

  async function handleClick() {
    const result = await Swal.fire({
      title: "¿Cerrar sesión?",
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
      ref={btnRef}
      type="button"
      className="btn btn-sm btn-outline-secondary btn-logout-power d-flex align-items-center justify-content-center px-2"
      onClick={handleClick}
      aria-label="Cerrar sesión"
    >
      <i className="bi bi-power" style={{ fontSize: "1.1rem" }} aria-hidden />
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

  const actions = (
    <>
      <ThemeToggle />
      {user ? <LogoutPowerButton onLogout={onLogout} /> : null}
    </>
  );

  if (compactNav) {
    return (
      <div className="dropdown ms-auto" data-bs-auto-close="outside">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center px-2"
          data-bs-toggle="dropdown"
          data-bs-display="static"
          aria-expanded="false"
          aria-label="Tema y sesión"
        >
          <i className="bi bi-chevron-down" aria-hidden />
        </button>
        <div className="dropdown-menu dropdown-menu-end p-3 shadow">
          <div className="d-flex flex-column align-items-center gap-3">
            {actions}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-2 gap-sm-3 ms-auto text-end">
      {actions}
    </div>
  );
}

export function Layout({ children }) {
  const { user, logout } = useAuth();

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
        footer .jpc-footer-logo {
          opacity: 0.5;
        }
        [data-bs-theme="dark"] footer .jpc-footer-logo {
          filter: brightness(0) invert(1);
          opacity: 0.65;
        }
        .btn-logout-power:hover,
        .btn-logout-power:focus-visible {
          color: var(--bs-danger) !important;
          border-color: var(--bs-danger) !important;
          background-color: transparent;
        }
        .popover-cerrar-sesion .popover-header {
          display: none;
        }
        .popover-cerrar-sesion .popover-body {
          padding: 0.4rem 0.65rem;
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
              src="/img/Franja-PNN-CUADRADO.png"
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

      <footer className="border-top py-3">
        <div className="container text-center">
          <div className="small text-muted">
            Desarrollado por{" "}
            <a
              className="jpc-footer-link"
              href="https://jpc-dev.uy"
              target="_blank"
              rel="noreferrer"
            >
              JPC®
            </a>{" "}
            - Montevideo - 25/09/2023
          </div>
          <div className="small text-muted">Versión de DESARROLLO</div>
          <div className="mt-2">
            <img
              className="jpc-footer-logo"
              src="/img/LogoJPC.svg"
              alt="JPC logo"
              width="24"
              height="24"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
