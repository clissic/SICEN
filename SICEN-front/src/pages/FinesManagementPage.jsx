import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  carFinesCounts,
  personalFinesCounts,
  shipFinesCounts,
} from "../api/client.js";
import { Layout } from "../components/Layout.jsx";

const ICON_TILE = { fontSize: "0.95rem", marginTop: "0.15rem" };

const STAT_REGISTERED_NUMBER_STYLE = { fontSize: "6rem", lineHeight: 1 };

/** Estilo idéntico al de las tarjetas apiladas en Usuarios / Buques / Gente de mar. */
const STAT_STACK_NUMBER_STYLE = {
  fontSize: "clamp(1.5rem, 4.5vmin, 2.85rem)",
  lineHeight: 1,
};

export function FinesManagementPage() {
  const [counts, setCounts] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsErr, setStatsErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    setStatsErr("");

    Promise.all([
      carFinesCounts(),
      shipFinesCounts(),
      personalFinesCounts(),
    ])
      .then(([car, ship, personal]) => {
        if (cancelled) return;
        const carTotal = car?.payload?.total ?? 0;
        const carDismissed = car?.payload?.dismissed ?? 0;
        const shipTotal = ship?.payload?.total ?? 0;
        const shipDismissed = ship?.payload?.dismissed ?? 0;
        const personalTotal = personal?.payload?.total ?? 0;
        const personalDismissed = personal?.payload?.dismissed ?? 0;
        setCounts({
          car: carTotal,
          ship: shipTotal,
          personal: personalTotal,
          dismissed: carDismissed + shipDismissed + personalDismissed,
          total: carTotal + shipTotal + personalTotal,
        });
      })
      .catch((e) => {
        if (!cancelled) {
          setStatsErr(
            e?.message || "No se pudieron cargar las estadísticas de multas."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function statValue(n) {
    if (statsLoading) return "…";
    if (statsErr) return "—";
    return typeof n === "number" ? n.toLocaleString("es-UY") : n;
  }

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
                      style={ICON_TILE}
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
                      style={ICON_TILE}
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
                      style={ICON_TILE}
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

        <h4 className="mt-4 mb-3">Estadísticas</h4>
        {statsErr ? (
          <div className="alert alert-warning py-2">{statsErr}</div>
        ) : null}

        <div className="row g-3 align-items-stretch">
          <div className="col-12 col-md-6 d-flex">
            <div className="card shadow-sm w-100">
              <div className="card-body text-center py-4 d-flex flex-column justify-content-center">
                <div className="fw-semibold text-body mb-3">
                  Total de multas implementadas
                </div>
                <div
                  className="fw-semibold text-body"
                  style={STAT_REGISTERED_NUMBER_STYLE}
                >
                  {statValue(counts?.total)}
                </div>
                <div className="text-muted small mt-2">
                  Suma de vehículos, buques y personales (sin desestimadas).
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 d-flex flex-column gap-3 h-100">
            <div className="card shadow-sm flex-fill d-flex flex-column min-h-0">
              <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                <div className="fw-semibold text-body small text-start mb-0">
                  <i
                    className="bi bi-life-preserver me-2 text-secondary"
                    aria-hidden
                  />
                  Total de multas a buques
                </div>
                <div
                  className="fw-semibold text-body text-end flex-shrink-0"
                  style={STAT_STACK_NUMBER_STYLE}
                >
                  {statValue(counts?.ship)}
                </div>
              </div>
            </div>
            <div className="card shadow-sm flex-fill d-flex flex-column min-h-0">
              <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                <div className="fw-semibold text-body small text-start mb-0">
                  <i
                    className="bi bi-car-front me-2 text-secondary"
                    aria-hidden
                  />
                  Total de multas a vehículos
                </div>
                <div
                  className="fw-semibold text-body text-end flex-shrink-0"
                  style={STAT_STACK_NUMBER_STYLE}
                >
                  {statValue(counts?.car)}
                </div>
              </div>
            </div>
            <div className="card shadow-sm flex-fill d-flex flex-column min-h-0">
              <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                <div className="fw-semibold text-body small text-start mb-0">
                  <i
                    className="bi bi-person-badge me-2 text-secondary"
                    aria-hidden
                  />
                  Total de multas a particulares
                </div>
                <div
                  className="fw-semibold text-body text-end flex-shrink-0"
                  style={STAT_STACK_NUMBER_STYLE}
                >
                  {statValue(counts?.personal)}
                </div>
              </div>
            </div>
            <div className="card shadow-sm flex-fill d-flex flex-column min-h-0 border-warning-subtle">
              <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                <div className="fw-semibold text-body small text-start mb-0">
                  <i
                    className="bi bi-slash-circle-fill me-2 text-warning"
                    aria-hidden
                  />
                  Total de multas desestimadas
                </div>
                <div
                  className="fw-semibold text-body text-end flex-shrink-0"
                  style={STAT_STACK_NUMBER_STYLE}
                >
                  {statValue(counts?.dismissed)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
