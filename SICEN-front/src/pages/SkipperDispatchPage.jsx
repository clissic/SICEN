import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  checkSportMovementVesselAvailable,
  skipperCancelDispatchRequest,
  skipperMovementStatus,
  skipperRequestDispatch,
  vesselsDeportivoByOwner,
} from "../api/client.js";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";
import { SportMovementFormModal } from "../components/SportMovementFormModal.jsx";
import {
  confirmDelete,
  escapeHtml,
  notifyDeleteError,
  notifyDeleteSuccess,
} from "../utils/confirmDelete.js";

function vesselValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "—";
  return `${value}${suffix}`;
}

function VesselCharacteristic({ label, value }) {
  return (
    <div className="col-sm-6 col-lg-4">
      <div className="small text-muted text-uppercase">{label}</div>
      <div className="fw-semibold text-break">{value}</div>
    </div>
  );
}

export function SkipperDispatchPage() {
  const [vessels, setVessels] = useState([]);
  const [vesselsLoading, setVesselsLoading] = useState(true);
  const [vesselsErr, setVesselsErr] = useState("");
  const [skipperStatus, setSkipperStatus] = useState(null);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [checkingVessel, setCheckingVessel] = useState(false);
  const [registerErr, setRegisterErr] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadVessels = useCallback(async () => {
    setVesselsLoading(true);
    setVesselsErr("");
    try {
      const data = await vesselsDeportivoByOwner();
      setVessels(Array.isArray(data?.vessels) ? data.vessels : []);
    } catch (e) {
      setVesselsErr(e?.message || "No se pudieron cargar sus buques.");
      setVessels([]);
    } finally {
      setVesselsLoading(false);
    }
  }, []);

  const loadSkipperStatus = useCallback(async () => {
    try {
      const data = await skipperMovementStatus();
      setSkipperStatus(data);
    } catch {
      setSkipperStatus(null);
    }
  }, []);

  useEffect(() => {
    loadVessels();
    loadSkipperStatus();
  }, [loadVessels, loadSkipperStatus]);

  useEffect(() => {
    const movement = skipperStatus?.movement;
    if (!movement || !skipperStatus?.canCancelDispatchRequest || !vessels.length) {
      return;
    }
    const match = vessels.find(
      (v) => String(v._id) === String(movement.vesselId)
    );
    if (match) setSelectedVessel(match);
  }, [skipperStatus, vessels]);

  const pendingMovement = useMemo(() => {
    const movement = skipperStatus?.movement;
    if (!movement || !selectedVessel) return null;
    if (!skipperStatus?.canCancelDispatchRequest) return null;
    if (String(movement.vesselId) !== String(selectedVessel._id)) return null;
    return movement;
  }, [skipperStatus, selectedVessel]);

  async function openCreate() {
    if (!selectedVessel || pendingMovement) return;
    setRegisterErr("");
    setCheckingVessel(true);
    try {
      const data = await checkSportMovementVesselAvailable(selectedVessel._id);
      if (!data?.available) {
        setRegisterErr(data?.msg || "El buque no está disponible para despacho.");
        return;
      }
      setModalOpen(true);
    } catch (e) {
      setRegisterErr(e?.message || "No se pudo verificar el buque.");
    } finally {
      setCheckingVessel(false);
    }
  }

  async function handleSubmit(payload) {
    setSaving(true);
    try {
      const data = await skipperRequestDispatch(payload);
      setModalOpen(false);
      setSelectedVessel(null);
      await loadSkipperStatus();
      await Swal.fire({
        icon: "success",
        title: "Pre-despacho realizado",
        text:
          data?.msg ||
          "Su solicitud quedó registrada en SICEN. Para completar el despacho, efectúe la comunicación radial con la Prefectura de despacho.",
        confirmButtonText: "Aceptar",
      });
    } catch (e) {
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelRequest() {
    if (!pendingMovement?._id) return;

    const vesselName =
      pendingMovement.vesselSnapshot?.name || selectedVessel?.name || "—";
    const vesselReg =
      pendingMovement.vesselSnapshot?.nationalRegistryNumber ||
      selectedVessel?.nationalRegistryNumber ||
      "—";

    const result = await confirmDelete({
      resource: "solicitud de despacho",
      title: "¿Cancelar solicitud de despacho?",
      summaryHtml: `
        <ul class="mb-2 ps-3">
          <li><strong>Buque:</strong> ${escapeHtml(vesselName)}</li>
          <li><strong>Matrícula:</strong> ${escapeHtml(vesselReg)}</li>
          <li><strong>Prefectura de despacho:</strong> ${escapeHtml(pendingMovement.originUnit || "—")}</li>
        </ul>`,
      extraNote:
        "Podrá volver a solicitar un despacho cuando lo necesite.",
    });
    if (!result.isConfirmed) return;

    setCancelling(true);
    setRegisterErr("");
    try {
      const data = await skipperCancelDispatchRequest(pendingMovement._id);
      setSelectedVessel(null);
      await loadSkipperStatus();
      await notifyDeleteSuccess(
        data?.msg || "Solicitud de despacho cancelada correctamente."
      );
    } catch (e) {
      notifyDeleteError(e, "No se pudo cancelar la solicitud de despacho.");
    } finally {
      setCancelling(false);
    }
  }

  const actionBusy = checkingVessel || saving || cancelling;

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Solicitar despacho</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/home">
            Menú principal
          </Link>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title h6">Sus buques</h5>
            <p className="form-text">
              Se listan embarcaciones deportivas donde usted figura como
              propietario en la base de buques.
            </p>
            {vesselsErr ? <ErrorAlert message={vesselsErr} /> : null}
            {vesselsLoading ? (
              <p className="text-muted small mb-0">Cargando…</p>
            ) : vessels.length === 0 ? (
              <p className="text-muted small mb-0">
                No se encontraron buques a su nombre. Verifique el campo
                propietario en la ficha del buque o actualice sus datos de
                usuario.
              </p>
            ) : (
              <div className="list-group">
                {vessels.map((v) => (
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
                    <div className="fw-semibold">{v.name || "Sin nombre"}</div>
                    <div className="small opacity-75">
                      Matrícula: {v.nationalRegistryNumber || "—"}
                      {v.portOfRegistry ? ` · ${v.portOfRegistry}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}

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
                    {pendingMovement ? (
                      <p className="small text-warning mb-0 mt-2">
                        Tiene una solicitud de despacho pendiente de
                        confirmación por la prefectura.
                      </p>
                    ) : null}
                  </div>
                  {pendingMovement ? (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={handleCancelRequest}
                      disabled={actionBusy}
                      aria-busy={cancelling}
                    >
                      {cancelling ? "Cancelando…" : "Cancelar despacho"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={openCreate}
                      disabled={actionBusy}
                      aria-busy={checkingVessel}
                    >
                      {checkingVessel ? "Verificando…" : "Solicitar despacho"}
                    </button>
                  )}
                </div>
                <div className="row g-3 mt-1">
                  <VesselCharacteristic
                    label="Matrícula"
                    value={vesselValue(selectedVessel.nationalRegistryNumber)}
                  />
                  <VesselCharacteristic
                    label="Propietario"
                    value={vesselValue(selectedVessel.owner)}
                  />
                  <VesselCharacteristic
                    label="Puerto de matrícula"
                    value={vesselValue(selectedVessel.portOfRegistry)}
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
      </div>

      <SportMovementFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        vessel={selectedVessel}
        mode="skipper"
        saving={saving}
        onSubmit={handleSubmit}
      />
    </Layout>
  );
}
