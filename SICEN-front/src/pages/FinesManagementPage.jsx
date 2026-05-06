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

        <div className="row row-cols-1 row-cols-md-2 g-3">
          <div className="col">
            <Link className="text-decoration-none" to="/multas/buques">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="fw-semibold">MULTAS DE BUQUES</div>
                  <div className="text-muted small">
                    Consulta / flujos específicos
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/multas/vehiculos">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="fw-semibold">MULTAS DE VEHÍCULOS</div>
                  <div className="text-muted small">
                    Alta, consulta, modificación y borrado
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
