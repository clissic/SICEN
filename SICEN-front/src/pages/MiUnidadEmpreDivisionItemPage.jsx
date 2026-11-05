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
  const children = item.menuItems ?? [];

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
        {children.length > 0 ? (
          <div className="row row-cols-1 row-cols-md-3 g-3">
            {children.map((child) => (
              <div key={child.slug} className="col">
                <Link
                  className="text-decoration-none"
                  to={`/mi-unidad/${division.slug}/${item.slug}/${child.slug}`}
                >
                  <div className="card h-100 shadow-sm">
                    <div className="card-body">
                      <div className="d-flex align-items-start gap-2">
                        <i
                          className={`menu-tile-icon bi ${child.iconClass} me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0`}
                          style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <div className="fw-semibold text-body text-break">
                            {child.title}
                          </div>
                          <div className="text-muted small text-break mt-1">
                            {child.subtitle}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="alert alert-secondary mb-0">
            Contenido en preparación.
          </div>
        )}
      </div>
    </Layout>
  );
}
