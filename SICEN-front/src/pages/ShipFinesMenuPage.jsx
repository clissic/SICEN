import { Link } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";

const ICON_TILE = { fontSize: "0.95rem", marginTop: "0.15rem" };

export function ShipFinesMenuPage() {
  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Multas de buques</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/multas">
            Gestión de multas
          </Link>
        </div>

        <div className="row row-cols-1 row-cols-md-3 g-3">
          <div className="col">
            <Link className="text-decoration-none" to="/multas/buques/nueva">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/createShipFine.jpg"
                  alt="Cargar multa de buque"
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
                      <div className="fw-semibold text-body">CARGAR MULTA</div>
                      <div className="text-muted small">
                        Registrar una nueva multa para un buque.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/multas/buques/todas">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/readShipFine.jpg"
                  alt="Consultar y modificar multas de buques"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-search me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-body">
                        CONSULTAR Y MODIFICAR
                      </div>
                      <div className="text-muted small">
                        Buscar multa de buque y modificar sus datos y estado.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link
              className="text-decoration-none"
              to="/multas/buques/eliminar"
            >
              <div className="card h-100 shadow-sm border-danger">
                <img
                  src="/img/deleteCarFine.jpg"
                  alt="Borrar multa de buque"
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
                      <div className="fw-semibold text-danger">BORRAR MULTA</div>
                      <div className="text-muted small">
                        Eliminar una multa de buque de la base de datos.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
