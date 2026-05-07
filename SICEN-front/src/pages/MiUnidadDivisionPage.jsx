import { Link, Navigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";
import { getMiUnidadDivision } from "../constants/miUnidadDivisions.js";

export function MiUnidadDivisionPage() {
  const { divisionSlug } = useParams();
  const division = getMiUnidadDivision(divisionSlug);

  if (!division) {
    return <Navigate to="/mi-unidad" replace />;
  }

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="m-0">{division.title}</h3>
            <p className="text-muted small mb-0 mt-1">{division.subtitle}</p>
          </div>
          <Link className="btn btn-outline-secondary btn-sm" to="/mi-unidad">
            Mi Unidad
          </Link>
        </div>
        <div className="alert alert-secondary mb-0">
          Contenido de la división — sección en desarrollo.
        </div>
      </div>
    </Layout>
  );
}
