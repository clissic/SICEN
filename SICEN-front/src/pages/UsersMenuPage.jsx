import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usersGetAll } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import { UsersRankBarChart } from "../components/UsersRankBarChart.jsx";
import { UsersUnitBarChart } from "../components/UsersUnitBarChart.jsx";
import { summarizeUsersByHierarchy, summarizeUsersByRank } from "../constants/ranks.js";
import { summarizeUsersByRole, summarizeUsersByUnit } from "../constants/userAggregates.js";

const STAT_NUMBER_STYLE = { fontSize: "5rem", lineHeight: 1 };

const STAT_REGISTERED_NUMBER_STYLE = { fontSize: "6rem", lineHeight: 1 };

/** Números en las tres tarjetas apiladas (comparten alto con «Usuarios registrados»). */
const STAT_STACK_NUMBER_STYLE = {
  fontSize: "clamp(1.5rem, 4.5vmin, 2.85rem)",
  lineHeight: 1,
};

const ROLE_TABLE_NUMBER_STYLE = { fontSize: "2rem", lineHeight: 1 };

export function UsersMenuPage() {
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsErr, setStatsErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    setStatsErr("");
    usersGetAll()
      .then((data) => {
        if (cancelled) return;
        const users = Array.isArray(data?.payload) ? data.payload : [];
        setStats({
          ...summarizeUsersByRank(users),
          hierarchy: summarizeUsersByHierarchy(users),
          byUnit: summarizeUsersByUnit(users),
          byRole: summarizeUsersByRole(users),
        });
      })
      .catch((e) => {
        if (!cancelled) setStatsErr(e.message || "No se pudieron cargar las estadísticas.");
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
    return n;
  }

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Gestión de usuarios</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/home">
            Menú principal
          </Link>
        </div>

        <div className="row row-cols-1 row-cols-md-4 g-3">
          <div className="col">
            <Link className="text-decoration-none" to="/usuarios/nuevo">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/createUser.jpg"
                  alt="Crear usuario"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="fw-semibold text-body">Crear</div>
                  <div className="text-muted small">Alta de usuario.</div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/usuarios/todos">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/readUser.jpg"
                  alt="Consultar usuarios"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="fw-semibold text-body">Consultar</div>
                  <div className="text-muted small">Listado paginado.</div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/usuarios/editar">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/updateUser.jpg"
                  alt="Modificar usuario"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="fw-semibold text-body">Modificar</div>
                  <div className="text-muted small">Buscar y editar.</div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/usuarios/eliminar">
              <div className="card h-100 shadow-sm border-danger">
                <img
                  src="/img/deleteUser.jpg"
                  alt="Borrar usuario"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-trash3 me-1 px-2 py-1 border border-danger rounded-1 bg-danger text-white flex-shrink-0"
                      style={{ fontSize: "0.95rem", marginTop: "0.15rem" }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-danger">
                        BORRAR USUARIO
                      </div>
                      <div className="text-muted small">Eliminar usuario.</div>
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
          <div className="col-12 col-lg-6">
            <div className="row g-3 align-items-stretch">
              <div className="col-12 col-md-6 d-flex">
                <div className="card shadow-sm w-100">
                  <div className="card-body text-center py-4 d-flex flex-column justify-content-center">
                    <div className="fw-semibold text-body mb-3">Usuarios registrados</div>
                    <div className="fw-semibold text-body" style={STAT_REGISTERED_NUMBER_STYLE}>
                      {statValue(stats?.total)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 d-flex flex-column gap-3 h-100">
                <div className="card shadow-sm flex-fill d-flex flex-column min-h-0">
                  <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                    <div className="fw-semibold text-body small text-start mb-0">
                      Oficiales
                    </div>
                    <div
                      className="fw-semibold text-body text-end flex-shrink-0"
                      style={STAT_STACK_NUMBER_STYLE}
                    >
                      {statValue(stats?.officers)}
                    </div>
                  </div>
                </div>
                <div className="card shadow-sm flex-fill d-flex flex-column min-h-0">
                  <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                    <div className="fw-semibold text-body small text-start mb-0">
                      Subalternos
                    </div>
                    <div
                      className="fw-semibold text-body text-end flex-shrink-0"
                      style={STAT_STACK_NUMBER_STYLE}
                    >
                      {statValue(stats?.subaltern)}
                    </div>
                  </div>
                </div>
                <div className="card shadow-sm flex-fill d-flex flex-column min-h-0">
                  <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                    <div className="fw-semibold text-body small text-start mb-0">
                      Civiles
                    </div>
                    <div
                      className="fw-semibold text-body text-end flex-shrink-0"
                      style={STAT_STACK_NUMBER_STYLE}
                    >
                      {statValue(stats?.civil)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-header fw-semibold py-2 small border-bottom">
                Usuarios por rol
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm table-striped mb-0">
                    <thead>
                      <tr>
                        <th scope="col">Rol</th>
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
                      ) : stats?.byRole?.length ? (
                        stats.byRole.map((row) => (
                          <tr key={row.key}>
                            <td>{row.label}</td>
                            <td
                              className="text-end fw-semibold text-body align-middle"
                              style={ROLE_TABLE_NUMBER_STYLE}
                            >
                              {row.count}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="text-muted text-center py-3">
                            No hay datos.
                          </td>
                        </tr>
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
                Usuarios por unidad
              </div>
              <div className="card-body d-flex flex-column p-3">
                <UsersUnitBarChart
                  byUnit={stats?.byUnit}
                  loading={statsLoading}
                  error={!!statsErr}
                />
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-header fw-semibold py-2 small border-bottom">
                Usuarios por jerarquía
              </div>
              <div className="card-body d-flex flex-column p-3">
                <UsersRankBarChart
                  hierarchy={stats?.hierarchy}
                  loading={statsLoading}
                  error={!!statsErr}
                />
              </div>
            </div>
          </div>
        </div>

        {!statsLoading && !statsErr && stats && stats.other > 0 ? (
          <div className="row mt-3">
            <div className="col-12">
              <div className="card h-100 shadow-sm border-secondary">
                <div className="card-body text-center py-4">
                  <div className="fw-semibold text-muted mb-3">Sin clasificar</div>
                  <div className="fw-semibold text-muted" style={STAT_NUMBER_STYLE}>
                    {stats.other}
                  </div>
                  <div className="text-muted small mt-3 px-md-5">
                    Usuario
                    {stats.other === 1 ? "" : "s"} con grado no listado en las
                    categorías anteriores.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
