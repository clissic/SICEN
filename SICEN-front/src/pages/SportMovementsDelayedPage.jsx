import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  closeSportMovement,
  sportMovementsClosed,
  sportMovementsDelayed,
} from "../api/client.js";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";
import { SportMovementCloseModal } from "../components/SportMovementCloseModal.jsx";
import { SportMovementSkipperContactModal } from "../components/SportMovementSkipperContactModal.jsx";
import { SportMovementTrackingPanel } from "../components/SportMovementTrackingPanel.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const MENU = "/mi-unidad/areas/movimientos-deportivos";
const PAGE_SIZE = 10;

function formatDateTime(iso) {
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

function outcomeBadge(outcome) {
  if (outcome === "maritimeIncident") {
    return <span className="badge text-bg-dark">Siniestrado</span>;
  }
  return <span className="badge text-bg-success">Arribado</span>;
}

function PaginationBar({
  totalDocs,
  page,
  totalPages,
  loading,
  onPrev,
  onNext,
}) {
  return (
    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
      <span className="small text-muted">
        Total <strong>{totalDocs}</strong> · Pág. {page} / {totalPages}
      </span>
      <div className="btn-group btn-group-sm">
        <button
          type="button"
          className="btn btn-outline-secondary"
          disabled={page <= 1 || loading}
          onClick={onPrev}
        >
          Anterior
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          disabled={page >= totalPages || loading}
          onClick={onNext}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

export function SportMovementsDelayedPage() {
  const { user } = useAuth();
  const userUnit = String(user?.unit || "")
    .trim()
    .toUpperCase();
  const [docs, setDocs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotalDocs, setHistoryTotalDocs] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyErr, setHistoryErr] = useState("");

  const [closing, setClosing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [skipperMovement, setSkipperMovement] = useState(null);
  const [trackingMovement, setTrackingMovement] = useState(null);

  const loadDelayed = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError("");
    try {
      const data = await sportMovementsDelayed({
        page: pageNum,
        limit: PAGE_SIZE,
      });
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
  }, []);

  const loadHistory = useCallback(async (pageNum = 1) => {
    setHistoryLoading(true);
    setHistoryErr("");
    try {
      const data = await sportMovementsClosed({
        page: pageNum,
        limit: PAGE_SIZE,
        onlyDelayed: true,
      });
      setHistory(Array.isArray(data?.docs) ? data.docs : []);
      setHistoryPage(Number(data?.page) || 1);
      setHistoryTotalPages(Number(data?.totalPages) || 1);
      setHistoryTotalDocs(Number(data?.totalDocs) || 0);
    } catch (e) {
      setHistoryErr(
        e?.message || "No se pudo cargar el historial de demorados."
      );
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDelayed(1);
    loadHistory(1);
  }, [loadDelayed, loadHistory]);

  async function handleCloseSubmit(payload) {
    if (!closing?._id) return;
    setSaving(true);
    try {
      const data = await closeSportMovement(closing._id, payload);
      setClosing(null);
      await Swal.fire({
        icon: "success",
        title: "Caso cerrado",
        text: data?.msg || "El movimiento quedó en el historial de demorados.",
        timer: 2200,
        showConfirmButton: false,
      });
      await Promise.all([loadDelayed(page), loadHistory(1)]);
    } catch (e) {
      throw e;
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="m-0">Demorados</h3>
            <p className="text-muted small mb-0 mt-1">
              Movimientos con ETA vencida y historial de casos resueltos.
            </p>
          </div>
          <Link className="btn btn-outline-secondary btn-sm" to={MENU}>
            Volver
          </Link>
        </div>

        <h5 className="h6 text-muted text-uppercase mb-2">
          Demorados pendientes
        </h5>
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
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-muted small">
                        No hay movimientos demorados pendientes.
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
                        <td className="small">{formatDateTime(m.eta)}</td>
                        <td>
                          <span className="badge text-bg-danger">Demorado</span>
                          {(m.tracking?.communicationState === "no_signal_5" ||
                            m.tracking?.communicationState === "no_signal_3") ? (
                            <span className="badge text-bg-danger ms-1">
                              Sin señal 5m
                            </span>
                          ) : null}
                        </td>
                        <td className="text-end text-nowrap">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-1"
                            data-sicen-popover="Ver seguimiento GPS"
                            aria-label="Ver seguimiento GPS"
                            onClick={() => setTrackingMovement(m)}
                          >
                            <i className="bi bi-geo-alt" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary me-1"
                            data-sicen-popover="Contacto del patrón"
                            aria-label="Contacto del patrón"
                            onClick={() => setSkipperMovement(m)}
                          >
                            <i className="bi bi-person-lines-fill" aria-hidden />
                          </button>
                          {userUnit &&
                          userUnit ===
                            String(m.destinationUnit || "")
                              .trim()
                              .toUpperCase() ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              data-sicen-popover="Cerrar caso"
                              aria-label="Cerrar caso"
                              onClick={() => setClosing(m)}
                            >
                              <i className="bi bi-flag" aria-hidden />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar
              totalDocs={totalDocs}
              page={page}
              totalPages={totalPages}
              loading={loading}
              onPrev={() => loadDelayed(page - 1)}
              onNext={() => loadDelayed(page + 1)}
            />
          </>
        )}

        <h5 className="h6 text-muted text-uppercase mb-2 mt-4">
          Historial de demorados resueltos
        </h5>
        {historyErr ? (
          <ErrorAlert message={historyErr} />
        ) : null}
        {historyLoading ? (
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
                    <th>Resuelto</th>
                    <th>Condición</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-muted small">
                        No hay demorados resueltos en el historial.
                      </td>
                    </tr>
                  ) : (
                    history.map((m) => (
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
                        <td className="small">{formatDateTime(m.eta)}</td>
                        <td className="small">
                          {formatDateTime(m.closedAt)}
                        </td>
                        <td>{outcomeBadge(m.closureOutcome)}</td>
                        <td
                          className="small text-break"
                          style={{ maxWidth: "14rem" }}
                        >
                          {m.closureNotes?.trim() || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar
              totalDocs={historyTotalDocs}
              page={historyPage}
              totalPages={historyTotalPages}
              loading={historyLoading}
              onPrev={() => loadHistory(historyPage - 1)}
              onNext={() => loadHistory(historyPage + 1)}
            />
          </>
        )}
      </div>

      <SportMovementCloseModal
        open={Boolean(closing)}
        movement={closing}
        saving={saving}
        onClose={() => {
          if (!saving) setClosing(null);
        }}
        onSubmit={handleCloseSubmit}
      />

      <SportMovementSkipperContactModal
        open={Boolean(skipperMovement)}
        movement={skipperMovement}
        onClose={() => setSkipperMovement(null)}
      />

      <SportMovementTrackingPanel
        open={Boolean(trackingMovement)}
        movement={trackingMovement}
        onClose={() => setTrackingMovement(null)}
      />
    </Layout>
  );
}
