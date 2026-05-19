import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { pathRequiresUserTutorial } from "../constants/userTutorialRoutes.js";
import { hasCompletedUserTutorial } from "../utils/userTutorial.js";
import { useBootstrapTheme } from "./ThemeToggle.jsx";

export function ProtectedRoute({ children, admin }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  const bsTheme = useBootstrapTheme();
  const pnnLogoSrc =
    bsTheme === "dark" ? "/img/Logo-PNN-Blanco.png" : "/img/Logo-PNN.png";

  if (loading) {
    return (
      <>
        <style>{`
          @keyframes sicen-session-loading-spin-y {
            from {
              transform: rotateY(0deg);
            }
            to {
              transform: rotateY(360deg);
            }
          }
          .sicen-session-loading-root {
            perspective: 280px;
            background-color: var(--bs-body-bg);
            color: var(--bs-body-color);
          }
          .sicen-session-loading-logo {
            transform-style: preserve-3d;
            animation: sicen-session-loading-spin-y 1.35s linear infinite;
          }
        `}</style>
        <div
          className="sicen-session-loading-root min-vh-100 d-flex flex-column align-items-center justify-content-center gap-4 px-3 bg-body text-body"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="d-flex justify-content-center">
            <img
              className="sicen-session-loading-logo flex-shrink-0"
              src={pnnLogoSrc}
              alt="Prefectura Nacional Naval"
              width="160"
              height="64"
              style={{ maxWidth: "min(70vw, 12rem)", height: "auto" }}
              decoding="async"
            />
          </div>
          <p className="mb-0 text-center text-muted small text-uppercase fw-semibold">
            Cargando sesión…
          </p>
        </div>
      </>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  if (admin && user.role !== "admin" && user.role !== "superAdmin") {
    return <Navigate to="/home" replace />;
  }
  if (
    !admin &&
    !hasCompletedUserTutorial(user) &&
    pathRequiresUserTutorial(loc.pathname)
  ) {
    return (
      <Navigate to="/tutorial-requerido" replace state={{ from: loc }} />
    );
  }
  return children;
}
