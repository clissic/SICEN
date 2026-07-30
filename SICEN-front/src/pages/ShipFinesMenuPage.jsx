import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { shipFinesStats } from "../api/client.js";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";

const ICON_TILE = { fontSize: "0.95rem", marginTop: "0.15rem" };

function StatsTable({ rows, total, emptyLabel, valueLabel }) {
  if (!rows || rows.length === 0) {
    return <p className="text-muted small mb-0">{emptyLabel}</p>;
  }
  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th scope="col" style={{ width: "3rem" }}>
              #
            </th>
            <th scope="col">{valueLabel}</th>
            <th scope="col" className="text-end" style={{ width: "6rem" }}>
              Multas
            </th>
            <th scope="col" className="text-end" style={{ width: "5rem" }}>
              %
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const pct =
              total > 0 ? Math.round((row.count / total) * 1000) / 10 : 0;
            return (
              <tr key={`${row.label}-${idx}`}>
                <td className="text-muted">{idx + 1}</td>
                <td className="text-break">{row.label}</td>
                <td className="text-end fw-semibold">{row.count}</td>
                <td className="text-end text-muted">
                  {pct.toLocaleString("es-UY", {
                    maximumFractionDigits: 1,
                  })}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ShipFinesMenuPage() {
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsErr, setStatsErr] = useState("");

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsErr("");
    try {
      const res = await shipFinesStats({ limit: 10 });
      setStats(res?.payload || null);
    } catch (e) {
      setStatsErr(
        e?.message || "No se pudieron cargar las estadísticas de multas."
      );
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const total = stats?.totalConsidered ?? 0;
  const topFlags = stats?.topFlags ?? [];
  const topArticles = stats?.topArticles ?? [];
  const topOwners = stats?.topOwners ?? [];

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Multas de buques</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/multas">
            Gestión de multas
          </Link>
        </div>

        <div className="row row-cols-1 row-cols-md-3 g-3">
          <div className="col">
            <Link className="text-decoration-none" to="/multas/buques/nueva">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/createShipFine.jpg"
                  alt="Cargar multa de buque"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-plus-lg me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-body">CARGAR MULTA</div>
                      <div className="text-muted small">
                        Registrar una nueva multa para un buque.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/multas/buques/todas">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/readShipFine.jpg"
                  alt="Consultar y modificar multas de buques"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-search me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-body">
                        CONSULTAR Y MODIFICAR
                      </div>
                      <div className="text-muted small">
                        Buscar multa de buque y modificar sus datos y estado.
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
              to="/multas/buques/eliminar"
            >
              <div className="card h-100 shadow-sm border-danger">
                <img
                  src="/img/deleteCarFine.jpg"
                  alt="Borrar multa de buque"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-trash3 me-1 px-2 py-1 border border-danger rounded-1 bg-danger text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-danger">BORRAR MULTA</div>
                      <div className="text-muted small">
                        Eliminar una multa de buque de la base de datos.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <section className="mt-4">
          <div className="d-flex align-items-end justify-content-between flex-wrap gap-2 mb-2">
            <div>
              <h4 className="m-0">Estadísticas de multas de buques</h4>
              <div className="text-muted small">
                Rankings calculados sobre multas vigentes (se excluyen las
                desestimadas).
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
              onClick={loadStats}
              disabled={statsLoading}
              data-sicen-popover="Actualizar estadísticas"
            >
              <i
                className={`bi ${
                  statsLoading
                    ? "bi-arrow-clockwise spinner-rotate"
                    : "bi-arrow-clockwise"
                }`}
                aria-hidden
              />
              <span>{statsLoading ? "Actualizando…" : "Actualizar"}</span>
            </button>
          </div>

          {statsErr ? (
            <ErrorAlert message={statsErr} className="alert alert-danger py-2 small mb-3" />
          ) : null}

          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                <span className="badge text-bg-secondary fs-6">
                  Total considerado: {total}
                </span>
                <span className="text-muted small">
                  Top {stats?.limit ?? 10} en cada ranking.
                </span>
              </div>

              <div className="row g-4">
                <div className="col-12 col-lg-4">
                  <h6 className="text-uppercase text-muted small fw-semibold border-bottom pb-2 mb-3">
                    <i className="bi bi-flag-fill me-2" aria-hidden />
                    Banderas más infractoras
                  </h6>
                  {statsLoading && !stats ? (
                    <div className="d-flex align-items-center gap-2 text-muted">
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden
                      />
                      <span>Cargando…</span>
                    </div>
                  ) : (
                    <StatsTable
                      rows={topFlags}
                      total={total}
                      valueLabel="Bandera"
                      emptyLabel="Aún no hay multas registradas con bandera."
                    />
                  )}
                </div>

                <div className="col-12 col-lg-4">
                  <h6 className="text-uppercase text-muted small fw-semibold border-bottom pb-2 mb-3">
                    <i className="bi bi-receipt me-2" aria-hidden />
                    Multas más colocadas (por artículo)
                  </h6>
                  {statsLoading && !stats ? (
                    <div className="d-flex align-items-center gap-2 text-muted">
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden
                      />
                      <span>Cargando…</span>
                    </div>
                  ) : (
                    <StatsTable
                      rows={topArticles}
                      total={total}
                      valueLabel="Artículo"
                      emptyLabel="Aún no hay multas registradas."
                    />
                  )}
                </div>

                <div className="col-12 col-lg-4">
                  <h6 className="text-uppercase text-muted small fw-semibold border-bottom pb-2 mb-3">
                    <i className="bi bi-person-badge me-2" aria-hidden />
                    Titulares más infractores (DNI / Pasaporte)
                  </h6>
                  {statsLoading && !stats ? (
                    <div className="d-flex align-items-center gap-2 text-muted">
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden
                      />
                      <span>Cargando…</span>
                    </div>
                  ) : (
                    <StatsTable
                      rows={topOwners}
                      total={total}
                      valueLabel="DNI / Pasaporte"
                      emptyLabel="Aún no hay multas registradas con titular."
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
