import { Link } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";

export function ShipFinesMenuPage() {
  return (
    <Layout>
      <div className="container-md py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Multas de buques</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/multas">
            Gestión de multas
          </Link>
        </div>
        <div className="alert alert-secondary mb-0">
          El flujo histórico en Handlebars reutilizaba formularios de vehículos.
          Podés extender esta sección con formularios específicos y endpoints en
          el backend.
        </div>
      </div>
    </Layout>
  );
}
