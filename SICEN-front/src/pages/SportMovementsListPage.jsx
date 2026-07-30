import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";

const MENU = "/mi-unidad/areas/movimientos-deportivos";
const PAGE_SIZE = 10;

function formatEta(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Listado de solo lectura para ARRIBOS o DEMORADOS.
 */
export function SportMovementsListPage({
  title,
  subtitle,
  emptyMessage,
  fetchPage,
  badgeLabel,
  badgeClass = "text-bg-info",
}) {
  const [docs, setDocs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchPage({ page: pageNum, limit: PAGE_SIZE });
        setDocs(Array.isArray(data?.docs) ? data.docs : []);
        setPage(Number(data?.page) || 1);
        setTotalPages(Number(data?.totalPages) || 1);
        setTotalDocs(Number(data?.totalDocs) || 0);
      } catch (e) {
        setError(e?.message || "No se pudo cargar el listado.");
        setDocs([]);
      } finally {
        setLoading(false);
      }
    },
    [fetchPage]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="m-0">{title}</h3>
            <p className="text-muted small mb-0 mt-1">{subtitle}</p>
          </div>
          <Link className="btn btn-outline-secondary btn-sm" to={MENU}>
            Volver
          </Link>
        </div>

        <ErrorAlert message={error} />
        {loading ? (
          <p className="text-muted">Cargando…</p>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle">
                <thead>
                  <tr>
                    <th>Buque</th>
                    <th>Desde</th>
                    <th>Puerto destino</th>
                    <th>Patrón</th>
                    <th>ETA</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-muted small">
                        {emptyMessage}
                      </td>
                    </tr>
                  ) : (
                    docs.map((m) => (
                      <tr key={m._id}>
                        <td>
                          <div className="fw-semibold">
                            {m.vesselSnapshot?.name || "—"}
                          </div>
                          <div className="small text-muted">
                            {m.vesselSnapshot?.nationalRegistryNumber || "—"}
                          </div>
                        </td>
                        <td>
                          <div>{m.originUnit || "—"}</div>
                          <div className="small text-muted">
                            {m.departurePort || ""}
                          </div>
                        </td>
                        <td>{m.destinationPort || "—"}</td>
                        <td className="small">
                          {m.skipper?.fullName || "—"}
                        </td>
                        <td className="small">{formatEta(m.eta)}</td>
                        <td>
                          <span className={`badge ${badgeClass}`}>
                            {badgeLabel}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <span className="small text-muted">
                Total <strong>{totalDocs}</strong> · Pág. {page} / {totalPages}
              </span>
              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => load(page - 1)}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={page >= totalPages || loading}
                  onClick={() => load(page + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
