import { useEffect, useState } from "react";
import { ErrorAlert } from "../ErrorAlert.jsx";
import "../../styles/seafarer-consult-sections.css";

/**
 * @param {object} props
 * @param {string} props.title
 * @param {(page: number, q: string) => Promise<{ items: any[], total: number, totalPages: number, page: number, pageSize: number }>} props.fetchPage
 * @param {React.ReactNode} props.tableHead
 * @param {(row: object, i: number) => React.ReactNode} props.renderRow
 * @param {string} props.addLabel
 * @param {() => void} props.onAddClick
 * @param {number} props.refreshKey
 * @param {string} [props.blockId]
 */
export function SeafarerMetadataListBlock({
  title,
  blockId = "metadata-list",
  fetchPage,
  tableHead,
  renderRow,
  addLabel,
  onAddClick,
  refreshKey,
}) {
  const [inputQ, setInputQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setErr("");
    setLoading(true);
    fetchPage(page, appliedQ)
      .then((d) => {
        if (!cancelled) setPayload(d);
      })
      .catch((e) => {
        if (!cancelled) {
          setPayload(null);
          setErr(e.message || e.data?.msg || "Error al cargar los datos.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, appliedQ, refreshKey, fetchPage]);

  function applyFilter() {
    setAppliedQ(String(inputQ).trim());
    setPage(1);
  }

  const items = payload?.items ?? [];
  const totalPages = Math.max(1, payload?.totalPages ?? 1);
  const total = payload?.total ?? 0;
  const currentPage = payload?.page ?? page;

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-body">
        <h5 className="card-title mb-3">{title}</h5>
        <div className="row g-2 align-items-end mb-3">
          <div className="col">
            <label className="form-label small mb-1" htmlFor={`${blockId}-kw`}>
              Buscar por palabras clave
            </label>
            <input
              id={`${blockId}-kw`}
              type="search"
              className="form-control form-control-sm"
              placeholder="Nombre, documento, código…"
              value={inputQ}
              onChange={(e) => setInputQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFilter();
                }
              }}
            />
          </div>
          <div className="col-auto">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={applyFilter}
              disabled={loading}
            >
              Filtrar
            </button>
          </div>
        </div>

        <ErrorAlert message={err} className="alert alert-danger py-2 small mb-3" />

        <div className="table-responsive">
          <table className="table table-sm table-bordered mb-0 seafarer-consult-table">
            <thead>{tableHead}</thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={99} className="text-center py-3 text-muted">
                    Cargando…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr className="seafarer-consult-table-empty">
                  <td colSpan={99} className="text-center py-3">
                    No hay registros para mostrar.
                  </td>
                </tr>
              ) : (
                items.map((row, i) => renderRow(row, i))
              )}
            </tbody>
          </table>
        </div>

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
          <div className="text-muted small">
            {total === 0
              ? "Sin resultados"
              : `Página ${currentPage} de ${totalPages} · ${total} registro${total !== 1 ? "s" : ""}`}
          </div>
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={loading || currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={loading || currentPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>

        <div className="mt-3">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onAddClick}
          >
            {addLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
