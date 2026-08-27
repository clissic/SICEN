import { Navigate } from "react-router-dom";

/** Ruta legacy: abre el wizard en el login. */
export function ForgotPasswordPage() {
  return <Navigate to="/login" replace state={{ openForgotPassword: true }} />;
}
