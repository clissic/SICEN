import { Link } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";

/**
 * Tarjeta "ASISTENTE DE DEFICIENCIAS" del módulo OSERP. El asistente para
 * buscar deficiencias se implementará más adelante.
 */
export function OserpDeficiencyAssistantPage() {
  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="m-0">Asistente de deficiencias</h3>
            <p className="text-muted small mb-0 mt-1">
              Asistente especializado para buscar las diferentes deficiencias
              según la necesidad del OSERP.
            </p>
          </div>
          <Link
            className="btn btn-outline-secondary btn-sm"
            to="/estado-rector-puertos/oserp"
          >
            OSERP
          </Link>
        </div>

        <div className="alert alert-secondary mb-0">
          Sección en desarrollo.
        </div>
      </div>
    </Layout>
  );
}
