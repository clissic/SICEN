import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  cancelConfirmedSportMovement,
  checkSportMovementVesselAvailable,
  confirmSportMovement,
  createSportMovement,
  deleteSportMovement,
  renewSportMovement,
  sportMovementsConfirmedDispatches,
  sportMovementsDispatches,
  updateSportMovement,
  vesselsByTypeSearch,
} from "../api/client.js";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";
import { SportMovementCancelConfirmedModal } from "../components/SportMovementCancelConfirmedModal.jsx";
import { SportMovementFormModal } from "../components/SportMovementFormModal.jsx";
import {
  confirmDelete,
  escapeHtml,
  notifyDeleteError,
  notifyDeleteSuccess,
} from "../utils/confirmDelete.js";

const PAGE_SIZE = 10;
const MENU = "/mi-unidad/areas/movimientos-deportivos";
const VESSEL_SEARCH_MIN_CHARS = 2;
const VESSEL_SEARCH_LIMIT = 15;
const VESSEL_SEARCH_DEBOUNCE_MS = 350;

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

function statusBadge(status) {
  if (status === "expired") {
    return <span className="badge text-bg-danger">Vencido</span>;
  }
  return <span className="badge text-bg-warning">En espera</span>;
}

function confirmedBadge(eta) {
  const d = eta ? new Date(eta) : null;
  const delayed = d && Number.isFinite(d.getTime()) && d.getTime() < Date.now();
  if (delayed) {
    return <span className="badge text-bg-danger">Demorado</span>;
  }
  return <span className="badge text-bg-info">Confirmado</span>;
}

function formatConfirmedAt(iso) {
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

function vesselValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "—";
  return `${value}${suffix}`;
}

function VesselCharacteristic({ label, value }) {
  return (
    <div className="col-sm-6 col-lg-4">
      <div className="small text-muted">{label}</div>
      <div className="fw-medium text-break">{value}</div>
    </div>
  );
}

