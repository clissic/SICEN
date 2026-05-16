import { Link } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";

/**
 * Pantalla provisional para secciones de gente de mar hasta implementar el flujo real.
 */
export function GenteMarPlaceholderPage({ title, description }) {
  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">{title}</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/base-gente-mar">
            Gestión de gente de mar
          </Link>
        </div>
        <div className="alert alert-secondary mb-0">
          {description ||
            "Esta sección está en desarrollo. Pronto podrá utilizarse desde aquí."}
        </div>
      </div>
    </Layout>
  );
}
