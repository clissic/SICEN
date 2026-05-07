import { Link } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";

export function ToolsMenuPage() {
  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Sistemas externos</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/home">
            Menú principal
          </Link>
        </div>

        <div className="row row-cols-1 row-cols-md-2 g-3">
          <div className="col">
            <Link className="text-decoration-none" to="/herramientas/ais">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="fw-semibold">AIS</div>
                  <div className="text-muted small">(MarineTraffic)</div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/herramientas/meteo">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="fw-semibold">Meteorología</div>
                  <div className="text-muted small">(Windy)</div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <a
              className="text-decoration-none"
              href="https://anteltv.com.uy/camaras"
              target="_blank"
              rel="noreferrer"
            >
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="fw-semibold">Cámaras públicas</div>
                  <div className="text-muted small">(Antel TV)</div>
                </div>
              </div>
            </a>
          </div>
          <div className="col">
            <a
              className="text-decoration-none"
              href="https://www.anp.com.uy/inicio/puertos/montevideo/sistemas/consultas-sobre-arribos/consulta-de-arribos"
              target="_blank"
              rel="noreferrer"
            >
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="fw-semibold">Consulta arribos</div>
                  <div className="text-muted small">(ANP)</div>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
