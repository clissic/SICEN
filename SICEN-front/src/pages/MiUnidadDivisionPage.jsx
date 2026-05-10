import { Link, Navigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";
import { getMiUnidadDivision } from "../constants/miUnidadDivisions.js";

export function MiUnidadDivisionPage() {
  const { divisionSlug } = useParams();
  const division = getMiUnidadDivision(divisionSlug);

  if (!division) {
    return <Navigate to="/mi-unidad" replace />;
  }

  const hasMenus = division.menuSections?.length > 0;

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

        {hasMenus ? (
          <>
            {division.menuSections.map((section) => (
              <div key={section.slug} className="mb-4">
                <h4 className="h6 text-muted text-uppercase mb-3">
                  {section.title}
                </h4>
                <div className="row row-cols-1 row-cols-md-3 g-3">
                  {section.items.map((item) => (
                    <div key={item.slug} className="col">
                      <Link
                        className="text-decoration-none"
                        to={`/mi-unidad/${division.slug}/${section.slug}/${item.slug}`}
                      >
                        <div className="card h-100 shadow-sm">
                          <div className="card-body">
                            <div className="d-flex align-items-start gap-2">
                              <i
                                className={`menu-tile-icon bi ${item.iconClass} me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0`}
                                style={{
                                  fontSize: "0.95rem",
                                  marginTop: "0.15rem",
                                }}
                                aria-hidden
                              />
                              <div className="min-w-0">
                                <div className="fw-semibold text-body text-break">
                                  {item.title}
                                </div>
                                <div className="text-muted small text-break mt-1">
                                  {item.subtitle}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="alert alert-secondary mb-0">
            Contenido de la división — sección en desarrollo.
          </div>
        )}
      </div>
    </Layout>
  );
}
