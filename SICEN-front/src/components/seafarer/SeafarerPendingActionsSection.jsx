import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  approveSeafarerLink,
  approveSeafarerUnlink,
  fetchSeafarerLinkIdentityDocument,
  rejectSeafarerLink,
  rejectSeafarerUnlink,
  requestSeafarerUnlink,
  seafarerMatchingAccounts,
  seafarerPendingActions,
  staffLinkSeafarerUser,
} from "../../api/client.js";
import { ErrorAlert } from "../ErrorAlert.jsx";

function formatDate(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-UY", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function CoherenceBadges({ flags }) {
  if (!flags) return null;
  const items = [];
  if (flags.nameMismatch) items.push("Nombre no coincide");
  if (flags.birthDateMismatch) items.push("Fecha de nacimiento no coincide");
  if (flags.phoneMismatch) items.push("Teléfono distinto");
  if (flags.emailMismatch) items.push("Email distinto");
  if (!items.length) {
    return (
      <span className="badge text-bg-success">Datos coherentes</span>
    );
  }
  return (
    <div className="d-flex flex-wrap gap-1">
      {items.map((t) => (
        <span key={t} className="badge text-bg-warning text-dark">
          {t}
        </span>
      ))}
    </div>
  );
}

/**
 * Box debajo de Observaciones: vinculación / desvinculación cuenta ↔ ficha.
 */