export function SportMovementsDispatchesPage() {
  const [nameQuery, setNameQuery] = useState("");
  const [regQuery, setRegQuery] = useState("");
  const [matches, setMatches] = useState([]);
  const [matchesTotal, setMatchesTotal] = useState(0);
  const [vesselsLoading, setVesselsLoading] = useState(false);
  const [vesselsErr, setVesselsErr] = useState("");
  const [selectedVessel, setSelectedVessel] = useState(null);

  const [movements, setMovements] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listErr, setListErr] = useState("");

  const [confirmed, setConfirmed] = useState([]);
  const [confirmedPage, setConfirmedPage] = useState(1);
  const [confirmedTotalPages, setConfirmedTotalPages] = useState(1);
  const [confirmedTotalDocs, setConfirmedTotalDocs] = useState(0);
  const [confirmedLoading, setConfirmedLoading] = useState(true);
  const [confirmedErr, setConfirmedErr] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [checkingVessel, setCheckingVessel] = useState(false);
  const [registerErr, setRegisterErr] = useState("");
  const [cancelling, setCancelling] = useState(null);
  const [cancellingSaving, setCancellingSaving] = useState(false);

  const loadDispatches = useCallback(async (pageNum = 1) => {
    setListLoading(true);
    setListErr("");
    try {
      const data = await sportMovementsDispatches({
        page: pageNum,
        limit: PAGE_SIZE,
      });
      setMovements(Array.isArray(data?.docs) ? data.docs : []);
      setPage(Number(data?.page) || 1);
      setTotalPages(Number(data?.totalPages) || 1);
      setTotalDocs(Number(data?.totalDocs) || 0);
    } catch (e) {
      setListErr(e?.message || "No se pudieron cargar los despachos.");
      setMovements([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadConfirmed = useCallback(async (pageNum = 1) => {
    setConfirmedLoading(true);
    setConfirmedErr("");
    try {
      const data = await sportMovementsConfirmedDispatches({
        page: pageNum,
        limit: PAGE_SIZE,
      });
      setConfirmed(Array.isArray(data?.docs) ? data.docs : []);
      setConfirmedPage(Number(data?.page) || 1);
      setConfirmedTotalPages(Number(data?.totalPages) || 1);
      setConfirmedTotalDocs(Number(data?.totalDocs) || 0);
    } catch (e) {
      setConfirmedErr(
        e?.message || "No se pudieron cargar los movimientos confirmados."
      );
      setConfirmed([]);
    } finally {
      setConfirmedLoading(false);
    }
  }, []);

  async function reloadLists(pendingPage = page, confPage = confirmedPage) {
    await Promise.all([
      loadDispatches(pendingPage),
      loadConfirmed(confPage),
    ]);
  }

  useEffect(() => {
    loadDispatches(1);
    loadConfirmed(1);
  }, [loadDispatches, loadConfirmed]);

  useEffect(() => {
    const name = nameQuery.trim();
    const reg = regQuery.trim();
    const nameOk = name.length >= VESSEL_SEARCH_MIN_CHARS;
    const regOk = reg.length >= VESSEL_SEARCH_MIN_CHARS;

    if (!nameOk && !regOk) {
      setMatches([]);
      setMatchesTotal(0);
      setVesselsErr("");
      setVesselsLoading(false);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setVesselsLoading(true);
      setVesselsErr("");
      vesselsByTypeSearch({
        vesselType: "Deportivo",
        name: nameOk ? name : undefined,
        nationalRegistryNumber: regOk ? reg : undefined,
        limit: VESSEL_SEARCH_LIMIT,
      })
        .then((data) => {
          if (cancelled) return;
          const list = Array.isArray(data?.vessels) ? data.vessels : [];
          setMatches(list);
          setMatchesTotal(Number(data?.total) || list.length);
          setSelectedVessel((prev) => {
            if (!prev) return null;
            const stillThere = list.some(
              (v) => String(v._id) === String(prev._id)
            );
            if (!stillThere) setRegisterErr("");
            return stillThere ? prev : null;
          });
        })
        .catch((e) => {
          if (cancelled) return;
          setMatches([]);
          setMatchesTotal(0);
          setVesselsErr(e?.message || "No se pudieron buscar los buques.");
        })
        .finally(() => {
          if (!cancelled) setVesselsLoading(false);
        });
    }, VESSEL_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [nameQuery, regQuery]);

  async function openCreate() {
    if (!selectedVessel) return;
    setRegisterErr("");
    setCheckingVessel(true);
    try {
      const vesselId = selectedVessel._id || selectedVessel.id;
      const data = await checkSportMovementVesselAvailable(vesselId);
      if (!data?.available) {
        setRegisterErr(
          data?.msg ||
            "El buque ya tiene un movimiento abierto. Debe cerrarse antes de registrar otro despacho."
        );
        return;
      }
      setEditing(null);
      setModalOpen(true);
    } catch (e) {
      setRegisterErr(
        e?.message || "No se pudo verificar si el buque tiene un movimiento abierto."
      );
    } finally {
      setCheckingVessel(false);
    }
  }

  function openEdit(m) {
    setEditing(m);
    setSelectedVessel(null);
    setModalOpen(true);
  }

  async function handleSave(payload) {
    setSaving(true);
    try {
      if (editing?._id) {
        await updateSportMovement(editing._id, payload);
        await Swal.fire({
          icon: "success",
          title: "Actualizado",
          text: "Movimiento modificado correctamente.",
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        await createSportMovement(payload);
        await Swal.fire({
          icon: "success",
          title: "Registrado",
          text: "Movimiento en espera. Confirmelo cuando inicie la salida (válido 24 h).",
          timer: 2200,
          showConfirmButton: false,
        });
      }
      setModalOpen(false);
      setEditing(null);
      await reloadLists(page, confirmedPage);
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm(m) {
    setActionId(m._id);
    try {
      const data = await confirmSportMovement(m._id);
      await Swal.fire({
        icon: "success",
        title: "Confirmado",
        text: data?.msg || "Movimiento confirmado.",
        timer: 2000,
        showConfirmButton: false,
      });
      await reloadLists(page, 1);
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo confirmar",
        text: e?.message || "Error desconocido.",
      });
    } finally {
      setActionId("");
    }
  }

  async function handleRenew(m) {
    setActionId(m._id);
    try {
      const data = await renewSportMovement(m._id);
      await Swal.fire({
        icon: "success",
        title: "Renovado",
        text: data?.msg || "Movimiento renovado por 24 horas.",
        timer: 2000,
        showConfirmButton: false,
      });
      await reloadLists(page, confirmedPage);
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo renovar",
        text: e?.message || "Error desconocido.",
      });
    } finally {
      setActionId("");
    }
  }

  async function handleDelete(m) {
    const name = m.vesselSnapshot?.name || "buque";
    const result = await confirmDelete({
      resource: "movimiento deportivo",
      summaryHtml: `
        <p class="mb-2">Se eliminará permanentemente el siguiente registro:</p>
        <ul class="mb-2 ps-3">
          <li>Buque: <strong>${escapeHtml(name)}</strong></li>
          <li>Destino: <strong>${escapeHtml(m.destinationUnit || "—")}</strong></li>
          <li class="text-muted small">ETA: ${escapeHtml(formatEta(m.eta))}</li>
        </ul>
      `,
    });
    if (!result.isConfirmed) return;

    setActionId(m._id);
    try {
      const data = await deleteSportMovement(m._id);
      await notifyDeleteSuccess(data?.msg);
      await reloadLists(1, confirmedPage);
    } catch (e) {
      await notifyDeleteError(e, "No se pudo eliminar el movimiento.");
    } finally {
      setActionId("");
    }
  }

  async function handleCancelConfirmed(payload) {
    if (!cancelling?._id) return;
    setCancellingSaving(true);
    try {
      const data = await cancelConfirmedSportMovement(
        cancelling._id,
        payload
      );
      setCancelling(null);
      await notifyDeleteSuccess(
        data?.msg || "Movimiento confirmado eliminado correctamente."
      );
      await reloadLists(page, confirmedPage);
    } catch (e) {
      throw e;
    } finally {
      setCancellingSaving(false);
    }
  }

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="m-0">Despachos</h3>
            <p className="text-muted small mb-0 mt-1">
              Busque un buque deportivo y registre el movimiento.
            </p>
          </div>
          <Link className="btn btn-outline-secondary btn-sm" to={MENU}>
            Volver
          </Link>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title h6">Buscar buque</h5>
            {vesselsErr ? (
              <ErrorAlert message={vesselsErr} />
            ) : null}
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label">Nombre</label>
                <input
                  type="search"
                  className="form-control"
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                  placeholder="Mínimo 2 caracteres"
                  autoComplete="off"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Matrícula</label>
                <input
                  type="search"
                  className="form-control"
                  value={regQuery}
                  onChange={(e) => setRegQuery(e.target.value)}
                  placeholder="Mínimo 2 caracteres"
                  autoComplete="off"
                />
              </div>
            </div>
            <p className="form-text mb-0 mt-2">
              Escriba al menos 2 caracteres en nombre o matrícula. Se muestran
              hasta {VESSEL_SEARCH_LIMIT} coincidencias.
            </p>
            {vesselsLoading ? (
              <p className="text-muted small mt-3 mb-0">Buscando…</p>
            ) : null}
            {!vesselsLoading &&
            (nameQuery.trim().length >= VESSEL_SEARCH_MIN_CHARS ||
              regQuery.trim().length >= VESSEL_SEARCH_MIN_CHARS) ? (
              <div className="list-group mt-3">
                {matches.length === 0 ? (
                  <div className="list-group-item text-muted small">
                    Sin coincidencias.
                  </div>
                ) : (
                  <>
                    {matches.map((v) => (
                      <button
                        key={v._id}
                        type="button"
                        className={`list-group-item list-group-item-action ${
                          selectedVessel?._id === v._id ? "active" : ""
                        }`}
                        onClick={() => {
                          setSelectedVessel(v);
                          setRegisterErr("");
                        }}
                      >
                        <div className="fw-semibold">
                          {v.name || "Sin nombre"}
                        </div>
                        <div className="small opacity-75">
                          Matrícula: {v.nationalRegistryNumber || "—"}
                          {v.portOfRegistry ? ` · ${v.portOfRegistry}` : ""}
                        </div>
                      </button>
                    ))}
                    {matchesTotal > matches.length ? (
                      <div className="list-group-item text-muted small">
                        Mostrando {matches.length} de {matchesTotal}. Afine la
                        búsqueda para ver menos resultados.
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            {selectedVessel ? (
              <div className="border rounded p-3 mt-3 bg-body-tertiary">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                  <div>
                    <div className="small text-uppercase text-muted mb-1">
                      Buque seleccionado
                    </div>
                    <div className="fw-bold fs-5">
                      {selectedVessel.name || "Sin nombre"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={openCreate}
                    disabled={checkingVessel}
                    aria-busy={checkingVessel}
                  >
                    {checkingVessel
                      ? "Verificando…"
                      : "Registrar movimiento"}
                  </button>
                </div>

                <div className="row g-3 mt-1">
                  <VesselCharacteristic
                    label="Matrícula"
                    value={vesselValue(
                      selectedVessel.nationalRegistryNumber
                    )}
                  />
                  <VesselCharacteristic
                    label="Tipo de embarcación"
                    value={vesselValue(selectedVessel.shipType)}
                  />
                  <VesselCharacteristic
                    label="Puerto de matrícula"
                    value={vesselValue(selectedVessel.portOfRegistry)}
                  />
                  <VesselCharacteristic
                    label="Bandera"
                    value={vesselValue(selectedVessel.flagState)}
                  />
                  <VesselCharacteristic
                    label="Documentación"
                    value={vesselValue(selectedVessel.recreationalDocType)}
                  />
                  <VesselCharacteristic
                    label="Categoría deportiva"
                    value={vesselValue(selectedVessel.recreationalCategory)}
                  />
                  <VesselCharacteristic
                    label="Propietario"
                    value={vesselValue(selectedVessel.owner)}
                  />
                  <VesselCharacteristic
                    label="Año de construcción"
                    value={vesselValue(selectedVessel.yearBuilt)}
                  />
                  <VesselCharacteristic
                    label="Indicativo de llamada"
                    value={vesselValue(selectedVessel.callSign)}
                  />
                  <VesselCharacteristic
                    label="Eslora"
                    value={vesselValue(
                      selectedVessel.lengthOverall,
                      " m"
                    )}
                  />
                  <VesselCharacteristic
                    label="Manga"
                    value={vesselValue(selectedVessel.beam, " m")}
                  />
                  <VesselCharacteristic
                    label="Puntal"
                    value={vesselValue(selectedVessel.puntal, " m")}
                  />
                  <VesselCharacteristic
                    label="Arqueo bruto"
                    value={vesselValue(selectedVessel.grossTonnage)}
                  />
                  <VesselCharacteristic
                    label="Capacidad de personas"
                    value={vesselValue(selectedVessel.crewCapacity)}
                  />
                </div>

                <ErrorAlert
                  message={registerErr}
                  className="alert alert-danger py-2 mt-3 mb-0"
                />
              </div>
            ) : null}
          </div>
        </div>

        <h5 className="h6 text-muted text-uppercase mb-2">
          Movimientos pendientes / vencidos
        </h5>
        {listErr ? (
          <ErrorAlert message={listErr} />
        ) : null}
        {listLoading ? (
          <p className="text-muted">Cargando…</p>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle">
                <thead>
                  <tr>
                    <th>Buque</th>
                    <th>Destino</th>
                    <th>Prefectura</th>
                    <th>ETA</th>
                    <th>Estado</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-muted small">
                        No hay despachos en espera ni vencidos.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => (
                      <tr key={m._id}>
                        <td>
                          <div className="fw-semibold">
                            {m.vesselSnapshot?.name || "—"}
                          </div>
                          <div className="small text-muted">
                            {m.vesselSnapshot?.nationalRegistryNumber || "—"}
                          </div>
                        </td>
                        <td>{m.destinationPort || "—"}</td>
                        <td>{m.destinationUnit || "—"}</td>
                        <td className="small">{formatEta(m.eta)}</td>
                        <td>
                          {statusBadge(m.status)}
                          {m.requestedBySkipper ? (
                            <span
                              className="badge text-bg-secondary ms-1"
                              data-sicen-popover="Solicitado por náuta desde SICEN"
                            >
                              Náuta
                            </span>
                          ) : null}
                        </td>
                        <td className="text-end text-nowrap">
                          {m.status === "standBy" ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success me-1"
                              data-sicen-popover="Confirmar"
                              aria-label="Confirmar"
                              disabled={actionId === m._id}
                              onClick={() => handleConfirm(m)}
                            >
                              <i className="bi bi-check-circle" aria-hidden />
                            </button>
                          ) : null}
                          {m.status === "expired" ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary me-1"
                              data-sicen-popover="Renovar"
                              aria-label="Renovar"
                              disabled={actionId === m._id}
                              onClick={() => handleRenew(m)}
                            >
                              <i
                                className="bi bi-arrow-clockwise"
                                aria-hidden
                              />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary me-1"
                            data-sicen-popover="Modificar"
                            aria-label="Modificar"
                            disabled={actionId === m._id}
                            onClick={() => openEdit(m)}
                          >
                            <i className="bi bi-pencil" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            data-sicen-popover="Eliminar"
                            aria-label="Eliminar"
                            disabled={actionId === m._id}
                            onClick={() => handleDelete(m)}
                          >
                            <i className="bi bi-trash" aria-hidden />
                          </button>
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
                  disabled={page <= 1 || listLoading}
                  onClick={() => loadDispatches(page - 1)}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={page >= totalPages || listLoading}
                  onClick={() => loadDispatches(page + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}

        <h5 className="h6 text-muted text-uppercase mb-2 mt-4">
          Movimientos confirmados
        </h5>
        {confirmedErr ? (
          <ErrorAlert message={confirmedErr} />
        ) : null}
        {confirmedLoading ? (
          <p className="text-muted">Cargando…</p>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle">
                <thead>
                  <tr>
                    <th>Buque</th>
                    <th>Destino</th>
                    <th>Prefectura</th>
                    <th>ETA</th>
                    <th>Confirmado</th>
                    <th>Estado</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {confirmed.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-muted small">
                        No hay movimientos confirmados.
                      </td>
                    </tr>
                  ) : (
                    confirmed.map((m) => (
                      <tr key={m._id}>
                        <td>
                          <div className="fw-semibold">
                            {m.vesselSnapshot?.name || "—"}
                          </div>
                          <div className="small text-muted">
                            {m.vesselSnapshot?.nationalRegistryNumber || "—"}
                          </div>
                        </td>
                        <td>{m.destinationPort || "—"}</td>
                        <td>{m.destinationUnit || "—"}</td>
                        <td className="small">{formatEta(m.eta)}</td>
                        <td className="small">
                          {formatConfirmedAt(m.confirmedAt)}
                        </td>
                        <td>{confirmedBadge(m.eta)}</td>
                        <td className="text-end text-nowrap">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            data-sicen-popover="Eliminar movimiento confirmado"
                            aria-label="Eliminar movimiento confirmado"
                            disabled={
                              cancellingSaving && cancelling?._id === m._id
                            }
                            onClick={() => setCancelling(m)}
                          >
                            <i className="bi bi-trash" aria-hidden />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <span className="small text-muted">
                Total <strong>{confirmedTotalDocs}</strong> · Pág.{" "}
                {confirmedPage} / {confirmedTotalPages}
              </span>
              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={confirmedPage <= 1 || confirmedLoading}
                  onClick={() => loadConfirmed(confirmedPage - 1)}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={
                    confirmedPage >= confirmedTotalPages || confirmedLoading
                  }
                  onClick={() => loadConfirmed(confirmedPage + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <SportMovementFormModal
        open={modalOpen}
        onClose={() => {
          if (!saving) {
            setModalOpen(false);
            setEditing(null);
          }
        }}
        vessel={selectedVessel}
        initialMovement={editing}
        onSubmit={handleSave}
        saving={saving}
      />

      <SportMovementCancelConfirmedModal
        open={Boolean(cancelling)}
        movement={cancelling}
        saving={cancellingSaving}
        onClose={() => {
          if (!cancellingSaving) setCancelling(null);
        }}
        onSubmit={handleCancelConfirmed}
      />
    </Layout>
  );
}
