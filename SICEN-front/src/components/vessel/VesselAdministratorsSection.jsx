import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  addVesselAdministrator,
  approveVesselAdminRequest,
  fetchVesselAdminProofDocument,
  rejectVesselAdminRequest,
  removeVesselAdministrator,
  usersPaginated,
  vesselAdminRequests,
} from "../../api/client.js";
import { ErrorAlert } from "../ErrorAlert.jsx";
import {
  confirmDelete as confirmDeleteAlert,
  escapeHtml,
} from "../../utils/confirmDelete.js";
import { confirmSkipperVesselLink } from "../../utils/confirmSkipperVesselLink.js";

function claimLabel(t) {
  return t === "owner" ? "Propietario" : "Administrador";
}

/**
 * Bloque en edición de buque deportivo: solicitudes pendientes + administradores.
 */
export function VesselAdministratorsSection({
  vesselId,
  enabled,
  /** Dentro del fieldset Propiedad del formulario (sin card aparte). */
  embedded = false,
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [addQ, setAddQ] = useState("");
  const [addClaim, setAddClaim] = useState("admin");
  const [candidates, setCandidates] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const load = useCallback(async () => {
    if (!enabled || !vesselId) {
      setData(null);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const res = await vesselAdminRequests(vesselId);
      setData(res);
    } catch (e) {
      setErr(e?.message || "No se pudieron cargar administradores.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [vesselId, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  const pending = data?.pendingRequests || [];
  const admins = data?.administrators || [];
  const hasOwner =
    admins.some((a) => a.claimType === "owner") ||
    pending.some((r) => r.claimType === "owner");

  useEffect(() => {
    if (hasOwner) setAddClaim("admin");
  }, [hasOwner]);

  async function handleOpenProof(requestId) {
    try {
      const { blob } = await fetchVesselAdminProofDocument(requestId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setErr(e?.message || "No se pudo abrir el documento.");
    }
  }

  async function handleApprove(requestId) {
    const confirm = await Swal.fire({
      icon: "question",
      title: "Aprobar administración del buque",
      html: `
        <p class="text-start mb-2">Antes de continuar, confirme:</p>
        <ul class="text-start small">
          <li>Revisó el documento de prueba adjunto.</li>
          <li>Autoriza el vínculo solicitado (propietario o administrador).</li>
        </ul>
      `,
      input: "checkbox",
      inputValue: 0,
      inputPlaceholder: "Confirmo que verifiqué la documentación presentada",
      showCancelButton: true,
      confirmButtonText: "Aprobar",
      cancelButtonText: "Cancelar",
      preConfirm: (checked) => {
        if (!checked) {
          Swal.showValidationMessage("Debe confirmar la verificación.");
        }
        return checked;
      },
    });
    if (!confirm.isConfirmed) return;
    setBusy(true);
    setErr("");
    try {
      const res = await approveVesselAdminRequest(requestId, {
        identityVerified: true,
      });
      await Swal.fire({
        icon: "success",
        title: "Aprobado",
        text: res?.msg || "Vinculado.",
        confirmButtonText: "Aceptar",
      });
      await load();
    } catch (e) {
      setErr(e?.message || "No se pudo aprobar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(requestId) {
    const { value: reason, isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Rechazar solicitud",
      input: "textarea",
      inputLabel: "Motivo",
      showCancelButton: true,
      confirmButtonText: "Rechazar",
      cancelButtonText: "Cancelar",
      inputValidator: (v) =>
        !String(v || "").trim() ? "Indique un motivo." : null,
    });
    if (!isConfirmed) return;
    setBusy(true);
    setErr("");
    try {
      const res = await rejectVesselAdminRequest(requestId, { reason });
      await Swal.fire({
        icon: "success",
        title: "Rechazada",
        text: res?.msg || "Solicitud rechazada.",
        confirmButtonText: "Aceptar",
      });
      await load();
    } catch (e) {
      setErr(e?.message || "No se pudo rechazar.");
    } finally {
      setBusy(false);
    }
  }

  async function searchSkippers(e) {
    e?.preventDefault?.();
    const q = String(addQ || "").trim();
    if (!q) {
      setCandidates([]);
      return;
    }
    setSearchingUsers(true);
    setErr("");
    try {
      const params = {
        currentPage: 1,
        pageSize: 10,
        role: "skipper",
      };
      if (q.includes("@")) params.email = q;
      else if (/^\d[\d.\-\s]*$/.test(q)) params.documentId = q.replace(/[.\-\s]/g, "");
      else params.first_name = q;
      const data = await usersPaginated(params);
      const docs = Array.isArray(data?.payload?.paginatedUsers)
        ? data.payload.paginatedUsers
        : Array.isArray(data?.paginatedUsers)
          ? data.paginatedUsers
          : [];
      setCandidates(docs);
    } catch (ex) {
      setErr(ex?.message || "No se pudieron buscar usuarios.");
      setCandidates([]);
    } finally {
      setSearchingUsers(false);
    }
  }

  async function handleAddUser(user) {
    const claim = hasOwner ? "admin" : addClaim;
    const roleLabel = claim === "owner" ? "propietario" : "administrador";
    const confirmed = await confirmSkipperVesselLink({ user, roleLabel });
    if (!confirmed) return;

    setBusy(true);
    setErr("");
    try {
      const res = await addVesselAdministrator(vesselId, {
        userId: user._id,
        claimType: claim,
      });
      await Swal.fire({
        icon: "success",
        title: "Agregado",
        text: res?.msg || "Administrador agregado.",
        confirmButtonText: "Aceptar",
      });
      setCandidates([]);
      setAddQ("");
      await load();
    } catch (e) {
      setErr(e?.message || "No se pudo agregar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(userId, label) {
    const result = await confirmDeleteAlert({
      title: "Quitar administrador",
      summaryHtml: `<p class="mb-2">¿Quitar a <strong>${escapeHtml(label)}</strong> de este buque?</p>`,
      confirmButtonText: "Quitar",
    });
    if (!result?.isConfirmed) return;
    setBusy(true);
    setErr("");
    try {
      await removeVesselAdministrator(vesselId, userId);
      await load();
    } catch (e) {
      setErr(e?.message || "No se pudo quitar.");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) return null;

  const content = (
    <>
      {err ? (
        <ErrorAlert
          message={err}
          className="alert alert-danger py-2 mb-3 small"
        />
      ) : null}
      {loading ? (
        <p className="text-muted small">Cargando cuentas vinculadas…</p>
      ) : (
        <>
          {pending.length > 0 ? (
            <div className="mb-4">
              <div className="fw-semibold mb-2">Solicitudes pendientes</div>
              <div className="d-flex flex-column gap-2">
                {pending.map((r) => (
                  <div key={r._id} className="border rounded p-3 bg-body-tertiary">
                    <div className="small mb-2">
                      <strong>
                        {r.user
                          ? `${r.user.first_name} ${r.user.last_name}`
                          : r.requestedBy}
                      </strong>
                      {r.user?.email ? ` · ${r.user.email}` : ""}
                      {r.user?.documentId
                        ? ` · Doc. ${r.user.documentId}`
                        : ""}
                    </div>
                    <div className="small mb-2">
                      Vínculo: <strong>{claimLabel(r.claimType)}</strong>
                      {r.unitAcronym ? ` · ${r.unitAcronym}` : ""}
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {r.proofDocument?.available ? (
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          disabled={busy}
                          onClick={() => handleOpenProof(r._id)}
                        >
                          Ver documento
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busy}
                        onClick={() => handleApprove(r._id)}
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        disabled={busy}
                        onClick={() => handleReject(r._id)}
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mb-3">
            <div className="fw-semibold mb-2">Cuentas náutas vinculadas</div>
            {admins.length === 0 ? (
              <p className="text-muted small mb-0">
                Ningún náuta vinculado como propietario o administrador.
              </p>
            ) : (
              <ul className="list-group list-group-flush">
                {admins.map((a) => {
                  const label = a.user
                    ? `${a.user.first_name} ${a.user.last_name} (${a.user.email})`
                    : a.userId;
                  return (
                    <li
                      key={a.userId}
                      className="list-group-item px-0 d-flex flex-wrap align-items-center justify-content-between gap-2"
                    >
                      <div className="small">
                        <strong>{label}</strong>
                        <span className="text-muted">
                          {" "}
                          · {claimLabel(a.claimType)}
                          {a.linkedByUnit
                            ? ` · vinculado en ${a.linkedByUnit}`
                            : ""}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        disabled={busy}
                        onClick={() => handleRemove(a.userId, label)}
                      >
                        Quitar
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className={embedded ? "" : "border rounded p-3"}>
            <div className="fw-semibold mb-2">Agregar náuta</div>
            <label className="form-label small" htmlFor="admin-search">
              Buscar por DNI / pasaporte, nombre o email
            </label>
            <div className="input-group">
              <input
                id="admin-search"
                className="form-control"
                value={addQ}
                onChange={(e) => setAddQ(e.target.value)}
                disabled={busy || searchingUsers}
                placeholder="DNI, pasaporte, nombre o email"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    searchSkippers(e);
                  }
                }}
              />
              {!hasOwner ? (
                <select
                  id="admin-claim"
                  className="form-select"
                  style={{ maxWidth: "11.5rem" }}
                  value={addClaim}
                  onChange={(e) => setAddClaim(e.target.value)}
                  disabled={busy}
                  aria-label="Tipo de vínculo"
                >
                  <option value="admin">Administrador</option>
                  <option value="owner">Propietario</option>
                </select>
              ) : null}
              <button
                type="button"
                className="btn btn-outline-primary"
                disabled={busy || searchingUsers || !addQ.trim()}
                onClick={searchSkippers}
              >
                {searchingUsers ? "…" : "Buscar"}
              </button>
            </div>
            {hasOwner ? (
              <p className="form-text small mb-0 mt-1">
                Este buque ya tiene propietario vinculado. Las nuevas cuentas se
                agregarán como administradores.
              </p>
            ) : null}
            {candidates.length > 0 ? (
              <div className="list-group mt-2">
                {candidates.map((u) => (
                  <button
                    key={u._id}
                    type="button"
                    className="list-group-item list-group-item-action py-2 small"
                    disabled={busy}
                    onClick={() => handleAddUser(u)}
                  >
                    {u.first_name} {u.last_name} · {u.email}
                    {u.documentId ? ` · ${u.documentId}` : ""}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </>
      )}
    </>
  );

  if (embedded) {
    return (
      <div id="vessel-administradores" className="col-12">
        <hr className="my-3" />
        {content}
      </div>
    );
  }

  return (
    <div
      id="vessel-administradores"
      className="card shadow-sm mb-4 border-primary border-opacity-25"
    >
      <div className="card-body">
        <h5 className="card-title h6 mb-3">Administradores del buque</h5>
        {content}
      </div>
    </div>
  );
}
