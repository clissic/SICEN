import { Link } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";

export function FinesManagementPage() {
  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Gestión de multas</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/home">
            Menú principal
          </Link>
        </div>

        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
          <div className="col">
            <Link className="text-decoration-none" to="/multas/buques">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/shipFinesMenu.jpg"
                  alt="Multas de buques"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-life-preserver me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-body">MULTAS DE BUQUES</div>
                      <div className="text-muted small">
                        Base de datos de multas de buques y flujos específicos.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/multas/vehiculos">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/carFinesMenu.jpg"
                  alt="Multas de vehículos"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-car-front me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-body">MULTAS DE VEHÍCULOS</div>
                      <div className="text-muted small">
                        Base de datos de multas de vehículos y flujos específicos.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/multas/personales">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/personalFinesMenu.jpg"
                  alt="Multas personales"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-person-badge me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-body">MULTAS PERSONALES</div>
                      <div className="text-muted small">
                        Base de datos de multas personales y flujos específicos.
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
