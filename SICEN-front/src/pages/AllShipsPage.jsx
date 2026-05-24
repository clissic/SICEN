import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  deleteVessel,
  vesselsAllPaginated,
  vesselsPaginated,
} from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import {
  confirmDelete,
  escapeHtml,
  notifyDeleteError,
  notifyDeleteSuccess,
} from "../utils/confirmDelete.js";
import { preventNegativeNumberKeys } from "../utils/nonNegativeNumberInput.js";

const FILTER_TYPE_OPTIONS = [
  { value: "", label: "Seleccione…" },
  { value: "Ultramar", label: "Ultramar" },
  { value: "Cabotaje", label: "Cabotaje" },
  { value: "Deportivo", label: "Deportivo" },
];

const DEPORTIVO_DOC_SEARCH_OPTIONS = [
  { value: "", label: "Seleccione…" },
  {
    value: "Certificado de Construcción",
    label: "Certificado de Construcción",
  },
  {
    value: "Registro de Embarcaciones Deportivas",
    label: "Registro de Embarcaciones Deportivas",
  },
  { value: "Matrícula de Cabotaje", label: "Matrícula de Cabotaje" },
  { value: "Extranjero", label: "Extranjero" },
];

export function AllShipsPage() {
  const { pathname } = useLocation();
  const pathNorm = pathname.replace(/\/+$/, "");
  const isDeleteFlow = pathNorm === "/base-buques/eliminar";
  const isModifyFlow = pathNorm === "/base-buques/editar";

  const [filterType, setFilterType] = useState("");
  const [imoInput, setImoInput] = useState("");
  const [matriculaInput, setMatriculaInput] = useState("");
  const [portInput, setPortInput] = useState("");
  const [deportivoDocType, setDeportivoDocType] = useState("");

  /** Snapshot de criterios aplicados con «Buscar» (null = aún no se buscó). */
  const [activeQuery, setActiveQuery] = useState(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [refetchNonce, setRefetchNonce] = useState(0);
  const [deletingKey, setDeletingKey] = useState(null);

  const isUltramar = filterType === "Ultramar";
  const isCabotaje = filterType === "Cabotaje";
  const isDeportivo = filterType === "Deportivo";

  useEffect(() => {
    let cancelled = false;
    setErr("");
    setLoading(true);

    let request;
    if (activeQuery) {
      const params = {
        currentPage: page,
        pageSize: 10,
        vesselType: activeQuery.vesselType,
      };
      if (activeQuery.vesselType === "Ultramar") {
        params.imoNumber = activeQuery.imoNumber;
      } else if (activeQuery.vesselType === "Deportivo") {
        params.nationalRegistryNumber = activeQuery.nationalRegistryNumber;
        params.portOfRegistry = activeQuery.portOfRegistry;
        params.recreationalDocType = activeQuery.recreationalDocType;
      } else {
        params.nationalRegistryNumber = activeQuery.nationalRegistryNumber;
        params.portOfRegistry = activeQuery.portOfRegistry;
      }
      request = vesselsPaginated(params);
    } else {
      request = vesselsAllPaginated({ currentPage: page, pageSize: 10 });
    }

    request
      .then((r) => {
        if (!cancelled) setData(r.payload);
      })
      .catch((e) => {
        if (!cancelled) {
          setData(null);
          setErr(e.message || e.data?.msg || "Error al consultar buques.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, activeQuery, refetchNonce]);

  async function handleDeleteRow(r) {
    const vesselKey = r.id ?? r._id;
    if (!vesselKey) return;
    const name = String(r.name ?? "").trim();
    const regNumber = String(r.regNumber ?? r.reg_number ?? "").trim();
    const flagState = String(r.flagState ?? r.flag_state ?? "").trim();
    const confirm = await confirmDelete({
      resource: "buque",
      summaryHtml: `
        <p class="mb-2">Se eliminará permanentemente el buque:</p>
        <ul class="mb-2 ps-3">
          <li><strong>${escapeHtml(name || "—")}</strong></li>
          ${regNumber ? `<li class="small">Matrícula: ${escapeHtml(regNumber)}</li>` : ""}
          ${flagState ? `<li class="small">Bandera: ${escapeHtml(flagState)}</li>` : ""}
        </ul>
      `,
      extraNote: "Se borrarán también todos sus datos asociados en esta base.",
    });
    if (!confirm.isConfirmed) return;

    const keyStr = String(vesselKey);
    setDeletingKey(keyStr);
    try {
      await deleteVessel(keyStr);
      await notifyDeleteSuccess("El buque se eliminó correctamente.");
      setRefetchNonce((n) => n + 1);
    } catch (ex) {
      await notifyDeleteError(ex, "Ocurrió un error al eliminar el buque.");
    } finally {
      setDeletingKey(null);
    }
  }

  function onFilterTypeChange(e) {
    const v = e.target.value;
    setFilterType(v);
    setImoInput("");
    setMatriculaInput("");
    setPortInput("");
    setDeportivoDocType("");
    setActiveQuery(null);
    setData(null);
    setErr("");
    setPage(1);
  }

  function onPortChange(e) {
    setPortInput(e.target.value.toUpperCase());
  }

  function handleSearch(e) {
    e.preventDefault();
    setErr("");
    if (!filterType) {
      setErr("Seleccione Ultramar, Cabotaje o Deportivo.");
      return;
    }
    if (isUltramar) {
      const imo = String(imoInput).trim();
      if (!imo) {
        setErr("Ingrese el número OMI.");
        return;
      }
      setActiveQuery({ vesselType: "Ultramar", imoNumber: imo });
    } else if (isCabotaje) {
      const mat = String(matriculaInput).trim();
      const port = String(portInput).trim().toUpperCase();
      if (!port) {
        setErr("Ingrese el puerto de matrícula.");
        return;
      }
      if (!mat) {
        setErr("Ingrese la matrícula nacional.");
        return;
      }
      setActiveQuery({
        vesselType: "Cabotaje",
        nationalRegistryNumber: mat,
        portOfRegistry: port,
      });
    } else if (isDeportivo) {
      if (!deportivoDocType) {
        setErr("Seleccione el tipo de documentación.");
        return;
      }
      const port = String(portInput).trim().toUpperCase();
      if (!port) {
        setErr("Ingrese el puerto de matrícula.");
        return;
      }
      const mat = String(matriculaInput).trim();
      if (!mat) {
        setErr("Ingrese el número de matrícula.");
        return;
      }
      setActiveQuery({
        vesselType: "Deportivo",
        recreationalDocType: deportivoDocType,
        portOfRegistry: port,
        nationalRegistryNumber: mat,
      });
    }
    setPage(1);
  }

  function handleClear() {
    setFilterType("");
    setImoInput("");
    setMatriculaInput("");
    setPortInput("");
    setDeportivoDocType("");
    setActiveQuery(null);
    setData(null);
    setErr("");
    setPage(1);
  }

  const rows = data?.paginatedVessels ?? [];

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">
            {isDeleteFlow
              ? "Borrar buque"
              : isModifyFlow
                ? "Modificar buque"
                : "Consultar buques"}
          </h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/base-buques">
            Gestión de buques
          </Link>
        </div>

        {err ? <div className="alert alert-danger py-2">{err}</div> : null}

        <form
          className="card shadow-sm mb-3"
          onSubmit={handleSearch}
          noValidate
        >
          <div className="card-header fw-semibold py-2 small">
            Filtros de búsqueda
          </div>
          <div className="card-body py-3">
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-6 col-lg-3">
                <label
                  className="form-label small mb-1"
                  htmlFor="filter-vessel-type"
                >
                  Tipo de buque
                </label>
                <select
                  id="filter-vessel-type"
                  className="form-select"
                  value={filterType}
                  onChange={onFilterTypeChange}
                  aria-label="Tipo de buque: Ultramar, Cabotaje o Deportivo"
                >
                  {FILTER_TYPE_OPTIONS.map((o) => (
                    <option key={o.value || "empty"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {isUltramar ? (
                <div className="col-12 col-md-6 col-lg-3">
                  <label className="form-label small mb-1" htmlFor="filter-imo">
                    Número OMI
                  </label>
                  <input
                    id="filter-imo"
                    type="number"
                    className="form-control"
                    min={0}
                    inputMode="numeric"
                    placeholder="OMI"
                    value={imoInput}
                    onChange={(e) => setImoInput(e.target.value)}
                    onKeyDown={preventNegativeNumberKeys}
                    autoComplete="off"
                  />
                </div>
              ) : null}

              {isCabotaje ? (
                <>
                  <div className="col-12 col-md-6 col-lg-3">
                    <label
                      className="form-label small mb-1"
                      htmlFor="filter-port"
                    >
                      Puerto de matrícula
                    </label>
                    <input
                      id="filter-port"
                      type="text"
                      className="form-control"
                      style={{ textTransform: "uppercase" }}
                      placeholder="PUERTO"
                      value={portInput}
                      onChange={onPortChange}
                      autoComplete="off"
                    />
                  </div>
                  <div className="col-12 col-md-6 col-lg-3">
                    <label
                      className="form-label small mb-1"
                      htmlFor="filter-matricula"
                    >
                      Matrícula nacional
                    </label>
                    <input
                      id="filter-matricula"
                      type="text"
                      className="form-control"
                      inputMode="text"
                      placeholder="Matrícula"
                      value={matriculaInput}
                      onChange={(e) => setMatriculaInput(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </>
              ) : null}

              {isDeportivo ? (
                <>
                  <div className="col-12 col-md-6 col-lg-3">
                    <label
                      className="form-label small mb-1"
                      htmlFor="filter-deportivo-doc-tipo"
                    >
                      Tipo
                    </label>
                    <select
                      id="filter-deportivo-doc-tipo"
                      className="form-select"
                      value={deportivoDocType}
                      onChange={(e) => setDeportivoDocType(e.target.value)}
                      aria-label="Tipo de documentación deportiva"
                    >
                      {DEPORTIVO_DOC_SEARCH_OPTIONS.map((o) => (
                        <option key={o.value || "empty"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6 col-lg-3">
                    <label
                      className="form-label small mb-1"
                      htmlFor="filter-port-deportivo"
                    >
                      Puerto de matrícula
                    </label>
                    <input
                      id="filter-port-deportivo"
                      type="text"
                      className="form-control"
                      style={{ textTransform: "uppercase" }}
                      placeholder="PUERTO"
                      value={portInput}
                      onChange={onPortChange}
                      autoComplete="off"
                    />
                  </div>
                  <div className="col-12 col-md-6 col-lg-3">
                    <label
                      className="form-label small mb-1"
                      htmlFor="filter-matricula-deportivo"
                    >
                      Número de matrícula
                    </label>
                    <input
                      id="filter-matricula-deportivo"
                      type="text"
                      className="form-control"
                      inputMode="text"
                      placeholder="Matrícula"
                      value={matriculaInput}
                      onChange={(e) => setMatriculaInput(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </>
              ) : null}

              <div className="col-12 col-lg-auto d-flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !filterType}
                >
                  Buscar
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleClear}
                  disabled={loading}
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="text-muted small mb-2">
          {activeQuery ? "Resultados del filtro" : "Todos los buques"} · Total{" "}
          <strong>{data?.totalDocs ?? "—"}</strong> · Pág.{" "}
          <strong>{data?.page ?? page}</strong> /{" "}
          <strong>{data?.totalPages ?? "—"}</strong>
          {loading ? <span className="ms-2">Cargando…</span> : null}
        </div>

            <div className="card shadow-sm">
              <div className="table-responsive">
                <table className="table table-sm table-striped mb-0">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Tipo</th>
                      <th>OMI</th>
                      <th>Matrícula</th>
                      <th>Puerto matr.</th>
                      <th>Bandera</th>
                      <th>Tipo buque</th>
                      <th>Propietario</th>
                      <th className="text-end"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const vesselKey = r.id ?? r._id;
                      const actionPath = vesselKey
                        ? isModifyFlow
                          ? `/base-buques/editar/${encodeURIComponent(String(vesselKey))}`
                          : `/base-buques/certificados/${encodeURIComponent(String(vesselKey))}`
                        : isModifyFlow
                          ? "/base-buques/editar"
                          : "/base-buques/todos";
                      const keyStr = vesselKey ? String(vesselKey) : "";
                      return (
                        <tr key={r._id}>
                          <td>{r.name || "—"}</td>
                          <td>{r.vesselType || "—"}</td>
                          <td>{r.imoNumber ?? "—"}</td>
                          <td>{r.nationalRegistryNumber ?? "—"}</td>
                          <td>{r.portOfRegistry || "—"}</td>
                          <td>{r.flagState || "—"}</td>
                          <td className="small text-break">
                            {r.shipType || "—"}
                          </td>
                          <td className="small text-break">
                            {r.owner || "—"}
                          </td>
                          <td className="text-end text-nowrap">
                            {isDeleteFlow ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                disabled={
                                  loading ||
                                  !keyStr ||
                                  deletingKey !== null
                                }
                                onClick={() => handleDeleteRow(r)}
                              >
                                {deletingKey === keyStr
                                  ? "Eliminando…"
                                  : "Eliminar"}
                              </button>
                            ) : (
                              <Link
                                className="btn btn-sm btn-outline-primary"
                                to={actionPath}
                              >
                                {isModifyFlow ? "Modificar" : "Certificados"}
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && !loading ? (
                      <tr>
                        <td colSpan={9} className="text-center text-muted py-4">
                          {activeQuery
                            ? "No hay buques que coincidan con los filtros."
                            : "Aún no hay buques registrados en la base de datos."}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <nav className="mt-3" aria-label="Paginación de buques">
              <ul className="pagination pagination-sm mb-0">
                <li
                  className={`page-item ${!data?.hasPrevPage ? "disabled" : ""}`}
                >
                  <button
                    className="page-link"
                    type="button"
                    onClick={() => setPage(data.prevPage)}
                    disabled={!data?.hasPrevPage || loading}
                  >
                    Anterior
                  </button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link">
                    {data?.page ?? page} / {data?.totalPages ?? "—"}
                  </span>
                </li>
                <li
                  className={`page-item ${!data?.hasNextPage ? "disabled" : ""}`}
                >
                  <button
                    className="page-link"
                    type="button"
                    onClick={() => setPage(data.nextPage)}
                    disabled={!data?.hasNextPage || loading}
                  >
                    Siguiente
                  </button>
                </li>
              </ul>
        </nav>
      </div>
    </Layout>
  );
}
