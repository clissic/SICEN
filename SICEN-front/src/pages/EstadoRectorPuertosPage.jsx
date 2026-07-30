import { Link } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";

const ICON_TILE = { fontSize: "0.95rem", marginTop: "0.15rem" };

const CIALA_SITE_URL = "https://ciala.acuerdolatinoamericano.org/";

export function EstadoRectorPuertosPage() {
  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Estado Rector de Puertos</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/home">
            Menú principal
          </Link>
        </div>

        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
          <div className="col">
            <a
              className="text-decoration-none d-block h-100"
              href={CIALA_SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir CIALA en una pestaña nueva"
            >
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/CIALAmenu.jpg"
                  alt="CIALA"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-globe-americas me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="d-flex align-items-center gap-2 fw-semibold text-body">
                        <span>CIALA</span>
                        <i
                          className="bi bi-box-arrow-up-right text-muted small"
                          aria-hidden
                          data-sicen-popover="Se abre en otra pestaña"
                        />
                      </div>
                      <div className="text-muted small">
                        Centro de Información del Acuerdo Latinoamericano de
                        Viña del Mar.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </div>

          <div className="col">
            <Link
              className="text-decoration-none"
              to="/estado-rector-puertos/inspecciones"
            >
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/inspectionsMenu.jpg"
                  alt="Inspecciones"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-clipboard-check me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-body">INSPECCIONES</div>
                      <div className="text-muted small">
                        Registro de inspecciones en puertos nacionales.
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
              to="/estado-rector-puertos/oserp"
            >
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/inspectorsMenu.jpg"
                  alt="OSERP"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-person-vcard me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-body">OSERP</div>
                      <div className="text-muted small">
                        Gestión de Inspectores por el Estado Rector de Puertos.
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
