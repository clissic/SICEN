import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Layout } from "../components/Layout.jsx";

const ICON_TILE = { fontSize: "0.95rem", marginTop: "0.15rem" };

export function GenteMarMenuPage() {
  const { user } = useAuth();
  const canDelete =
    user?.role === "admin" || user?.role === "superAdmin";

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Gestión de gente de mar</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/home">
            Menú principal
          </Link>
        </div>

        <div
          className={`row row-cols-1 g-3 ${
            canDelete ? "row-cols-md-4" : "row-cols-md-3"
          }`}
        >
          <div className="col">
            <Link className="text-decoration-none" to="/base-gente-mar/nuevo">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/seamanCreate.jpg"
                  alt="Crear registro de gente de mar"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-plus-lg me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-body">INGRESAR PERSONA</div>
                      <div className="text-muted small">
                        Dar de alta un registro en la base de gente de mar.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/base-gente-mar/todos">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/seamanRead.jpg"
                  alt="Consultar gente de mar"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-list-ul me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-body">CONSULTAR Y MODIFICAR</div>
                      <div className="text-muted small">
                        Buscar persona y asignar/actualizar, embarques, cursos, capacitaciones y/o sanciones.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/base-gente-mar/editar">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/seamanUpdate.jpg"
                  alt="Modificar gente de mar"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-pencil-square me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-body">METADATOS</div>
                      <div className="text-muted small">
                        Crear, consultar, modificar y borrar metadatos de cursos, capacitaciones y/o sanciones para la gente de mar.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          {canDelete ? (
            <div className="col">
              <Link
                className="text-decoration-none"
                to="/base-gente-mar/eliminar"
              >
                <div className="card h-100 shadow-sm border-danger">
                  <img
                    src="/img/seamanDelete.jpg"
                    alt="Eliminar registro de gente de mar"
                    className="card-img-top"
                    loading="lazy"
                  />
                  <div className="card-body">
                    <div className="d-flex align-items-start gap-2">
                      <i
                        className="menu-tile-icon bi bi-trash3 me-1 px-2 py-1 border border-danger rounded-1 bg-danger text-white flex-shrink-0"
                        style={ICON_TILE}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="fw-semibold text-danger">
                          ELIMINAR REGISTRO
                        </div>
                        <div className="text-muted small">
                          Eliminar un registro de la base de datos.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ) : null}
        </div>

        <h4 className="mt-4 mb-3">Estadísticas</h4>
        <div className="card shadow-sm border-secondary">
          <div className="card-body py-4 text-center text-muted">
            <p className="mb-0 small">
              Las estadísticas de gente de mar se implementarán más adelante.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
