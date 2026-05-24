import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteVesselInspection,
  usersGetAll,
  vesselInspectionsPaginated,
} from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import {
  InspectorsCell,
  inspectorPlainLabel,
} from "../components/InspectorBadge.jsx";
import {
  confirmDelete,
  escapeHtml,
  notifyDeleteError,
  notifyDeleteSuccess,
} from "../utils/confirmDelete.js";

const PAGE_SIZE = 5;

/**
 * Las fechas viven en Mongo como UTC midnight, así que las formateamos
 * con `timeZone: "UTC"` para que el día mostrado coincida con el día que
 * el usuario cargó originalmente (sin desplazamientos por el huso del
 * navegador).
 */
function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function vesselLabel(v) {
  if (!v || typeof v !== "object") return "—";
  const imo = String(v?.identification?.imoNumber ?? "").trim();
  const name = String(v?.generalInfo?.name ?? "").trim();
  if (imo && name) return `${imo} — ${name}`;
  return name || imo || "—";
}

/**
 * Construye una etiqueta humana ("Rango Apellido, Nombre" separados por
 * "·") para uno o varios inspectores. Sólo se usa en el Swal de
 * confirmación de borrado (HTML plano), donde el badge interactivo no
 * funciona. En la tabla principal se renderiza `InspectorsCell`.
 */
function inspectorsPlainList(emails, byEmail) {
  if (!Array.isArray(emails) || emails.length === 0) return "—";
  return emails
    .map((raw) => {
      const e = String(raw || "").toLowerCase().trim();
      if (!e) return null;
      const u = byEmail.get(e) || null;
      return inspectorPlainLabel(e, u);
    })
    .filter(Boolean)
    .join(" · ");
}

