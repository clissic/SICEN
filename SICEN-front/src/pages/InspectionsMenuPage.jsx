import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  vesselInspectionYears,
  vesselInspectionsStats,
} from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import { VesselShipTypeBarChart } from "../components/VesselShipTypeBarChart.jsx";
import {
  currentExerciseYear,
  getActiveInspectionYear,
  setActiveInspectionYear,
} from "../utils/inspectionExercise.js";

const ICON_TILE = { fontSize: "0.95rem", marginTop: "0.15rem" };

const STAT_BIG_NUMBER_STYLE = { fontSize: "3.75rem", lineHeight: 1 };

const STAT_STACK_NUMBER_STYLE = {
  fontSize: "clamp(1.5rem, 4.5vmin, 2.4rem)",
  lineHeight: 1,
};

function formatInt(n) {
  if (!Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString("es-UY", { maximumFractionDigits: 0 });
}

function formatPct(n) {
  if (!Number.isFinite(Number(n))) return "—";
  return `${Number(n).toLocaleString("es-UY", { maximumFractionDigits: 1 })}%`;
}

function formatDecimal(n) {
  if (!Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString("es-UY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function inspectorFullName(insp) {
  const rank = String(insp?.rank ?? "").trim();
  const first = String(insp?.firstName ?? "").trim();
  const last = String(insp?.lastName ?? "").trim();
  const name = [first, last].filter(Boolean).join(" ");
  if (rank && name) return `${rank} ${name}`;
  return name || rank || insp?.email || "—";
}

/**
 * Combina los años traídos del backend con el actual y el almacenado para
 * asegurar que el desplegable siempre tenga al menos una opción válida y que
 * el año seleccionado por el usuario nunca quede "huérfano" del listado.
 */
function buildYearOptions(serverYears, storedYear) {
  const set = new Set();
  set.add(currentExerciseYear());
  if (Number.isFinite(storedYear) && storedYear > 0) set.add(storedYear);
  for (const y of Array.isArray(serverYears) ? serverYears : []) {
    const n = Number(y);
    if (Number.isFinite(n) && n > 0) set.add(n);
  }
  return Array.from(set).sort((a, b) => b - a);
}

export function InspectionsMenuPage() {
  const [yearOptions, setYearOptions] = useState(() =>
    buildYearOptions([], getActiveInspectionYear())
  );
  const [selectedYear, setSelectedYear] = useState(
    () => getActiveInspectionYear() ?? currentExerciseYear()
  );
  const [yearsLoading, setYearsLoading] = useState(true);
  const [yearsError, setYearsError] = useState("");

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setYearsLoading(true);
    setYearsError("");
    vesselInspectionYears()
      .then((data) => {
        if (cancelled) return;
        const stored = getActiveInspectionYear();
        const options = buildYearOptions(data?.years, stored);
        setYearOptions(options);
        const next =
          stored && options.includes(stored)
            ? stored
            : options[0] ?? currentExerciseYear();
        setSelectedYear(next);
        if (next !== stored) setActiveInspectionYear(next);
      })
      .catch((e) => {
        if (cancelled) return;
        setYearsError(
          e?.message || "No se pudieron cargar los años de inspecciones."
        );
      })
      .finally(() => {
        if (!cancelled) setYearsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!Number.isFinite(selectedYear) || selectedYear <= 0) return;
    let cancelled = false;
    setStatsLoading(true);
    setStatsError("");
    vesselInspectionsStats(selectedYear)
      .then((data) => {
        if (cancelled) return;
        setStats(data?.stats ?? null);
      })
      .catch((e) => {
        if (cancelled) return;
        setStatsError(
          e?.message || "No se pudieron cargar las estadísticas de inspecciones."
        );
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  function handleYearChange(e) {
    const next = Number(e.target.value);
    if (!Number.isFinite(next) || next <= 0) return;
    setSelectedYear(next);
    setActiveInspectionYear(next);
  }

  function statValue(value, formatter = formatInt) {
    if (statsLoading) return "…";
    if (statsError) return "—";
    return formatter(value);
  }

  const byPriority = stats?.byPriority || {};
  const p1 = byPriority.p1 || {};
  const p2 = byPriority.p2 || {};
  const noPriority = byPriority.noPriority || {};
  const byInspector = Array.isArray(stats?.byInspector)
    ? stats.byInspector
    : [];
  const topPorts = Array.isArray(stats?.topPorts) ? stats.topPorts : [];
  const topDeficiencies = Array.isArray(stats?.topDeficiencies)
    ? stats.topDeficiencies
    : [];

  const topInspectorsP1Rows = useMemo(() => {
    return [...byInspector]
      .filter((insp) => Number(insp?.countP1) > 0)
      .sort((a, b) => Number(b.countP1 || 0) - Number(a.countP1 || 0))
      .slice(0, 5)
      .map((insp) => ({
        label: inspectorFullName(insp),
        count: Number(insp.countP1 || 0),
      }));
  }, [byInspector]);

  /* El número grande "Inspecciones realizadas" se contabiliza sólo sobre
     buques con prioridad CIALA (P1 + P2). Los registros "Sin prioridad" se
     muestran en la tabla de detalle pero quedan fuera del KPI principal
     porque no son el objetivo del control del Estado Rector de Puertos. */
  const priorityInspections =
    Number(p1.inspections || 0) + Number(p2.inspections || 0);
  const priorityArrivals =
    Number(p1.arrivals || 0) + Number(p2.arrivals || 0);

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="m-0">Inspecciones</h3>
            <p className="text-muted small mb-0 mt-1">
              Registro de inspecciones a buques en puertos nacionales.
            </p>
          </div>
          <Link
            className="btn btn-outline-secondary btn-sm"
            to="/estado-rector-puertos"
          >
            Estado Rector de Puertos
          </Link>
        </div>

        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3 align-items-stretch">
          <div className="col">
            <div className="card h-100 shadow-sm border-secondary-subtle">
              <img
                src="/img/calendarERP.jpg"
                alt="Ejercicio anual de inspecciones"
                className="card-img-top"
                loading="lazy"
              />
              <div className="card-body">
                <div className="d-flex align-items-start gap-2">
                  <i
                    className="menu-tile-icon bi bi-calendar-check me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                    style={ICON_TILE}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-grow-1">
                    <label
                      htmlFor="inspections-active-year"
                      className="form-label fw-semibold text-body mb-1"
                    >
                      EJERCICIO ACTUAL
                    </label>
                    <select
                      id="inspections-active-year"
                      className="form-select form-select-sm"
                      value={selectedYear}
                      onChange={handleYearChange}
                      disabled={yearsLoading}
                      aria-label="Seleccionar ejercicio anual de inspecciones"
                    >
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                          {y === currentExerciseYear() ? " (en curso)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col">
            <Link
              className="text-decoration-none"
              to="/estado-rector-puertos/inspecciones/nueva"
            >
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/createInspection.jpg"
                  alt="Ingresar inspección"
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
                      <div className="fw-semibold text-body">
                        REGISTRO DE INGRESOS
                      </div>
                      <div className="text-muted small">
                        Registro de ingreso de buque a puerto nacional previo
                        a inspección.
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
              to="/estado-rector-puertos/inspecciones/modificar"
            >
              <div className="card h-100 shadow-sm">
                <img
                  src="/img/readInspection.jpg"
                  alt="Modificar inspección"
                  className="card-img-top"
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className="menu-tile-icon bi bi-pencil me-1 px-2 py-1 border border-secondary rounded-1 bg-secondary text-white flex-shrink-0"
                      style={ICON_TILE}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <div className="fw-semibold text-body">
                        REGISTRO DE INSPECCIONES
                      </div>
                      <div className="text-muted small">
                        Ingreso y modificación de inspecciones a buques
                        ingresados.
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
              to="/estado-rector-puertos/inspecciones/eliminar"
            >
              <div className="card h-100 shadow-sm border-danger">
                <img
                  src="/img/deleteInspection.jpg"
                  alt="Eliminar inspección"
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
                      <div className="fw-semibold text-danger">ELIMINAR</div>
                      <div className="text-muted small">
                        Borrar una inspección de la base de datos.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="d-flex align-items-end justify-content-between flex-wrap gap-2 mt-4 mb-3">
          <div>
            <h4 className="m-0">Estadísticas del ejercicio {selectedYear}</h4>
            <div className="text-muted small">
              Se contabilizan únicamente inspecciones con fecha de ingreso en
              el ejercicio seleccionado.
            </div>
          </div>
        </div>

        {statsError ? (
          <div className="alert alert-warning py-2 small mb-3">
            {statsError}
          </div>
        ) : null}

        <div className="row g-3 align-items-stretch">
          <div className="col-12 col-lg-6">
            <div className="row g-3 align-items-stretch">
              <div className="col-12 col-md-6 d-flex">
                <div className="card shadow-sm w-100">
                  <div className="card-body text-center py-4 d-flex flex-column justify-content-center">
                    <div className="fw-semibold text-body mb-3">
                      Inspecciones realizadas
                    </div>
                    <div
                      className="fw-semibold text-body"
                      style={STAT_BIG_NUMBER_STYLE}
                    >
                      {statValue(priorityInspections)}
                    </div>
                    <div className="text-muted small mt-2">
                      sobre {statValue(priorityArrivals)} ingresos Prioridad
                      1 y 2 a nivel nacional
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 d-flex flex-column gap-3 h-100">
                <div className="card shadow-sm flex-fill d-flex flex-column min-h-0">
                  <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                    <div className="fw-semibold text-body small text-start mb-0">
                      Prioridad 1
                    </div>
                    <div
                      className="fw-semibold text-body text-end flex-shrink-0"
                      style={STAT_STACK_NUMBER_STYLE}
                    >
                      {statValue(p1.inspections)}
                    </div>
                  </div>
                </div>
                <div className="card shadow-sm flex-fill d-flex flex-column min-h-0">
                  <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                    <div className="fw-semibold text-body small text-start mb-0">
                      Prioridad 2
                    </div>
                    <div
                      className="fw-semibold text-body text-end flex-shrink-0"
                      style={STAT_STACK_NUMBER_STYLE}
                    >
                      {statValue(p2.inspections)}
                    </div>
                  </div>
                </div>
                <div className="card shadow-sm flex-fill d-flex flex-column min-h-0">
                  <div className="card-body py-2 py-md-3 px-3 flex-grow-1 d-flex align-items-center justify-content-between gap-3">
                    <div className="fw-semibold text-body small text-start mb-0">
                      % Deficientes P1
                      <span className="d-block text-muted fw-normal">
                        sobre {statValue(p1.arrivals)} ingresos P1
                      </span>
                    </div>
                    <div
                      className="fw-semibold text-body text-end flex-shrink-0"
                      style={STAT_STACK_NUMBER_STYLE}
                    >
                      {statValue(p1.deficientPct, formatPct)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-header fw-semibold py-2 small border-bottom">
                Detalle por prioridad CIALA
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th scope="col">Prioridad</th>
                        <th scope="col" className="text-end">
                          Ingresos
                        </th>
                        <th scope="col" className="text-end">
                          Inspecciones
                        </th>
                        <th scope="col" className="text-end">
                          Deficientes
                        </th>
                        <th scope="col" className="text-end">
                          % Deficientes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          key: "noPriority",
                          label: "Sin prioridad",
                          bucket: noPriority,
                        },
                        { key: "p1", label: "Prioridad 1", bucket: p1 },
                        { key: "p2", label: "Prioridad 2", bucket: p2 },
                      ].map(({ key, label, bucket }) => (
                        <tr key={key}>
                          <td>{label}</td>
                          <td className="text-end">
                            {statValue(bucket.arrivals)}
                          </td>
                          <td className="text-end">
                            {statValue(bucket.inspections)}
                          </td>
                          <td className="text-end">
                            {statValue(bucket.deficient)}
                          </td>
                          <td className="text-end">
                            {statValue(bucket.deficientPct, formatPct)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3 mt-1">
          <div className="col-12 col-lg-4">
            <div className="card shadow-sm h-100">
              <div className="card-header fw-semibold py-2 small border-bottom">
                Resumen de deficiencias
              </div>
              <div className="card-body">
                <div className="row text-center g-3">
                  <div className="col-6">
                    <div className="text-muted small">Detectadas</div>
                    <div
                      className="fw-semibold text-body"
                      style={STAT_STACK_NUMBER_STYLE}
                    >
                      {statValue(stats?.totalDeficiencies)}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">Promedio / insp.</div>
                    <div
                      className="fw-semibold text-body"
                      style={STAT_STACK_NUMBER_STYLE}
                    >
                      {statValue(
                        stats?.avgDeficienciesPerInspection,
                        formatDecimal
                      )}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">Con deficiencias</div>
                    <div
                      className="fw-semibold text-body"
                      style={STAT_STACK_NUMBER_STYLE}
                    >
                      {statValue(stats?.inspectionsWithDeficiencies)}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">
                      Con deficiencias IGS
                    </div>
                    <div
                      className="fw-semibold text-body"
                      style={STAT_STACK_NUMBER_STYLE}
                    >
                      {statValue(stats?.inspectionsWithIsm)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="card shadow-sm h-100">
              <div className="card-header fw-semibold py-2 small border-bottom">
                Top puertos por cobertura P1
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm table-striped mb-0 align-middle">
                    <thead>
                      <tr>
                        <th scope="col">Puerto</th>
                        <th scope="col" className="text-end">
                          Ingresos P1
                        </th>
                        <th scope="col" className="text-end">
                          Insp. P1
                        </th>
                        <th scope="col" className="text-end">
                          % Cobertura
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsLoading ? (
                        <tr>
                          <td colSpan={4} className="text-muted text-center py-3">
                            Cargando…
                          </td>
                        </tr>
                      ) : statsError || topPorts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-muted text-center py-3">
                            Sin ingresos Prioridad 1 registrados
                          </td>
                        </tr>
                      ) : (
                        topPorts.map((row) => (
                          <tr key={row.port}>
                            <td className="text-break">{row.port}</td>
                            <td className="text-end">
                              {formatInt(row.p1Arrivals)}
                            </td>
                            <td className="text-end">
                              {formatInt(row.p1Inspections)}
                            </td>
                            <td className="text-end fw-semibold">
                              {formatPct(row.p1CoveragePct)}
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

          <div className="col-12 col-lg-4">
            <div className="card shadow-sm h-100">
              <div className="card-header fw-semibold py-2 small border-bottom">
                Top deficiencias por código
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm table-striped mb-0">
                    <thead>
                      <tr>
                        <th scope="col">Código</th>
                        <th scope="col" className="text-end">
                          Frecuencia
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
                      ) : statsError || topDeficiencies.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="text-muted text-center py-3">
                            Sin datos
                          </td>
                        </tr>
                      ) : (
                        topDeficiencies.map((row) => (
                          <tr key={row.code}>
                            <td className="text-break">{row.code}</td>
                            <td className="text-end fw-semibold">
                              {formatInt(row.count)}
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
                Inspecciones por inspector (OSERP activos)
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm table-striped mb-0 align-middle">
                    <thead>
                      <tr>
                        <th scope="col">Inspector</th>
                        <th scope="col" className="text-end">
                          Prioridad 1
                        </th>
                        <th scope="col" className="text-end">
                          Prioridad 2
                        </th>
                        <th scope="col" className="text-end">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsLoading ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="text-muted text-center py-3"
                          >
                            Cargando…
                          </td>
                        </tr>
                      ) : statsError ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="text-muted text-center py-3"
                          >
                            —
                          </td>
                        </tr>
                      ) : byInspector.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="text-muted text-center py-3"
                          >
                            No hay inspectores con el state "Oficial Supervisor
                            por el Estado Rector de Puertos" activo.
                          </td>
                        </tr>
                      ) : (
                        byInspector.map((insp) => (
                          <tr key={insp.email || inspectorFullName(insp)}>
                            <td>
                              <div className="fw-semibold text-body">
                                {inspectorFullName(insp)}
                              </div>
                              <div className="text-muted small">
                                {insp.email}
                              </div>
                            </td>
                            <td className="text-end">
                              {formatInt(insp.countP1)}
                            </td>
                            <td className="text-end">
                              {formatInt(insp.countP2)}
                            </td>
                            <td className="text-end fw-semibold text-body">
                              {formatInt(insp.count)}
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

          <div className="col-12 col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-header fw-semibold py-2 small border-bottom">
                Top 5 inspectores con más inspecciones Prioridad 1
              </div>
              <div className="card-body d-flex flex-column p-3">
                <p className="text-muted small mb-3">
                  Ranking de inspectores OSERP activos según la cantidad de
                  inspecciones Prioridad 1 que realizaron en el ejercicio.
                </p>
                <VesselShipTypeBarChart
                  rows={topInspectorsP1Rows}
                  loading={statsLoading}
                  error={!!statsError}
                  emptyMessage="No hay inspecciones Prioridad 1 registradas en el ejercicio."
                  datasetLabel="Inspecciones P1"
                  tooltipSingular="inspección"
                  tooltipPlural="inspecciones"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
