import { Link } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";

export function OserpMenuPage() {
  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="m-0">OSERP</h3>
            <p className="text-muted small mb-0 mt-1">
              Gestión de Oficiales Inspectores por el Estado Rector de Puertos.
            </p>
          </div>
          <Link
            className="btn btn-outline-secondary btn-sm"
            to="/estado-rector-puertos"
          >
            Estado Rector de Puertos
          </Link>
        </div>

        <div className="alert alert-secondary mb-0">
          Sección en desarrollo.
        </div>
      </div>
    </Layout>
  );
}
