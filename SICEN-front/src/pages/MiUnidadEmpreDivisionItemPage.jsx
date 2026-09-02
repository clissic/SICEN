import { Link, Navigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  getMiUnidadEmpreDivisionItem,
  isEmpreUnit,
} from "../constants/miUnidadEmpreDivisiones.js";

export function MiUnidadEmpreDivisionItemPage() {
  const { user } = useAuth();
  const { divisionSlug, itemSlug } = useParams();
  const resolved = getMiUnidadEmpreDivisionItem(divisionSlug, itemSlug);

  if (!isEmpreUnit(user?.unit) || !resolved) {
    return <Navigate to="/mi-unidad" replace />;
  }

  const { division, item } = resolved;

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <p className="text-muted small text-uppercase mb-1">
              {division.title}
            </p>
            <h3 className="m-0">{item.title}</h3>
            <p className="text-muted small mb-0 mt-1">{item.subtitle}</p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Link
              className="btn btn-outline-secondary btn-sm"
              to={`/mi-unidad/${division.slug}`}
            >
              {division.title}
            </Link>
            <Link className="btn btn-outline-secondary btn-sm" to="/mi-unidad">
              Mi Unidad
            </Link>
          </div>
        </div>
        <div className="alert alert-secondary mb-0">
          Contenido en preparación.
        </div>
      </div>
    </Layout>
  );
}
