import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { seafarersStats } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Layout } from "../components/Layout.jsx";
import { VesselShipTypeBarChart } from "../components/VesselShipTypeBarChart.jsx";

const ICON_TILE = { fontSize: "0.95rem", marginTop: "0.15rem" };

const STAT_REGISTERED_NUMBER_STYLE = { fontSize: "6rem", lineHeight: 1 };

const STAT_STACK_NUMBER_STYLE = {
  fontSize: "clamp(1.5rem, 4.5vmin, 2.85rem)",
  lineHeight: 1,
};

const ROLE_TABLE_NUMBER_STYLE = { fontSize: "2rem", lineHeight: 1 };

export function GenteMarMenuPage() {
  const { user } = useAuth();
  const canDelete =
    user?.role === "admin" || user?.role === "superAdmin";

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsErr, setStatsErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    setStatsErr("");
    seafarersStats()
      .then((data) => {
        if (cancelled) return;
        setStats(data?.stats ?? null);
      })
      .catch((e) => {
        if (!cancelled) {
          setStatsErr(
            e.message ||
              "No se pudieron cargar las estadísticas de gente de mar.",
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

  const nationalityChartRows = useMemo(() => {
    const arr = Array.isArray(stats?.byNationality) ? stats.byNationality : [];
    return arr.map((r) => ({
      label: String(r.nationality ?? ""),
      count: Number(r.count) || 0,
    }));
  }, [stats?.byNationality]);

  const genderChartRows = useMemo(() => {
    const arr = Array.isArray(stats?.byGender) ? stats.byGender : [];
    return arr.map((r) => ({
      label: String(r.gender ?? ""),
      count: Number(r.count) || 0,
    }));
  }, [stats?.byGender]);

  function statValue(n) {
    if (statsLoading) return "…";
    if (statsErr) return "—";
    return n;
  }

  const nationalityEmptyMsg =
    (stats?.total ?? 0) === 0
      ? "No hay personas registradas en la base."
      : "No hay nacionalidades para mostrar.";

  const genderEmptyMsg =
    (stats?.total ?? 0) === 0
      ? "No hay personas registradas en la base."
      : "No hay datos de género para mostrar.";

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Gestión de gente de mar / nautas deportivos</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/home">
            Menú principal
          </Link>
        </div>

        <div
          className={`row row-cols-1 g-3 ${
            canDelete ? "row-cols-md-4" : "row-cols-md-3"
          }`}
        >
          <div className="col">
            <Link className="text-decoration-none" to="/base-gente-mar/nuevo">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/seamanCreate.jpg"
                  alt="Crear registro de gente de mar"
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
                      <div className="fw-semibold text-body">INGRESAR PERSONA</div>
                      <div className="text-muted small">
                        Dar de alta un registro en la base de gente de mar.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/base-gente-mar/todos">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/seamanRead.jpg"
                  alt="Consultar gente de mar"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-list-ul me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-body">
                        CONSULTAR Y MODIFICAR
                      </div>
                      <div className="text-muted small">
                        Buscar persona y asignar/actualizar, embarques, cursos,
                        capacitaciones y/o sanciones.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/base-gente-mar/editar">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/seamanUpdate.jpg"
                  alt="Modificar gente de mar"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-pencil-square me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-body">METADATOS</div>
                      <div className="text-muted small">
                        Crear, consultar, modificar y borrar metadatos de cursos,
                        capacitaciones y/o sanciones.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          {canDelete ? (
            <div className="col">
              <Link
                className="text-decoration-none"
                to="/base-gente-mar/eliminar"
              >
                <div className="card h-100 shadow-sm border-danger">
                  <img
                    src="/img/seamanDelete.jpg"
                    alt="Eliminar registro de gente de mar"
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
                        <div className="fw-semibold text-danger">
                          ELIMINAR REGISTRO
                        </div>
                        <div className="text-muted small">
                          Eliminar un registro de la base de datos.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ) : null}
        </div>

        <h4 className="mt-4 mb-3">Estadísticas</h4>
        {statsErr ? (
          <div className="alert alert-warning py-2">{statsErr}</div>
        ) : null}

        <div className="row g-3 align-items-stretch">
          <div className="col-12 col-lg-6">
            <div className="row g-3 align-items-stretch">
              <div className="col-12 col-md-6 d-flex">
                <div className="card shadow-sm w-100">
                  <div className="card-body text-center py-4 d-flex flex-column justify-content-center">
                    <div className="fw-semibold text-body mb-3">
                      Personas registradas
                    </div>
                    <div
                      className="fw-semibold text-body"
                      style={STAT_REGISTERED_NUMBER_STYLE}
                    >
                      {statValue(stats?.total)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 d-flex flex-column gap-3 h-100">
                <div className="card shadow-sm flex-fill d-flex flex-column min-h-0">
                  <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                    <div className="fw-semibold text-body small text-start mb-0">
                      Activas
                    </div>
                    <div
                      className="fw-semibold text-body text-end flex-shrink-0"
                      style={STAT_STACK_NUMBER_STYLE}
                    >
                      {statValue(stats?.active)}
                    </div>
                  </div>
                </div>
                <div className="card shadow-sm flex-fill d-flex flex-column min-h-0">
                  <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                    <div className="fw-semibold text-body small text-start mb-0">
                      Inhabilitadas
                    </div>
                    <div
                      className="fw-semibold text-body text-end flex-shrink-0"
                      style={STAT_STACK_NUMBER_STYLE}
                    >
                      {statValue(stats?.disqualified)}
                    </div>
                  </div>
                </div>
                <div className="card shadow-sm flex-fill d-flex flex-column min-h-0">
                  <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                    <div className="fw-semibold text-body small text-start mb-0">
                      Fallecidas
                    </div>
                    <div
                      className="fw-semibold text-body text-end flex-shrink-0"
                      style={STAT_STACK_NUMBER_STYLE}
                    >
                      {statValue(stats?.deceased)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-header fw-semibold py-2 small border-bottom">
                Personas por habilitación deportiva
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm table-striped mb-0">
                    <thead>
                      <tr>
                        <th scope="col">Habilitación</th>
                        <th scope="col" className="text-end">
                          Cantidad
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsLoading ? (
                        <tr>
                          <td colSpan={2} className="text-muted text-center py-3">
                            Cargando…
                          </td>
                        </tr>
                      ) : statsErr ? (
                        <tr>
                          <td colSpan={2} className="text-muted text-center py-3">
                            —
                          </td>
                        </tr>
                      ) : (
                        (Array.isArray(stats?.bySportBrevet)
                          ? stats.bySportBrevet
                          : []
                        ).map((row) => (
                          <tr key={row.category ?? row.label}>
                            <td>{row.label}</td>
                            <td
                              className="text-end fw-semibold text-body align-middle"
                              style={ROLE_TABLE_NUMBER_STYLE}
                            >
                              {row.count ?? 0}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3 mt-1">
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-header fw-semibold py-2 small border-bottom">
                Personas por nacionalidad
              </div>
              <div className="card-body d-flex flex-column p-3">
                <p className="text-muted small mb-3">
                  Distribución según la nacionalidad indicada en el alta de datos
                  personales.
                </p>
                <VesselShipTypeBarChart
                  rows={nationalityChartRows}
                  loading={statsLoading}
                  error={!!statsErr}
                  emptyMessage={nationalityEmptyMsg}
                  datasetLabel="Personas"
                  tooltipSingular="persona"
                  tooltipPlural="personas"
                />
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-header fw-semibold py-2 small border-bottom">
                Personas por género
              </div>
              <div className="card-body d-flex flex-column p-3">
                <p className="text-muted small mb-3">
                  Valores alineados al desplegable de género del formulario de alta.
                </p>
                <VesselShipTypeBarChart
                  rows={genderChartRows}
                  loading={statsLoading}
                  error={!!statsErr}
                  emptyMessage={genderEmptyMsg}
                  datasetLabel="Personas"
                  tooltipSingular="persona"
                  tooltipPlural="personas"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
