import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  listUnitsRegisteredPublic,
  vesselsCancelAdminRequest,
  vesselsDeportivoByOwner,
  vesselsDeportivoSearchClaim,
  vesselsMyAdminStatus,
  vesselsRequestAdmin,
  vesselsSkipperUnlink,
} from "../api/client.js";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";
import { RECREATIONAL_DOC_OPTIONS } from "../constants/shipRegistrationFormDefaults.js";

const FIELD_LABELS = {
  name: "Nombre",
  recreationalDocType: "Documentación deportiva",
  nationalRegistryNumber: "Matrícula nacional",
  portOfRegistry: "Puerto de matrícula",
};

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

const EMPTY_SEARCH = {
  name: "",
  recreationalDocType: "",
  nationalRegistryNumber: "",
  portOfRegistry: "",
};

export function SkipperMyVesselsPage() {
  const [vessels, setVessels] = useState([]);
  const [vesselsLoading, setVesselsLoading] = useState(true);
  const [vesselsErr, setVesselsErr] = useState("");
  const [selectedVessel, setSelectedVessel] = useState(null);

  const [search, setSearch] = useState(EMPTY_SEARCH);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState("");
  const [searchResult, setSearchResult] = useState(null);

  const [pending, setPending] = useState([]);
  const [units, setUnits] = useState([]);
  const [busy, setBusy] = useState(false);

  const unitsWithMm = useMemo(
    () => units.filter((u) => u.hasEmailMarinaMercante),
    [units]
  );

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

  const loadPending = useCallback(async () => {
    try {
      const data = await vesselsMyAdminStatus();
      setPending(Array.isArray(data?.pendingRequests) ? data.pendingRequests : []);
    } catch {
      setPending([]);
    }
  }, []);

  useEffect(() => {
    loadVessels();
    loadPending();
  }, [loadVessels, loadPending]);

  useEffect(() => {
    let cancelled = false;
    listUnitsRegisteredPublic()
      .then((data) => {
        if (!cancelled) {
          setUnits(Array.isArray(data?.units) ? data.units : []);
        }
      })
      .catch(() => {
        if (!cancelled) setUnits([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setSearchField(k, v) {
    setSearch((s) => ({ ...s, [k]: v }));
  }

  async function handleSearch(e) {
    e.preventDefault();
    setSearching(true);
    setSearchErr("");
    setSearchResult(null);
    try {
      const data = await vesselsDeportivoSearchClaim({
        name: search.name,
        recreationalDocType: search.recreationalDocType,
        nationalRegistryNumber: search.nationalRegistryNumber,
        portOfRegistry: search.portOfRegistry,
      });
      setSearchResult(data);
    } catch (ex) {
      setSearchErr(ex?.message || "No se pudo buscar.");
    } finally {
      setSearching(false);
    }
  }

  async function openRequestModal(vessel) {
    const unitOptions = unitsWithMm
      .map(
        (u) =>
          `<option value="${u.acronym}">${u.acronym}${
            u.name ? ` — ${u.name}` : ""
          }</option>`
      )
      .join("");

    const { value: formValues, isConfirmed } = await Swal.fire({
      icon: "question",
      title: "Solicitar administración del buque",
      html: `
        <p class="text-start small mb-2">Buque: <strong>${
          vessel.name || "Sin nombre"
        }</strong> · Matrícula ${vessel.nationalRegistryNumber || "—"}</p>
        <p class="text-start small mb-3">Adjunte documento de propiedad, matrícula a su nombre o carta poder emitida a su nombre y regularizada por escribano público.</p>
        <div class="text-start mb-2">
          <label class="form-label small" for="swal-claim">Tipo de vínculo</label>
          <select id="swal-claim" class="form-select form-select-sm">
            <option value="owner">Propietario</option>
            <option value="admin">Administrador (carta poder / usufructo)</option>
          </select>
        </div>
        <div class="text-start mb-2">
          <label class="form-label small" for="swal-unit">Prefectura</label>
          <select id="swal-unit" class="form-select form-select-sm">
            <option value="">Seleccione…</option>
            ${unitOptions}
          </select>
        </div>
        <div class="text-start">
          <label class="form-label small" for="swal-proof">Documento de prueba</label>
          <input id="swal-proof" type="file" class="form-control form-control-sm"
            accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Enviar solicitud",
      cancelButtonText: "Cancelar",
      focusConfirm: false,
      preConfirm: () => {
        const claimType = document.getElementById("swal-claim")?.value;
        const unitAcronym = document.getElementById("swal-unit")?.value;
        const fileInput = document.getElementById("swal-proof");
        const proofFile = fileInput?.files?.[0];
        if (!unitAcronym) {
          Swal.showValidationMessage("Seleccione la prefectura.");
          return false;
        }
        if (!proofFile) {
          Swal.showValidationMessage("Adjunte el documento de prueba.");
          return false;
        }
        return { claimType, unitAcronym, proofFile };
      },
    });

    if (!isConfirmed || !formValues) return;

    setBusy(true);
    setSearchErr("");
    try {
      const res = await vesselsRequestAdmin({
        vesselId: vessel._id || vessel.id,
        unitAcronym: formValues.unitAcronym,
        claimType: formValues.claimType,
        proofFile: formValues.proofFile,
      });
      await Swal.fire({
        icon: "success",
        title: "Solicitud enviada",
        text: res?.msg || "Aguarde la verificación.",
        confirmButtonText: "Aceptar",
      });
      await loadPending();
    } catch (ex) {
      setSearchErr(ex?.message || "No se pudo enviar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlinkVessel(vessel) {
    const claimLabel =
      vessel.myClaimType === "owner"
        ? "propietario"
        : vessel.myClaimType === "admin"
          ? "administrador"
          : "vinculado";
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Desvincular buque",
      html: `<p class="text-start small mb-2">¿Desea desvincular <strong>${vessel.name || "este buque"}</strong> de su cuenta?</p>
        <p class="text-start small text-muted mb-0">Dejará de figurar como ${claimLabel} y no podrá usarlo en despachos hasta volver a solicitar la administración.</p>`,
      showCancelButton: true,
      confirmButtonText: "Sí, desvincular",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc3545",
    });
    if (!confirm.isConfirmed) return;
    setBusy(true);
    setVesselsErr("");
    try {
      const res = await vesselsSkipperUnlink({
        vesselId: vessel._id || vessel.id,
      });
      await Swal.fire({
        icon: "success",
        title: "Desvinculado",
        text: res?.msg || "El buque ya no figura en su cuenta.",
        confirmButtonText: "Aceptar",
      });
      setSelectedVessel(null);
      await loadVessels();
    } catch (ex) {
      setVesselsErr(ex?.message || "No se pudo desvincular el buque.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelPending(requestId) {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Cancelar solicitud",
      text: "¿Desea cancelar esta solicitud de administración?",
      showCancelButton: true,
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "Volver",
    });
    if (!confirm.isConfirmed) return;
    setBusy(true);
    try {
      await vesselsCancelAdminRequest({ requestId });
      await loadPending();
    } catch (ex) {
      setSearchErr(ex?.message || "No se pudo cancelar.");
    } finally {
      setBusy(false);
    }
  }

  function renderVesselCard(vessel, matchedFields) {
    return (
      <div
        key={vessel._id}
        className="border rounded p-3 bg-body d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2"
      >
        <div>
          <div className="fw-semibold">{vessel.name || "Sin nombre"}</div>
          <div className="small text-muted">
            Matrícula: {vessel.nationalRegistryNumber || "—"}
            {vessel.portOfRegistry ? ` · ${vessel.portOfRegistry}` : ""}
            {vessel.recreationalDocType
              ? ` · ${vessel.recreationalDocType}`
              : ""}
          </div>
          {matchedFields?.length ? (
            <div className="d-flex flex-wrap gap-1 mt-2">
              {matchedFields.map((f) => (
                <span key={f} className="badge text-bg-info">
                  Coincide: {FIELD_LABELS[f] || f}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() => openRequestModal(vessel)}
        >
          Solicitar administración
        </button>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Mis barcos</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/home">
            Menú principal
          </Link>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title h6">Mis embarcaciones</h5>
            <p className="form-text">
              Embarcaciones deportivas donde usted figura como propietario o
              administrador autorizado.
            </p>
            {vesselsErr ? <ErrorAlert message={vesselsErr} /> : null}
            {vesselsLoading ? (
              <p className="text-muted small mb-0">Cargando…</p>
            ) : vessels.length === 0 ? (
              <p className="text-muted small mb-0">
                Todavía no tiene buques vinculados. Use la búsqueda debajo para
                solicitar la administración de uno existente.
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
                    onClick={() => setSelectedVessel(v)}
                  >
                    <div className="fw-semibold">{v.name || "Sin nombre"}</div>
                    <div className="small opacity-75">
                      Matrícula: {v.nationalRegistryNumber || "—"}
                      {v.portOfRegistry ? ` · ${v.portOfRegistry}` : ""}
                      {v.myClaimType === "admin"
                        ? " · Administrador"
                        : v.myClaimType === "owner"
                          ? " · Propietario"
                          : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedVessel ? (
              <div className="border rounded p-3 mt-3 bg-body-tertiary">
                <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
                  <div>
                    <div className="small text-uppercase text-muted mb-1">
                      Detalle del buque
                    </div>
                    <div className="fw-bold fs-5">
                      {selectedVessel.name || "Sin nombre"}
                    </div>
                    {selectedVessel.myClaimType ? (
                      <div className="small text-muted mt-1">
                        Usted figura como{" "}
                        {selectedVessel.myClaimType === "owner"
                          ? "propietario"
                          : "administrador"}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    disabled={busy}
                    onClick={() => handleUnlinkVessel(selectedVessel)}
                  >
                    Desvincular
                  </button>
                </div>
                <div className="row g-3">
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
                  <VesselCharacteristic
                    label="Tipo de buque"
                    value={vesselValue(selectedVessel.shipType)}
                  />
                  <VesselCharacteristic
                    label="Documentación"
                    value={vesselValue(selectedVessel.recreationalDocType)}
                  />
                  <VesselCharacteristic
                    label="Arqueo bruto"
                    value={
                      selectedVessel.grossTonnage != null
                        ? `${selectedVessel.grossTonnage} GT`
                        : "—"
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {pending.length > 0 ? (
          <div className="card shadow-sm mb-4 border-warning border-opacity-50">
            <div className="card-body">
              <h5 className="card-title h6">Solicitudes pendientes</h5>
              <div className="d-flex flex-column gap-2">
                {pending.map((r) => (
                  <div
                    key={r._id}
                    className="d-flex flex-wrap align-items-center justify-content-between gap-2 border rounded p-2"
                  >
                    <div className="small">
                      <strong>{r.vessel?.name || "Buque"}</strong>
                      {" · "}
                      {r.claimType === "owner"
                        ? "Propietario"
                        : "Administrador"}
                      {" · "}
                      {r.unitAcronym || "—"}
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      disabled={busy}
                      onClick={() => handleCancelPending(r._id)}
                    >
                      Cancelar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="card shadow-sm">
          <div className="card-body">
            <h5 className="card-title h6">Buscar / vincular buque</h5>
            <p className="form-text">
              Ingrese los mismos datos del registro PNN. Si coinciden todos,
              verá el buque; si coincide al menos uno, le sugeriremos posibles
              coincidencias.
            </p>
            {searchErr ? <ErrorAlert message={searchErr} /> : null}

            <form onSubmit={handleSearch} className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="claim-name">
                  Nombre del buque
                </label>
                <input
                  id="claim-name"
                  className="form-control"
                  value={search.name}
                  onChange={(e) => setSearchField("name", e.target.value)}
                  required
                  disabled={searching || busy}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="claim-doc">
                  Documentación deportiva
                </label>
                <select
                  id="claim-doc"
                  className="form-select"
                  value={search.recreationalDocType}
                  onChange={(e) =>
                    setSearchField("recreationalDocType", e.target.value)
                  }
                  required
                  disabled={searching || busy}
                >
                  {RECREATIONAL_DOC_OPTIONS.map((o) => (
                    <option key={o.value || "empty"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="claim-mat">
                  Matrícula nacional
                </label>
                <input
                  id="claim-mat"
                  className="form-control"
                  value={search.nationalRegistryNumber}
                  onChange={(e) =>
                    setSearchField("nationalRegistryNumber", e.target.value)
                  }
                  required
                  disabled={searching || busy}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="claim-port">
                  Puerto de matrícula
                </label>
                <input
                  id="claim-port"
                  className="form-control"
                  value={search.portOfRegistry}
                  onChange={(e) =>
                    setSearchField(
                      "portOfRegistry",
                      e.target.value.toUpperCase()
                    )
                  }
                  required
                  disabled={searching || busy}
                />
              </div>
              <div className="col-12">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={searching || busy}
                >
                  {searching ? "Buscando…" : "Buscar buque"}
                </button>
              </div>
            </form>

            {searchResult ? (
              <div className="mt-4">
                {searchResult.exact ? (
                  <div className="d-flex flex-column gap-2">
                    <div className="alert alert-success py-2 small mb-0">
                      {searchResult.msg || "Coincidencia exacta."}
                    </div>
                    {renderVesselCard(searchResult.exact, [
                      "name",
                      "recreationalDocType",
                      "nationalRegistryNumber",
                      "portOfRegistry",
                    ])}
                  </div>
                ) : searchResult.suggestions?.length ? (
                  <div className="d-flex flex-column gap-2">
                    <div className="alert alert-warning py-2 small mb-0">
                      {searchResult.msg ||
                        "No se encontró un resultado con los parámetros ingresados. ¿Podría referirse a…?"}
                    </div>
                    {searchResult.suggestions.map((s) =>
                      renderVesselCard(s.vessel, s.matchedFields)
                    )}
                  </div>
                ) : (
                  <div className="alert alert-secondary py-2 small mb-0 mt-3">
                    {searchResult.msg || "Sin resultados."}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Layout>
  );
}
