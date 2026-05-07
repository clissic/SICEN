import { Link } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";

export function BaseBuquesPage() {
  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Gestión de buques</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/home">
            Menú principal
          </Link>
        </div>
        <div className="alert alert-secondary mb-0">
          Base de datos de buques — sección en desarrollo.
        </div>
      </div>
    </Layout>
  );
}
