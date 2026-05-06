import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export function ProtectedRoute({ children, admin }) {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="p-5 text-center text-muted">Cargando sesión…</div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  if (admin && user.role !== "admin" && user.role !== "superAdmin") {
    return <Navigate to="/home" replace />;
  }
  return children;
}