export function DeleteInspectionPage() {
  /* Estado del formulario de búsqueda. Se trabaja con dos estados por filtro:
     el que el usuario edita en el input (`*Input`) y el que efectivamente
     se aplicó al backend (`applied*`), para que la búsqueda no dispare en
     cada tecla y para que `Limpiar` no borre solo lo editado sino también
     el filtro vigente. */
  const [searchInput, setSearchInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedDate, setAppliedDate] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [deletingId, setDeletingId] = useState("");
  const [refetchNonce, setRefetchNonce] = useState(0);

  /* Mapa email → user para resolver el nombre legible de los inspectores.
     Se carga una sola vez al montar; los datos no cambian con frecuencia
     y la lista de usuarios suele ser chica. */
  const [usersByEmail, setUsersByEmail] = useState(() => new Map());

  useEffect(() => {
    let cancelled = false;
    usersGetAll()
      .then((data) => {
        if (cancelled) return;
        const users = Array.isArray(data?.payload) ? data.payload : [];
        const map = new Map();
        for (const u of users) {
          const email = String(u?.email || "").toLowerCase().trim();
          if (!email) continue;
          map.set(email, u);
        }
        setUsersByEmail(map);
      })
      .catch(() => {
        /* Silencioso: si falla, mostramos los emails crudos como fallback.
           El error principal de la página son los registros, no los nombres. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    /* Sólo dispara la búsqueda cuando el usuario apretó "Buscar" al menos
       una vez. Esto evita listar TODAS las inspecciones al entrar (lo cual
       sería contra-intuitivo para una pantalla de eliminación). */
    if (!hasSearched) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    const params = {
      page,
      limit: PAGE_SIZE,
      inspectionPerformed: "true",
    };
    if (appliedSearch) params.search = appliedSearch;
    if (appliedDate) params.inspectionDate = appliedDate;

    vesselInspectionsPaginated(params)
      .then((r) => {
        if (cancelled) return;
        setData(r ?? null);
      })
      .catch((e) => {
        if (cancelled) return;
        setData(null);
        setError(e?.message || "No se pudieron obtener las inspecciones.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, appliedSearch, appliedDate, hasSearched, refetchNonce]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    const nextSearch = String(searchInput).trim();
    const nextDate = String(dateInput).trim();
    setAppliedSearch(nextSearch);
    setAppliedDate(nextDate);
    setPage(1);
    setHasSearched(true);
  }

  function handleClear() {
    setSearchInput("");
    setDateInput("");
    setAppliedSearch("");
    setAppliedDate("");
    setPage(1);
    setHasSearched(false);
    setData(null);
    setError("");
  }

  async function handleDelete(row) {
    if (!row || !row._id) return;
    const label = vesselLabel(row.vesselId);
    const inspector = inspectorsPlainList(row.inspectors, usersByEmail);
    const result = await confirmDelete({
      resource: "inspección",
      summaryHtml: `
        <p class="mb-2">Se eliminará permanentemente la siguiente inspección:</p>
        <ul class="mb-2 ps-3">
          <li>Buque: <strong>${escapeHtml(label)}</strong></li>
          <li>Fecha de inspección: <strong>${escapeHtml(
            formatDate(row.inspectionDate)
          )}</strong></li>
          <li>Puerto: <strong>${escapeHtml(row.arrivalPort || "—")}</strong></li>
          <li>Inspector: <strong>${escapeHtml(inspector)}</strong></li>
        </ul>
      `,
      extraNote: row.inspectionPDF
        ? "También se borrará el PDF de la inspección asociado."
        : undefined,
    });
    if (!result.isConfirmed) return;

    setDeletingId(String(row._id));
    try {
      const data = await deleteVesselInspection(row._id);
      await notifyDeleteSuccess(data?.msg);
      setRefetchNonce((n) => n + 1);
    } catch (e) {
      await notifyDeleteError(e, "No se pudo eliminar la inspección.");
    } finally {
      setDeletingId("");
    }
  }

  const rows = Array.isArray(data?.docs) ? data.docs : [];
  const totalDocs = Number(data?.totalDocs ?? 0);
  const totalPages = Number(data?.totalPages ?? 0);
  const currentPage = Number(data?.page ?? page);
  const hasPrev = Boolean(data?.hasPrevPage);
  const hasNext = Boolean(data?.hasNextPage);

  const hasAnyFilter = Boolean(appliedSearch || appliedDate);
  const filtersSummary = useMemo(() => {
    const parts = [];
    if (appliedSearch) parts.push(`OMI/nombre: "${appliedSearch}"`);
    if (appliedDate) parts.push(`Fecha: ${formatDate(appliedDate)}`);
    return parts.join(" · ");
  }, [appliedSearch, appliedDate]);

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="m-0">Eliminar inspección</h3>
            <p className="text-muted small mb-0 mt-1">
              Buscá una inspección por OMI/nombre del buque o por fecha de
              realización y eliminala del sistema. Podés combinar ambos filtros
              o usar solo uno.
            </p>
          </div>
          <Link
            className="btn btn-outline-secondary btn-sm"
            to="/estado-rector-puertos/inspecciones"
          >
            Volver a Inspecciones
          </Link>
        </div>

        <section className="card shadow-sm mb-4">
          <div className="card-header py-2 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="fw-semibold text-body">Búsqueda de inspecciones</div>
            <div className="text-muted small">
              {hasSearched && !loading ? (
                <>
                  Total <strong>{totalDocs}</strong> · Pág.{" "}
                  <strong>{currentPage || 1}</strong> /{" "}
                  <strong>{totalPages || 1}</strong>
                </>
              ) : null}
            </div>
          </div>

          <div className="card-body py-3">
            <form
              className="row g-2 align-items-end mb-3"
              onSubmit={handleSearchSubmit}
              noValidate
            >
              <div className="col-12 col-md-6">
                <label className="form-label small mb-1" htmlFor="del-search">
                  OMI o nombre del buque{" "}
                  <span className="text-muted">(opcional)</span>
                </label>
                <input
                  id="del-search"
                  type="text"
                  className="form-control"
                  placeholder="Ej.: 9876543 o ATLANTIC"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small mb-1" htmlFor="del-date">
                  Fecha de inspección{" "}
                  <span className="text-muted">(opcional)</span>
                </label>
                <input
                  id="del-date"
                  type="date"
                  className="form-control"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                />
              </div>
              <div className="col-12 col-md-auto d-flex gap-2">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
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
            </form>

            {hasSearched && filtersSummary ? (
              <div className="text-muted small mb-2">
                Filtros aplicados: {filtersSummary}
              </div>
            ) : null}

            {error ? (
              <div className="alert alert-warning py-2 small mb-2">{error}</div>
            ) : null}

            <div className="table-responsive">
              <table className="table table-sm table-striped align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Buque (OMI — Nombre)</th>
                    <th scope="col">Fecha de inspección</th>
                    <th scope="col">Puerto</th>
                    <th scope="col">Inspector</th>
                    <th scope="col" className="text-end"> </th>
                  </tr>
                </thead>
                <tbody>
                  {!hasSearched ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-3">
                        Indicá un OMI/nombre o una fecha de inspección y
                        presioná Buscar para listar las inspecciones.
                      </td>
                    </tr>
                  ) : loading && rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-3">
                        Cargando…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-3">
                        {hasAnyFilter
                          ? "No se encontraron inspecciones con los filtros indicados."
                          : "No hay inspecciones realizadas en el sistema."}
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const isDeleting = deletingId === String(r._id);
                      return (
                        <tr key={r._id}>
                          <td className="text-break">
                            {vesselLabel(r.vesselId)}
                          </td>
                          <td>{formatDate(r.inspectionDate)}</td>
                          <td className="text-break">{r.arrivalPort || "—"}</td>
                          <td>
                            <InspectorsCell
                              inspectors={r.inspectors}
                              usersByEmail={usersByEmail}
                            />
                          </td>
                          <td className="text-end text-nowrap">
                            <button
                              type="button"
                              className="btn btn-sm btn-danger d-inline-flex align-items-center gap-2"
                              onClick={() => handleDelete(r)}
                              disabled={isDeleting || Boolean(deletingId)}
                              aria-busy={isDeleting}
                            >
                              {isDeleting ? (
                                <>
                                  <span
                                    className="spinner-border spinner-border-sm"
                                    role="status"
                                    aria-hidden
                                    style={{
                                      width: "1em",
                                      height: "1em",
                                      borderWidth: "0.15em",
                                    }}
                                  />
                                  <span>Eliminando…</span>
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-trash3" aria-hidden />
                                  <span>Eliminar</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {hasSearched ? (
              <nav
                className="mt-3 d-flex justify-content-end"
                aria-label="Paginación de inspecciones"
              >
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${!hasPrev ? "disabled" : ""}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!hasPrev || loading}
                    >
                      Anterior
                    </button>
                  </li>
                  <li className="page-item disabled">
                    <span className="page-link">
                      {currentPage || 1} / {totalPages || 1}
                    </span>
                  </li>
                  <li className={`page-item ${!hasNext ? "disabled" : ""}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasNext || loading}
                    >
                      Siguiente
                    </button>
                  </li>
                </ul>
              </nav>
            ) : null}
          </div>
        </section>
      </div>
    </Layout>
  );
}
