import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  usersGetAll,
  vesselInspectionsPaginated,
} from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { InspectionCompletionModal } from "../components/InspectionCompletionModal.jsx";
import { InspectorsCell } from "../components/InspectorBadge.jsx";
import { Layout } from "../components/Layout.jsx";
import {
  currentExerciseYear,
  getActiveInspectionYear,
  subscribeActiveInspectionYear,
} from "../utils/inspectionExercise.js";

const PAGE_SIZE = 5;

/**
 * Formatea una fecha del esquema de inspecciones. Las fechas se persisten
 * como UTC midnight (porque `new Date("YYYY-MM-DD")` se interpreta en
 * UTC), así que formateamos también en UTC con `timeZone: "UTC"`. Si no,
 * en zonas como UTC-3 el día se renderiza corrido en un día respecto al
 * valor cargado por el usuario.
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
 * Sugerencia de nombre amigable para el PDF al descargarse. El atributo
 * `download` sólo es honrado por el navegador si el archivo es same-origin
 * (en producción el backend sirve `/uploads/...` desde el mismo dominio).
 */
function inspectionPdfDownloadName(r) {
  const v = r?.vesselId;
  const imo = String(v?.identification?.imoNumber ?? "").trim();
  const name = String(v?.generalInfo?.name ?? "")
    .trim()
    .replace(/\s+/g, "_");
  const date = String(r?.inspectionDate ?? "")
    .slice(0, 10)
    .replace(/-/g, "");
  const parts = ["Inspeccion", imo, name, date].filter(Boolean);
  return parts.length > 0 ? `${parts.join("-")}.pdf` : "Inspeccion.pdf";
}

function priorityBadgeClass(priority) {
  const p = String(priority ?? "").toLowerCase();
  if (p.includes("1")) return "bg-danger-subtle text-danger-emphasis";
  if (p.includes("2")) return "bg-warning-subtle text-warning-emphasis";
  return "bg-secondary-subtle text-secondary-emphasis";
}

function priorityLabel(priority) {
  const p = String(priority ?? "").trim();
  return p || "Sin prioridad";
}


/**
 * Sección reutilizable: input de búsqueda + tabla paginada de registros de
 * `vesselInspections`. Se monta tres veces en la página:
 *
 * 1. `performed=true, mine=true`  → "Mis inspecciones" (realizadas por el usuario).
 * 2. `performed=false`             → "Ingresos sin inspección" (pendientes).
 * 3. `performed=true, mine=false`  → "Todas las inspecciones del sistema".
 *
 * Cuando `performed === false` se omite la columna "Fecha de inspección"
 * (no aplica) y el botón de fila pasa de "Modificar" a "Inspeccionar".
 */