export function SeafarerPendingActionsSection({
  seafarerId,
  onChanged,
  onLockStateChange,
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [searchingAccounts, setSearchingAccounts] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchErr, setSearchErr] = useState("");

  const load = useCallback(async () => {
    if (!seafarerId) {
      setData(null);
      onLockStateChange?.(false);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const res = await seafarerPendingActions(seafarerId);
      setData(res);
      onLockStateChange?.(
        Boolean(res?.identityFieldsLocked || res?.linkedAccount)
      );
    } catch (e) {
      setErr(e?.message || "No se pudieron cargar las verificaciones.");
      setData(null);
      onLockStateChange?.(false);
    } finally {
      setLoading(false);
    }
  }, [seafarerId, onLockStateChange]);

  useEffect(() => {
    load();
    setSearchResult(null);
    setSearchErr("");
  }, [load]);

  async function refresh() {
    await load();
    onChanged?.();
  }

  async function handleSearchAccounts() {
    setSearchingAccounts(true);
    setSearchErr("");
    setSearchResult(null);
    try {
      const res = await seafarerMatchingAccounts(seafarerId);
      setSearchResult(res);
    } catch (e) {
      setSearchErr(
        e?.message || "No se pudieron buscar cuentas coincidentes."
      );
    } finally {
      setSearchingAccounts(false);
    }
  }

  async function handleStaffLinkUser(userId) {
    const confirm = await Swal.fire({
      icon: "question",
      title: "Vincular usuario con perfil de náuta",
      html: `
        <p class="text-start mb-2">Antes de continuar, confirme:</p>
        <ul class="text-start small">
          <li>Verificó el documento de identidad del titular (adjunto o disponible).</li>
          <li>Los datos coinciden con la ficha de gente de mar / náuta.</li>
          <li>Si el nombre de la cuenta no coincide, se actualizará automáticamente al de la ficha PNN.</li>
        </ul>
        <p class="text-start small text-muted mb-0">No es obligatorio que el titular se presente en persona.</p>
      `,
      input: "checkbox",
      inputValue: 0,
      inputPlaceholder:
        "Confirmo que verifiqué la identidad del titular con su documento",
      showCancelButton: true,
      confirmButtonText: "Vincular",
      cancelButtonText: "Cancelar",
      preConfirm: (checked) => {
        if (!checked) {
          Swal.showValidationMessage(
            "Debe confirmar la verificación de identidad."
          );
        }
        return checked;
      },
    });
    if (!confirm.isConfirmed) return;

    setBusy(true);
    setErr("");
    try {
      const res = await staffLinkSeafarerUser(seafarerId, {
        userId,
        identityVerified: true,
      });
      await Swal.fire({
        icon: "success",
        title: "Vinculado",
        text: res?.msg || "Cuenta vinculada.",
        confirmButtonText: "Aceptar",
      });
      setSearchResult(null);
      await refresh();
    } catch (e) {
      setErr(e?.message || "No se pudo vincular.");
    } finally {
      setBusy(false);
    }
  }

  async function handleApproveLink(requestId) {
    const confirm = await Swal.fire({
      icon: "question",
      title: "Vincular usuario con perfil de náuta",
      html: `
        <p class="text-start mb-2">Antes de continuar, confirme:</p>
        <ul class="text-start small">
          <li>Revisó el documento de identidad adjunto a la solicitud.</li>
          <li>Los datos coinciden con la ficha de gente de mar / náuta.</li>
          <li>Si el nombre de la cuenta no coincide, se actualizará automáticamente al de la ficha PNN.</li>
        </ul>
        <p class="text-start small text-muted mb-0">No es obligatorio que el solicitante se presente en persona; la verificación puede hacerse a distancia.</p>
      `,
      input: "checkbox",
      inputValue: 0,
      inputPlaceholder:
        "Confirmo que verifiqué la identidad del solicitante con el documento adjunto",
      showCancelButton: true,
      confirmButtonText: "Vincular",
      cancelButtonText: "Cancelar",
      preConfirm: (checked) => {
        if (!checked) {
          Swal.showValidationMessage(
            "Debe confirmar la verificación de identidad."
          );
        }
        return checked;
      },
    });
    if (!confirm.isConfirmed) return;

    setBusy(true);
    setErr("");
    try {
      const res = await approveSeafarerLink(requestId, {
        identityVerified: true,
      });
      await Swal.fire({
        icon: "success",
        title: "Vinculado",
        text: res?.msg || "Cuenta vinculada.",
        confirmButtonText: "Aceptar",
      });
      await refresh();
    } catch (e) {
      setErr(e?.message || "No se pudo vincular.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRejectLink(requestId) {
    const { value: reason, isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Rechazar vinculación",
      input: "textarea",
      inputLabel: "Motivo del rechazo",
      inputPlaceholder: "Indique el motivo…",
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
      const res = await rejectSeafarerLink(requestId, { reason });
      await Swal.fire({
        icon: "success",
        title: "Rechazada",
        text: res?.msg || "Solicitud rechazada.",
        confirmButtonText: "Aceptar",
      });
      await refresh();
    } catch (e) {
      setErr(e?.message || "No se pudo rechazar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestUnlink() {
    const { value: reason, isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Desvincular perfil de la cuenta",
      html: "<p class='text-start small'>Se enviará un email a Marina Mercante de la unidad que realizó la vinculación para confirmar. Mientras exista el vínculo, DNI, pasaporte, nombres y apellidos quedan bloqueados.</p>",
      input: "textarea",
      inputLabel: "Motivo (obligatorio)",
      inputPlaceholder: "Indique el motivo…",
      showCancelButton: true,
      confirmButtonText: "Solicitar desvinculación",
      cancelButtonText: "Cancelar",
      inputValidator: (v) =>
        !String(v || "").trim() ? "Indique un motivo." : null,
    });
    if (!isConfirmed) return;
    setBusy(true);
    setErr("");
    try {
      const res = await requestSeafarerUnlink(seafarerId, { reason });
      await Swal.fire({
        icon: "success",
        title: "Solicitud enviada",
        text: res?.msg || "Aguarde confirmación.",
        confirmButtonText: "Aceptar",
      });
      await refresh();
    } catch (e) {
      setErr(e?.message || "No se pudo iniciar la desvinculación.");
    } finally {
      setBusy(false);
    }
  }

  async function handleApproveUnlink(requestId) {
    const confirm = await Swal.fire({
      icon: "question",
      title: "Confirmar desvinculación",
      text: "Se eliminará el vínculo entre la cuenta SICEN y esta ficha.",
      showCancelButton: true,
      confirmButtonText: "Confirmar desvinculación",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;
    setBusy(true);
    setErr("");
    try {
      const res = await approveSeafarerUnlink(requestId);
      await Swal.fire({
        icon: "success",
        title: "Desvinculado",
        text: res?.msg || "Cuenta desvinculada.",
        confirmButtonText: "Aceptar",
      });
      await refresh();
    } catch (e) {
      setErr(e?.message || "No se pudo desvincular.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRejectUnlink(requestId) {
    const { value: reason, isConfirmed } = await Swal.fire({
      icon: "info",
      title: "Rechazar desvinculación",
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
      const res = await rejectSeafarerUnlink(requestId, { reason });
      await Swal.fire({
        icon: "success",
        title: "Desvinculación rechazada",
        text: res?.msg || "La vinculación permanece activa.",
        confirmButtonText: "Aceptar",
      });
      await refresh();
    } catch (e) {
      setErr(e?.message || "No se pudo rechazar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenIdentityDocument(requestId) {
    try {
      const { blob, filename } =
        await fetchSeafarerLinkIdentityDocument(requestId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      void filename;
    } catch (e) {
      setErr(e?.message || "No se pudo abrir el documento adjunto.");
    }
  }

  if (!seafarerId) return null;

  const pending = data?.pendingRequests || [];
  const linked = data?.linkedAccount;
  const hasPendingOrLinked = pending.length > 0 || linked;
  const alreadyLinked =
    linked?.link?.status === "linked" ||
    linked?.link?.status === "pending_unlink";
  const accounts = searchResult?.accounts || [];
  const searched = searchResult?.searchedDocuments;

  return (
    <div
      id="seafarer-acciones-pendientes"
      className="card shadow-sm mb-4 border-primary border-opacity-25"
    >
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h5 className="card-title mb-0">Verificaciones</h5>
          {!alreadyLinked ? (
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              disabled={busy || searchingAccounts || loading}
              onClick={handleSearchAccounts}
            >
              {searchingAccounts
                ? "Buscando…"
                : "Buscar cuenta para vincular"}
            </button>
          ) : null}
        </div>
        {err ? (
          <ErrorAlert
            message={err}
            className="alert alert-danger py-2 mb-3 small"
          />
        ) : null}
        {searchErr ? (
          <ErrorAlert
            message={searchErr}
            className="alert alert-danger py-2 mb-3 small"
          />
        ) : null}

        {searchResult ? (
          <div className="border rounded p-3 mb-3 bg-body-tertiary">
            <div className="fw-semibold mb-1">Resultado de la búsqueda</div>
            <div className="small text-muted mb-2">
              Criterio: DNI <strong>{searched?.dni || "—"}</strong>
              {" · "}
              Pasaporte <strong>{searched?.passport || "—"}</strong>
            </div>
            {accounts.length === 0 ? (
              <p className="small text-muted mb-0">
                No se encontró ninguna cuenta de náuta con ese documento.
              </p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {accounts.map((acc) => (
                  <div
                    key={acc._id}
                    className="border rounded p-2 bg-body"
                  >
                    <div className="small mb-1">
                      <strong>
                        {acc.first_name} {acc.last_name}
                      </strong>{" "}
                      · {acc.email}
                    </div>
                    <div className="small mb-1">
                      Documento: {acc.documentId || "—"}
                      {acc.phone ? ` · Tel. ${acc.phone}` : ""}
                    </div>
                    <div className="mb-2">
                      <CoherenceBadges flags={acc.coherenceFlags} />
                    </div>
                    {acc.linkedToThis ? (
                      <span className="badge text-bg-success">
                        Ya vinculada a esta ficha
                      </span>
                    ) : null}
                    {acc.linkedToOther ? (
                      <span className="badge text-bg-danger">
                        Vinculada a otra ficha
                      </span>
                    ) : null}
                    {acc.pendingLinkRequestId ? (
                      <span className="badge text-bg-warning text-dark">
                        Tiene solicitud pendiente (usar botones arriba)
                      </span>
                    ) : null}
                    {acc.canLink ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm mt-2"
                        disabled={busy}
                        onClick={() => handleStaffLinkUser(acc._id)}
                      >
                        Vincular usuario con perfil de náuta
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {loading ? (
          <p className="text-muted small mb-0">Cargando…</p>
        ) : !hasPendingOrLinked ? (
          <p className="text-muted small mb-0">
            No hay solicitudes de vinculación ni cuenta vinculada para esta
            ficha.
            {!alreadyLinked
              ? " Use «Buscar cuenta para vincular» si el náuta ya tiene cuenta SICEN."
              : ""}
          </p>
        ) : (
          <div className="d-flex flex-column gap-3">
            {pending
              .filter((r) => r.type === "link")
              .map((r) => (
                <div
                  key={r._id}
                  className="border rounded p-3 bg-body-tertiary"
                >
                  <div className="fw-semibold mb-1">
                    Solicitud de vinculación
                  </div>
                  <div className="small mb-2">
                    Prefectura elegida:{" "}
                    <strong>{r.unitAcronym || "—"}</strong> ·{" "}
                    {formatDate(r.requestedAt)}
                  </div>
                  {r.user ? (
                    <div className="small mb-2">
                      <div>
                        <strong>Usuario:</strong> {r.user.first_name}{" "}
                        {r.user.last_name}
                      </div>
                      <div>
                        <strong>Email:</strong> {r.user.email}
                      </div>
                      <div>
                        <strong>Documento:</strong>{" "}
                        {r.user.documentId || "—"}
                      </div>
                      <div>
                        <strong>Teléfono:</strong> {r.user.phone || "—"}
                      </div>
                    </div>
                  ) : null}
                  <div className="mb-3">
                    <CoherenceBadges flags={r.coherenceFlags} />
                  </div>
                  {r.identityDocument?.available ? (
                    <div className="mb-3">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={busy}
                        onClick={() => handleOpenIdentityDocument(r._id)}
                      >
                        Ver documento adjunto
                        {r.identityDocument.originalName
                          ? ` (${r.identityDocument.originalName})`
                          : ""}
                      </button>
                    </div>
                  ) : null}
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy}
                      onClick={() => handleApproveLink(r._id)}
                    >
                      Vincular usuario con perfil de náuta
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      disabled={busy}
                      onClick={() => handleRejectLink(r._id)}
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}

            {pending
              .filter((r) => r.type === "unlink")
              .map((r) => (
                <div
                  key={r._id}
                  className="border rounded p-3 bg-warning bg-opacity-10"
                >
                  <div className="fw-semibold mb-1">
                    Desvinculación pendiente
                  </div>
                  <div className="small mb-2">
                    Unidad: <strong>{r.unitAcronym || "—"}</strong> ·{" "}
                    {formatDate(r.requestedAt)}
                  </div>
                  <div className="small mb-3">
                    <strong>Motivo:</strong> {r.reason || "—"}
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      disabled={busy}
                      onClick={() => handleApproveUnlink(r._id)}
                    >
                      Confirmar desvinculación
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      disabled={busy}
                      onClick={() => handleRejectUnlink(r._id)}
                    >
                      Rechazar desvinculación
                    </button>
                  </div>
                </div>
              ))}

            {linked &&
            linked.link?.status === "linked" &&
            !pending.some((r) => r.type === "unlink") ? (
              <div className="border rounded p-3">
                <div className="fw-semibold mb-1">Cuenta vinculada</div>
                <div className="small mb-2">
                  {linked.first_name} {linked.last_name} · {linked.email}
                  {linked.documentId ? ` · Doc. ${linked.documentId}` : ""}
                </div>
                <div className="small text-muted mb-3">
                  Vinculada en {linked.link?.linkedByUnit || "—"}
                  {linked.link?.linkedAt
                    ? ` · ${formatDate(linked.link.linkedAt)}`
                    : ""}
                  {linked.link?.linkedBy
                    ? ` · por ${linked.link.linkedBy}`
                    : ""}
                </div>
                <button
                  type="button"
                  className="btn btn-outline-warning btn-sm"
                  disabled={busy}
                  onClick={handleRequestUnlink}
                >
                  Desvincular perfil de la cuenta
                </button>
              </div>
            ) : null}

            {linked && linked.link?.status === "pending_unlink" ? (
              <div className="alert alert-warning py-2 mb-0 small">
                La cuenta {linked.email} tiene una desvinculación en trámite.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
