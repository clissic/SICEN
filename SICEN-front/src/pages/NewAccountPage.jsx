import { Navigate } from "react-router-dom";

/** Ruta legacy: abre el wizard en el login. */
export function NewAccountPage() {
  return <Navigate to="/login" replace state={{ openNewAccount: true }} />;
}
