import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  closeSportMovement,
  sportMovementsArrivals,
  sportMovementsClosed,
} from "../api/client.js";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";
import { SportMovementCloseModal } from "../components/SportMovementCloseModal.jsx";
import { SportMovementSkipperContactModal } from "../components/SportMovementSkipperContactModal.jsx";

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

export function SportMovementsArrivalsPage() {
  const [transit, setTransit] = useState([]);
  const [transitPage, setTransitPage] = useState(1);
  const [transitTotalPages, setTransitTotalPages] = useState(1);
  const [transitTotalDocs, setTransitTotalDocs] = useState(0);
  const [transitLoading, setTransitLoading] = useState(true);
  const [transitErr, setTransitErr] = useState("");

  const [arrived, setArrived] = useState([]);
  const [arrivedPage, setArrivedPage] = useState(1);
  const [arrivedTotalPages, setArrivedTotalPages] = useState(1);
  const [arrivedTotalDocs, setArrivedTotalDocs] = useState(0);
  const [arrivedLoading, setArrivedLoading] = useState(true);
  const [arrivedErr, setArrivedErr] = useState("");

  const [confirming, setConfirming] = useState(null);
  const [saving, setSaving] = useState(false);
  const [skipperMovement, setSkipperMovement] = useState(null);

  const loadTransit = useCallback(async (pageNum = 1) => {
    setTransitLoading(true);
    setTransitErr("");
    try {
      const data = await sportMovementsArrivals({
        page: pageNum,
        limit: PAGE_SIZE,
      });
      setTransit(Array.isArray(data?.docs) ? data.docs : []);
      setTransitPage(Number(data?.page) || 1);
      setTransitTotalPages(Number(data?.totalPages) || 1);
      setTransitTotalDocs(Number(data?.totalDocs) || 0);
    } catch (e) {
      setTransitErr(e?.message || "No se pudieron cargar los arribos.");
      setTransit([]);
    } finally {
      setTransitLoading(false);
    }
  }, []);

  const loadArrived = useCallback(async (pageNum = 1) => {
    setArrivedLoading(true);
    setArrivedErr("");
    try {
      const data = await sportMovementsClosed({
        page: pageNum,
        limit: PAGE_SIZE,
      });
      setArrived(Array.isArray(data?.docs) ? data.docs : []);
      setArrivedPage(Number(data?.page) || 1);
      setArrivedTotalPages(Number(data?.totalPages) || 1);
      setArrivedTotalDocs(Number(data?.totalDocs) || 0);
    } catch (e) {
      setArrivedErr(
        e?.message || "No se pudieron cargar los buques arribados."
      );
      setArrived([]);
    } finally {
      setArrivedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransit(1);
    loadArrived(1);
  }, [loadTransit, loadArrived]);

  async function handleConfirmArrival(payload) {
    if (!confirming?._id) return;
    setSaving(true);
    try {
      const data = await closeSportMovement(confirming._id, {
        ...payload,
        outcome: "arrived",
      });
      setConfirming(null);
      await Swal.fire({
        icon: "success",
        title: "Arribo confirmado",
        text: data?.msg || "El buque quedó registrado como arribado.",
        timer: 2000,
        showConfirmButton: false,
      });
      await Promise.all([
        loadTransit(transitPage),
        loadArrived(1),
      ]);
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
            <h3 className="m-0">Arribos</h3>
            <p className="text-muted small mb-0 mt-1">
              Buques en tránsito esperados y casos cerrados hacia esta
              prefectura.
            </p>
          </div>
          <Link className="btn btn-outline-secondary btn-sm" to={MENU}>
            Volver
          </Link>
        </div>

        <h5 className="h6 text-muted text-uppercase mb-2">
          Buques en tránsito
        </h5>
        {transitErr ? (
          <ErrorAlert message={transitErr} />
        ) : null}
        {transitLoading ? (
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
                  {transit.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-muted small">
                        No hay arribos esperados en este momento.
                      </td>
                    </tr>
                  ) : (
                    transit.map((m) => (
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
                          <span className="badge text-bg-info">Esperado</span>
                        </td>
                        <td className="text-end text-nowrap">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary me-1"
                            data-sicen-popover="Contacto del patrón"
                            aria-label="Contacto del patrón"
                            onClick={() => setSkipperMovement(m)}
                          >
                            <i className="bi bi-person-lines-fill" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            data-sicen-popover="Confirmar arribo"
                            aria-label="Confirmar arribo"
                            onClick={() => setConfirming(m)}
                          >
                            <i className="bi bi-check-circle" aria-hidden />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar
              totalDocs={transitTotalDocs}
              page={transitPage}
              totalPages={transitTotalPages}
              loading={transitLoading}
              onPrev={() => loadTransit(transitPage - 1)}
              onNext={() => loadTransit(transitPage + 1)}
            />
          </>
        )}

        <h5 className="h6 text-muted text-uppercase mb-2 mt-4">
          Buques arribados
        </h5>
        {arrivedErr ? (
          <ErrorAlert message={arrivedErr} />
        ) : null}
        {arrivedLoading ? (
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
                    <th>Cerrado</th>
                    <th>Detalle</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {arrived.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-muted small">
                        No hay buques arribados registrados.
                      </td>
                    </tr>
                  ) : (
                    arrived.map((m) => (
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
              totalDocs={arrivedTotalDocs}
              page={arrivedPage}
              totalPages={arrivedTotalPages}
              loading={arrivedLoading}
              onPrev={() => loadArrived(arrivedPage - 1)}
              onNext={() => loadArrived(arrivedPage + 1)}
            />
          </>
        )}
      </div>

      <SportMovementCloseModal
        open={Boolean(confirming)}
        movement={confirming}
        mode="confirmArrival"
        saving={saving}
        onClose={() => {
          if (!saving) setConfirming(null);
        }}
        onSubmit={handleConfirmArrival}
      />

      <SportMovementSkipperContactModal
        open={Boolean(skipperMovement)}
        movement={skipperMovement}
        onClose={() => setSkipperMovement(null)}
      />
    </Layout>
  );
}
