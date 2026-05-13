import { Link } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";

export function CarFinesMenuPage() {
  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Multas de vehículos terrestres</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/multas">
            Gestión de multas
          </Link>
        </div>

        <div className="row row-cols-1 row-cols-md-2 g-3">
          <div className="col">
            <Link className="text-decoration-none" to="/multas/vehiculos/nueva">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="fw-semibold">Cargar</div>
                  <div className="text-muted small">Registrar una nueva multa</div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/multas/vehiculos/todas">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="fw-semibold">Consultar</div>
                  <div className="text-muted small">
                    Ver multas con paginación
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link
              className="text-decoration-none"
              to="/multas/vehiculos/modificar"
            >
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="fw-semibold">Modificar</div>
                  <div className="text-muted small">
                    Buscar por número y actualizar
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link
              className="text-decoration-none"
              to="/multas/vehiculos/eliminar"
            >
              <div className="card h-100 shadow-sm border-danger">
                <img
                  src="/img/deleteFineCard.jpg"
                  alt="Borrar multa"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-trash3 me-1 px-2 py-1 border border-danger rounded-1 bg-danger text-white flex-shrink-0"
                      style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-danger">BORRAR MULTA</div>
                      <div className="text-muted small">
                        Eliminar una multa.
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
