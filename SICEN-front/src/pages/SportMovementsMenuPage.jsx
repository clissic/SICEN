import { Link } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";

const BASE = "/mi-unidad/areas/movimientos-deportivos";

const SECTIONS = [
  {
    slug: "despachos",
    title: "DESPACHOS",
    subtitle: "Registrar y confirmar salidas de buques deportivos.",
    iconClass: "bi-box-arrow-right",
    imageSrc: "/img/salidasDepo.png",
    imageAlt: "Despachos de buques deportivos",
  },
  {
    slug: "arribos",
    title: "ARRIBOS",
    subtitle: "En tránsito esperados y buques arribados.",
    iconClass: "bi-box-arrow-in-left",
    imageSrc: "/img/ingresosDepo.png",
    imageAlt: "Arribos de buques deportivos",
  },
  {
    slug: "demorados",
    title: "DEMORADOS",
    subtitle: "Movimientos en tránsito con ETA vencida.",
    iconClass: "bi-exclamation-triangle",
    imageSrc: "/img/demoradosDepo.png",
    imageAlt: "Buques demorados",
  },
];

const ICON_TILE = { fontSize: "0.95rem", marginTop: "0.15rem" };

export function SportMovementsMenuPage() {
  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="m-0">Movimientos deportivos</h3>
            <p className="text-muted small mb-0 mt-1">
              Despachos, arribos y demorados entre prefecturas.
            </p>
          </div>
          <Link className="btn btn-outline-secondary btn-sm" to="/mi-unidad">
            Mi Unidad
          </Link>
        </div>

        <div className="row row-cols-1 row-cols-md-3 g-3">
          {SECTIONS.map((s) => (
            <div key={s.slug} className="col">
              <Link
                className="text-decoration-none"
                to={`${BASE}/${s.slug}`}
              >
                <div className="card h-100 shadow-sm">
                  <img
                    src={s.imageSrc}
                    alt={s.imageAlt}
                    className="card-img-top"
                    loading="lazy"
                  />
                  <div className="card-body">
                    <div className="d-flex align-items-start gap-2">
                      <i
                        className={`menu-tile-icon bi ${s.iconClass} me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0`}
                        style={ICON_TILE}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="fw-semibold text-body text-break">
                          {s.title}
                        </div>
                        <div className="text-muted small text-break mt-1">
                          {s.subtitle}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
