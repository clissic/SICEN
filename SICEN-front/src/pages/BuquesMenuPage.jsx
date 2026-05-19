import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { vesselsStats } from "../api/client.js";
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

export function BuquesMenuPage() {
  const { user } = useAuth();
  const canDeleteShip =
    user?.role === "admin" || user?.role === "superAdmin";

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsErr, setStatsErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    setStatsErr("");
    vesselsStats()
      .then((data) => {
        if (cancelled) return;
        setStats(data?.stats ?? null);
      })
      .catch((e) => {
        if (!cancelled) {
          setStatsErr(
            e.message || "No se pudieron cargar las estadísticas de buques."
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

  const mercantileChartRows = useMemo(() => {
    const arr = Array.isArray(stats?.mercantileByShipType)
      ? stats.mercantileByShipType
      : [];
    return arr.map((r) => ({
      label: String(r.shipType ?? ""),
      count: Number(r.count) || 0,
    }));
  }, [stats?.mercantileByShipType]);

  const sportChartRows = useMemo(() => {
    const arr = Array.isArray(stats?.sportByShipType)
      ? stats.sportByShipType
      : [];
    return arr.map((r) => ({
      label: String(r.shipType ?? ""),
      count: Number(r.count) || 0,
    }));
  }, [stats?.sportByShipType]);

  function statValue(n) {
    if (statsLoading) return "…";
    if (statsErr) return "—";
    return n;
  }

  const mercantileTotal =
    (stats?.ultramar ?? 0) + (stats?.cabotaje ?? 0);
  const mercantileEmptyMsg =
    mercantileTotal === 0
      ? "No hay buques de ultramar ni cabotaje registrados."
      : "No hay tipos de buque mercante para mostrar.";

  const sportEmptyMsg =
    (stats?.sportTotal ?? 0) === 0
      ? "No hay buques deportivos registrados."
      : "No hay tipos de embarcación deportiva para mostrar.";

  const commercialCounters = [
    { label: "Ultramar", value: stats?.ultramar },
    { label: "Cabotaje", value: stats?.cabotaje },
    { label: "Pesqueros", value: stats?.pesqueros },
    { label: "Pesca artesanal", value: stats?.pescaArtesanal },
  ];

  const sportDocCounters = [
    {
      label: "Certificados de Construcción",
      value: stats?.sportCertificadoConstruccion,
    },
    {
      label: "Registro de Embarcaciones Deportivas",
      value: stats?.sportRegistroEmbarcacionesDeportivas,
    },
    {
      label: "Certificados de Cabotaje",
      value: stats?.sportMatriculaCabotaje,
    },
    { label: "Extranjeras", value: stats?.sportExtranjero },
  ];

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Gestión de buques</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/home">
            Menú principal
          </Link>
        </div>

        <div
          className={`row row-cols-1 g-3 ${
            canDeleteShip ? "row-cols-md-4" : "row-cols-md-3"
          }`}
        >
          <div className="col">
            <Link className="text-decoration-none" to="/base-buques/nuevo">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/shipCreate.jpg"
                  alt="Crear buque"
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
                      <div className="fw-semibold text-body">CREAR</div>
                      <div className="text-muted small">Dar de alta un buque mercante o deportivo.</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/base-buques/todos">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/shipRead.jpg"
                  alt="Consultar buques"
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
                      <div className="fw-semibold text-body">CONSULTAR</div>
                      <div className="text-muted small">Buscar buques y administrar certificados.</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <div className="col">
            <Link className="text-decoration-none" to="/base-buques/editar">
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/shipUpdate.jpg"
                  alt="Modificar buque"
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
                      <div className="fw-semibold text-body">MODIFICAR</div>
                      <div className="text-muted small">Buscar buques y editar datos.</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          {canDeleteShip ? (
          <div className="col">
            <Link className="text-decoration-none" to="/base-buques/eliminar">
              <div className="card h-100 shadow-sm border-danger">
                <img
                  src="/img/shipDelete.jpg"
                  alt="Borrar buque"
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
                      <div className="fw-semibold text-danger">BORRAR BUQUE</div>
                      <div className="text-muted small">Eliminar buque de la base de datos.</div>
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
          <div className="col-12 col-lg-6 d-flex flex-column gap-3">
            <div className="row g-3 align-items-stretch">
              <div className="col-12 col-md-6 d-flex">
                <div className="card shadow-sm w-100">
                  <div className="card-body text-center py-4 d-flex flex-column justify-content-center">
                    <div className="fw-semibold text-body mb-3">Buques comerciales registrados</div>
                    <div className="fw-semibold text-body" style={STAT_REGISTERED_NUMBER_STYLE}>
                      {statValue(stats?.commercialTotal)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 d-flex flex-column gap-3">
                <div className="card shadow-sm flex-fill d-flex flex-column min-h-0">
                  <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                    <div className="fw-semibold text-body small text-start mb-0">
                      Ultramar
                    </div>
                    <div
                      className="fw-semibold text-body text-end flex-shrink-0"
                      style={STAT_STACK_NUMBER_STYLE}
                    >
                      {statValue(stats?.ultramar)}
                    </div>
                  </div>
                </div>
                <div className="card shadow-sm flex-fill d-flex flex-column min-h-0">
                  <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                    <div className="fw-semibold text-body small text-start mb-0">
                      Cabotaje
                    </div>
                    <div
                      className="fw-semibold text-body text-end flex-shrink-0"
                      style={STAT_STACK_NUMBER_STYLE}
                    >
                      {statValue(stats?.cabotaje)}
                    </div>
                  </div>
                </div>
                <div className="card shadow-sm flex-fill d-flex flex-column min-h-0">
                  <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                    <div className="fw-semibold text-body small text-start mb-0">
                      Pesqueros
                    </div>
                    <div
                      className="fw-semibold text-body text-end flex-shrink-0"
                      style={STAT_STACK_NUMBER_STYLE}
                    >
                      {statValue(stats?.pesqueros)}
                    </div>
                  </div>
                </div>
                <div className="card shadow-sm flex-fill d-flex flex-column min-h-0">
                  <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                    <div className="fw-semibold text-body small text-start mb-0">
                      Pesca artesanal
                    </div>
                    <div
                      className="fw-semibold text-body text-end flex-shrink-0"
                      style={STAT_STACK_NUMBER_STYLE}
                    >
                      {statValue(stats?.pescaArtesanal)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="row g-3 align-items-stretch">
              <div className="col-12 col-md-6 d-flex">
                <div className="card shadow-sm w-100">
                  <div className="card-body text-center py-4 d-flex flex-column justify-content-center">
                    <div className="fw-semibold text-body mb-3">
                      Buques deportivos registrados
                    </div>
                    <div
                      className="fw-semibold text-body"
                      style={STAT_REGISTERED_NUMBER_STYLE}
                    >
                      {statValue(stats?.sportTotal)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 d-flex flex-column gap-3">
                {sportDocCounters.map((item) => (
                  <div
                    key={item.label}
                    className="card shadow-sm flex-fill d-flex flex-column min-h-0"
                  >
                    <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-2">
                      <div className="fw-semibold text-body small text-start mb-0">
                        {item.label}
                      </div>
                      <div
                        className="fw-semibold text-body text-end flex-shrink-0"
                        style={STAT_STACK_NUMBER_STYLE}
                      >
                        {statValue(item.value)}
                      </div>
                    </div>
                  </div>
                ))}
                {(stats?.sportOtherDocType ?? 0) > 0 ? (
                  <div className="card shadow-sm flex-fill d-flex flex-column min-h-0">
                    <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                      <div className="fw-semibold text-muted small text-start mb-0">
                        Otra documentación
                      </div>
                      <div
                        className="fw-semibold text-muted text-end flex-shrink-0"
                        style={STAT_STACK_NUMBER_STYLE}
                      >
                        {statValue(stats.sportOtherDocType)}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6 d-flex flex-column gap-3">
            <div className="card shadow-sm">
              <div className="card-header fw-semibold py-2 small border-bottom">
                Buques por tonelaje (Ultramar y Cabotaje)
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm table-striped mb-0">
                    <thead>
                      <tr>
                        <th scope="col">Rango TRB</th>
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
                        <>
                          {(Array.isArray(stats?.byTonnage) ? stats.byTonnage : []).map(
                            (row) => (
                              <tr key={row.label}>
                                <td>{row.label}</td>
                                <td
                                  className="text-end fw-semibold text-body align-middle"
                                  style={ROLE_TABLE_NUMBER_STYLE}
                                >
                                  {row.count ?? 0}
                                </td>
                              </tr>
                            ),
                          )}
                          {(stats?.withoutTonnage ?? 0) > 0 ? (
                            <tr>
                              <td className="text-muted">Sin TRB indicado</td>
                              <td
                                className="text-end fw-semibold text-muted align-middle"
                                style={ROLE_TABLE_NUMBER_STYLE}
                              >
                                {stats.withoutTonnage}
                              </td>
                            </tr>
                          ) : null}
                          {(stats?.overTonnageRange ?? 0) > 0 ? (
                            <tr>
                              <td className="text-muted">Más de 50 000 TRB</td>
                              <td
                                className="text-end fw-semibold text-muted align-middle"
                                style={ROLE_TABLE_NUMBER_STYLE}
                              >
                                {stats.overTonnageRange}
                              </td>
                            </tr>
                          ) : null}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="card shadow-sm">
              <div className="card-header fw-semibold py-2 small border-bottom">
                Buques por tonelaje (Deportivos)
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm table-striped mb-0">
                    <thead>
                      <tr>
                        <th scope="col">Rango TRB</th>
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
                        <>
                          {(Array.isArray(stats?.sportByTonnage)
                            ? stats.sportByTonnage
                            : []
                          ).map((row) => (
                            <tr key={row.label}>
                              <td>{row.label}</td>
                              <td
                                className="text-end fw-semibold text-body align-middle"
                                style={ROLE_TABLE_NUMBER_STYLE}
                              >
                                {row.count ?? 0}
                              </td>
                            </tr>
                          ))}
                          {(stats?.sportWithoutTonnage ?? 0) > 0 ? (
                            <tr>
                              <td className="text-muted">Sin TRB indicado</td>
                              <td
                                className="text-end fw-semibold text-muted align-middle"
                                style={ROLE_TABLE_NUMBER_STYLE}
                              >
                                {stats.sportWithoutTonnage}
                              </td>
                            </tr>
                          ) : null}
                        </>
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
                Tipos de buque mercante (ultramar y cabotaje)
              </div>
              <div className="card-body d-flex flex-column p-3">
                <p className="text-muted small mb-3">
                  Distribución según el tipo indicado en el alta (mismos textos que el desplegable de
                  información general).
                </p>
                <VesselShipTypeBarChart
                  rows={mercantileChartRows}
                  loading={statsLoading}
                  error={!!statsErr}
                  emptyMessage={mercantileEmptyMsg}
                />
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-header fw-semibold py-2 small border-bottom">
                Tipos de embarcación deportiva
              </div>
              <div className="card-body d-flex flex-column p-3">
                <p className="text-muted small mb-3">
                  Solo buques con categoría Deportivo; etiquetas alineadas al desplegable de tipos
                  deportivos.
                </p>
                <VesselShipTypeBarChart
                  rows={sportChartRows}
                  loading={statsLoading}
                  error={!!statsErr}
                  emptyMessage={sportEmptyMsg}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
