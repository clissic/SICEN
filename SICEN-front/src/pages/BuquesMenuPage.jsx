import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Layout } from "../components/Layout.jsx";

const ICON_TILE = { fontSize: "0.95rem", marginTop: "0.15rem" };

export function BuquesMenuPage() {
  const { user } = useAuth();
  const canDeleteShip =
    user?.role === "admin" || user?.role === "superAdmin";
  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Gestión de buques</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/home">
            Menú principal
          </Link>
        </div>

        <div
          className={`row row-cols-1 g-3 ${
            canDeleteShip ? "row-cols-md-4" : "row-cols-md-3"
          }`}
        >
          <div className="col">
            <Link className="text-decoration-none" to="/base-buques/nuevo">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/shipCreate.jpg"
                  alt="Crear buque"
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
                      <div className="fw-semibold text-body">CREAR</div>
                      <div className="text-muted small">Dar de alta un buque mercante o deportivo.</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/base-buques/todos">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/shipRead.jpg"
                  alt="Consultar buques"
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
                      <div className="fw-semibold text-body">CONSULTAR</div>
                      <div className="text-muted small">Buscar buques y administrar certificados.</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/base-buques/editar">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/shipUpdate.jpg"
                  alt="Modificar buque"
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
                      <div className="fw-semibold text-body">MODIFICAR</div>
                      <div className="text-muted small">Buscar buques y editar datos.</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          {canDeleteShip ? (
          <div className="col">
            <Link className="text-decoration-none" to="/base-buques/eliminar">
              <div className="card h-100 shadow-sm border-danger">
                <img
                  src="/img/shipDelete.jpg"
                  alt="Borrar buque"
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
                      <div className="fw-semibold text-danger">BORRAR BUQUE</div>
                      <div className="text-muted small">Eliminar buque de la base de datos.</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}