function InspectionsSearchSection({
  title,
  description,
  mine = false,
  performed,
  year,
  emptyMessage,
  variant = "default",
  refetchNonce = 0,
  onPendingClick,
  onModifyClick,
  showInspectors = false,
  usersByEmail,
}) {
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    /* Convención del módulo:
        - `inspectionPerformed: true`  → inspección realizada (lo que se cuenta).
        - `inspectionPerformed: false` → ingreso pendiente (placeholder o
          arribo cargado a la espera de la diligencia).
       Por defecto el endpoint también excluye placeholders sin `arrivalDate`
       (los del alta automática de Ultramar), así que sólo aparecen los
       ingresos con fecha de arribo dentro del año del ejercicio. */
    const params = {
      page,
      limit: PAGE_SIZE,
      inspectionPerformed: performed ? "true" : "false",
    };
    if (Number.isFinite(year) && year > 0) params.year = year;
    if (mine) params.mine = "true";
    if (appliedSearch) params.search = appliedSearch;

    vesselInspectionsPaginated(params)
      .then((r) => {
        if (cancelled) return;
        setData(r ?? null);
      })
      .catch((e) => {
        if (cancelled) return;
        setData(null);
        setError(e?.message || "No se pudieron obtener los registros.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mine, performed, year, page, appliedSearch, refetchNonce]);

  useEffect(() => {
    setPage(1);
  }, [mine, performed, year]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    const next = String(searchInput).trim();
    setAppliedSearch(next);
    setPage(1);
  }

  function handleClear() {
    setSearchInput("");
    setAppliedSearch("");
    setPage(1);
  }

  const rows = Array.isArray(data?.docs) ? data.docs : [];
  const totalDocs = Number(data?.totalDocs ?? 0);
  const totalPages = Number(data?.totalPages ?? 0);
  const currentPage = Number(data?.page ?? page);
  const hasPrev = Boolean(data?.hasPrevPage);
  const hasNext = Boolean(data?.hasNextPage);

  const isPending = performed === false;
  const actionLabel = isPending ? "Inspeccionar" : "Modificar";
  const actionBtnClass = isPending
    ? "btn btn-sm btn-warning"
    : "btn btn-sm btn-outline-primary";
  const sectionClass =
    variant === "warning"
      ? "card shadow-sm mb-4 border-warning"
      : "card shadow-sm mb-4";
  const headerClass =
    variant === "warning"
      ? "card-header py-2 d-flex flex-wrap align-items-center justify-content-between gap-2 bg-warning-subtle"
      : "card-header py-2 d-flex flex-wrap align-items-center justify-content-between gap-2";
  const showInspectorsColumn = !isPending && showInspectors;
  const colCount = isPending ? 5 : showInspectorsColumn ? 8 : 7;

  return (
    <section className={sectionClass}>
      <div className={headerClass}>
        <div>
          <div className="fw-semibold text-body">{title}</div>
          {description ? (
            <div className="text-muted small">{description}</div>
          ) : null}
        </div>
        <div className="text-muted small">
          {loading ? (
            "Cargando…"
          ) : (
            <>
              Total <strong>{totalDocs}</strong> · Pág.{" "}
              <strong>{currentPage || 1}</strong> /{" "}
              <strong>{totalPages || 1}</strong>
            </>
          )}
        </div>
      </div>

      <div className="card-body py-3">
        <form
          className="row g-2 align-items-end mb-3"
          onSubmit={handleSearchSubmit}
          noValidate
        >
          <div className="col-12 col-md-8">
            <label className="form-label small mb-1" htmlFor={`search-${title}`}>
              Buscar por OMI o nombre del buque
            </label>
            <input
              id={`search-${title}`}
              type="text"
              className="form-control"
              placeholder="Ej.: 9876543 o ATLANTIC"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoComplete="off"
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

        {error ? (
          <div className="alert alert-warning py-2 small mb-2">{error}</div>
        ) : null}

        <div className="table-responsive">
          <table className="table table-sm table-striped align-middle mb-0">
            <thead>
              <tr>
                <th scope="col">Buque (OMI — Nombre)</th>
                <th scope="col">Fecha de ingreso</th>
                <th scope="col">Puerto</th>
                <th scope="col">Prioridad CIALA</th>
                {isPending ? null : (
                  <>
                    <th scope="col">Fecha de inspección</th>
                    {showInspectorsColumn ? (
                      <th scope="col">Inspectores</th>
                    ) : null}
                    <th scope="col" className="text-center">
                      PDF
                    </th>
                  </>
                )}
                <th scope="col" className="text-end"> </th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="text-center text-muted py-3">
                    Cargando…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="text-center text-muted py-3">
                    {appliedSearch
                      ? isPending
                        ? "No hay ingresos sin inspección que coincidan con la búsqueda."
                        : "No hay inspecciones realizadas que coincidan con la búsqueda."
                      : emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r._id}>
                    <td className="text-break">{vesselLabel(r.vesselId)}</td>
                    <td>{formatDate(r.arrivalDate)}</td>
                    <td className="text-break">{r.arrivalPort || "—"}</td>
                    <td>
                      <span
                        className={`badge ${priorityBadgeClass(r.cialaPriority)}`}
                      >
                        {priorityLabel(r.cialaPriority)}
                      </span>
                    </td>
                    {isPending ? null : (
                      <>
                        <td>{formatDate(r.inspectionDate)}</td>
                        {showInspectorsColumn ? (
                          <td>
                            <InspectorsCell
                              inspectors={r.inspectors}
                              usersByEmail={usersByEmail}
                            />
                          </td>
                        ) : null}
                        <td className="text-center">
                          {r.inspectionPDF ? (
                            <a
                              href={r.inspectionPDF}
                              download={inspectionPdfDownloadName(r)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="d-inline-flex align-items-center justify-content-center text-decoration-none"
                              style={{ color: "#fd7e14", fontSize: "1.4rem" }}
                              aria-label="Descargar PDF de la inspección"
                              data-sicen-popover="Descargar PDF"
                            >
                              <i className="bi bi-filetype-pdf" aria-hidden />
                            </a>
                          ) : (
                            <span
                              className="d-inline-flex align-items-center justify-content-center text-muted"
                              style={{
                                fontSize: "1.4rem",
                                opacity: 0.35,
                                cursor: "not-allowed",
                              }}
                              aria-disabled="true"
                              data-sicen-popover="Sin PDF cargado"
                            >
                              <i className="bi bi-filetype-pdf" aria-hidden />
                            </span>
                          )}
                        </td>
                      </>
                    )}
                    <td className="text-end text-nowrap">
                      <button
                        type="button"
                        className={actionBtnClass}
                        onClick={() =>
                          isPending
                            ? onPendingClick?.(r)
                            : onModifyClick?.(r)
                        }
                      >
                        {actionLabel}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
      </div>
    </section>
  );
}

export function ConsultInspectionsListPage() {
  const { user } = useAuth();
  const [year, setYear] = useState(
    () => getActiveInspectionYear() ?? currentExerciseYear()
  );
  /* Una sola pieza de estado para el modal: la fila que se está
     editando/completando. `InspectionCompletionModal` deduce del propio
     registro si está en modo creación (ingreso pendiente) o edición
     (inspección realizada) y precarga los campos en consecuencia. */
  const [modalInspection, setModalInspection] = useState(null);
  const [refetchNonce, setRefetchNonce] = useState(0);

  /* Mapa email → user, para resolver los badges de la columna
     "Inspectores" en "Todas las inspecciones del sistema". Se carga una
     sola vez al montar; los datos no cambian con frecuencia. */
  const [usersByEmail, setUsersByEmail] = useState(() => new Map());

  useEffect(() => {
    return subscribeActiveInspectionYear((next) => {
      setYear(next ?? currentExerciseYear());
    });
  }, []);

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
        /* Silencioso: si falla, los badges caen al estado "no encontrado"
           con el email crudo. No bloqueamos el render de la tabla por
           algo opcional como esto. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handlePendingClick(row) {
    setModalInspection(row || null);
  }
  function handleModifyClick(row) {
    setModalInspection(row || null);
  }
  function handleModalClose() {
    setModalInspection(null);
  }
  function handleSaved() {
    /* Al guardar cualquier cambio hay que actualizar las tres secciones:
       - Pasar un ingreso a inspección: "Mis inspecciones" puede sumar la
         fila, "Ingresos sin inspección" la pierde y "Todas" la suma.
       - Modificar una inspección realizada (inspector distinto, deficiencias,
         PDF): puede cambiar de sección si se reasignó al inspector. */
    setRefetchNonce((n) => n + 1);
  }

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="m-0">Consultar y modificar inspecciones</h3>
            <p className="text-muted small mb-0 mt-1">
              Ejercicio en consulta: <strong>{year}</strong>. Tus
              inspecciones, ingresos pendientes y todas las inspecciones del
              sistema en tres listados independientes.
            </p>
          </div>
          <Link
            className="btn btn-outline-secondary btn-sm"
            to="/estado-rector-puertos/inspecciones"
          >
            Volver a Inspecciones
          </Link>
        </div>

        <InspectionsSearchSection
          title="Mis inspecciones"
          description={
            user?.email
              ? `Inspecciones realizadas por ${user.email}.`
              : "Inspecciones realizadas por tu usuario."
          }
          mine
          performed
          year={year}
          emptyMessage="Aún no realizaste inspecciones en este ejercicio."
          refetchNonce={refetchNonce}
          onModifyClick={handleModifyClick}
        />

        <InspectionsSearchSection
          title="Ingresos sin inspección"
          description="Buques que ingresaron a puerto y todavía no fueron inspeccionados. Tomá el registro y completá la diligencia para que pase a inspección realizada."
          performed={false}
          year={year}
          variant="warning"
          emptyMessage="No hay ingresos pendientes de inspección en este ejercicio."
          refetchNonce={refetchNonce}
          onPendingClick={handlePendingClick}
        />

        <InspectionsSearchSection
          title="Todas las inspecciones del sistema"
          description="Inspecciones realizadas por cualquier usuario del sistema."
          performed
          year={year}
          emptyMessage="No hay inspecciones realizadas en este ejercicio."
          refetchNonce={refetchNonce}
          onModifyClick={handleModifyClick}
          showInspectors
          usersByEmail={usersByEmail}
        />

        <InspectionCompletionModal
          open={!!modalInspection}
          inspection={modalInspection}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      </div>
    </Layout>
  );
}
