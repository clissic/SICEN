import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  skipperCancelSeafarerLink,
  skipperRequestSeafarerLink,
  skipperRequestSeafarerUnlink,
  skipperSeafarerLinkProfile,
  skipperSeafarerLinkStatus,
  listUnitsRegisteredPublic,
} from "../api/client.js";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";
import { SeafarerBasicDataTable } from "../components/seafarer/SeafarerBasicDataTable.jsx";
import {
  SeafarerCoursesSection,
  SeafarerHeldTitlesSection,
  SeafarerLicenseTableSection,
  SeafarerObservationsSection,
  SeafarerSanctionsSection,
} from "../components/seafarer/SeafarerConsultSections.jsx";
import {
  buildHeldTitleDisplayRows,
  buildLicenseConsultDisplayRows,
} from "../constants/seafarerConsult.js";

function formatDate(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-UY");
}

export function SkipperMyDocumentationPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState(null);
  const [units, setUnits] = useState([]);
  const [unitAcronym, setUnitAcronym] = useState("");
  const [identityFile, setIdentityFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await skipperSeafarerLinkStatus();
      setStatus(data);
    } catch (e) {
      setErr(e?.message || "No se pudo cargar el estado de vinculación.");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    let cancelled = false;
    listUnitsRegisteredPublic()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.units) ? data.units : [];
        setUnits(list);
      })
      .catch(() => {
        if (!cancelled) setUnits([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const linkStatus = status?.link?.status || "none";
  const isLinked =
    linkStatus === "linked" || linkStatus === "pending_unlink";

  useEffect(() => {
    if (!isLinked) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    skipperSeafarerLinkProfile()
      .then((data) => {
        if (!cancelled) setProfile(data?.seafarer ?? null);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLinked, linkStatus]);

  const unitsWithMm = useMemo(
    () => units.filter((u) => u.hasEmailMarinaMercante),
    [units]
  );

  const heldTitleRows = useMemo(
    () => buildHeldTitleDisplayRows(profile),
    [profile]
  );
  const licenseRows = useMemo(
    () => buildLicenseConsultDisplayRows(profile),
    [profile]
  );

  async function handleRequestLink() {
    if (!unitAcronym) {
      setErr("Seleccione la prefectura donde realizará el trámite.");
      return;
    }
    if (!identityFile) {
      setErr(
        "Adjunte una foto o PDF del frente de su cédula o de la hoja de datos del pasaporte."
      );
      return;
    }
    const confirm = await Swal.fire({
      icon: "question",
      title: "Solicitar vinculación",
      html: `Se enviará a <strong>Marina Mercante</strong> de <strong>${unitAcronym}</strong> su solicitud con el documento adjunto. El funcionario podrá verificar su identidad a distancia y vincular su cuenta.`,
      showCancelButton: true,
      confirmButtonText: "Solicitar",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    setErr("");
    try {
      const data = await skipperRequestSeafarerLink({
        unitAcronym,
        identityFile,
      });
      await Swal.fire({
        icon: "success",
        title: "Solicitud enviada",
        text:
          data?.msg ||
          "Aguarde la verificación a distancia por Marina Mercante.",
        confirmButtonText: "Aceptar",
      });
      setIdentityFile(null);
      await loadStatus();
    } catch (e) {
      setErr(e?.message || "No se pudo enviar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestUnlink() {
    const { value: reason, isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "Desvincular perfil de náuta",
      html: "<p class='text-start small'>Se enviará un aviso a Marina Mercante de la prefectura que realizó la vinculación para confirmar la desvinculación.</p>",
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
    setSubmitting(true);
    setErr("");
    try {
      const data = await skipperRequestSeafarerUnlink({ reason });
      await Swal.fire({
        icon: "success",
        title: "Solicitud enviada",
        text: data?.msg || "Aguarde la confirmación de Marina Mercante.",
        confirmButtonText: "Aceptar",
      });
      await loadStatus();
    } catch (e) {
      setErr(e?.message || "No se pudo iniciar la desvinculación.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Cancelar solicitud",
      text: "¿Desea cancelar la solicitud de vinculación pendiente?",
      showCancelButton: true,
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "Volver",
    });
    if (!confirm.isConfirmed) return;
    setSubmitting(true);
    setErr("");
    try {
      const data = await skipperCancelSeafarerLink();
      await Swal.fire({
        icon: "success",
        title: "Cancelada",
        text: data?.msg || "Solicitud cancelada.",
        confirmButtonText: "Aceptar",
      });
      await loadStatus();
    } catch (e) {
      setErr(e?.message || "No se pudo cancelar.");
    } finally {
      setSubmitting(false);
    }
  }

  const matched = status?.matchedSeafarer;

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Mi documentación</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/home">
            Menú principal
          </Link>
        </div>

        {err ? <ErrorAlert message={err} /> : null}
        {loading ? (
          <p className="text-muted">Cargando…</p>
        ) : (
          <>
            {linkStatus === "pending_link" ? (
              <div className="card shadow-sm mb-4">
                <div className="card-body">
                  <h5 className="card-title h6">Solicitud pendiente</h5>
                  <p className="mb-2">
                    Su solicitud está pendiente en{" "}
                    <strong>
                      {status?.activeRequest?.unitAcronym || "—"}
                    </strong>
                    . Marina Mercante verificará el documento que adjuntó y
                    podrá vincular su cuenta a distancia.
                  </p>
                  <p className="small text-muted mb-3">
                    Solicitada el{" "}
                    {formatDate(status?.activeRequest?.requestedAt)}.
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    disabled={submitting}
                    onClick={handleCancel}
                  >
                    Cancelar solicitud
                  </button>
                </div>
              </div>
            ) : null}

            {linkStatus === "pending_unlink" ? (
              <div className="alert alert-warning">
                Hay una <strong>desvinculación en trámite</strong>. Mientras
                tanto puede consultar su documentación. Aguarde la
                confirmación de Marina Mercante.
              </div>
            ) : null}

            {isLinked ? (
              <div className="mb-4">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                  <div className="alert alert-success py-2 mb-0 flex-grow-1">
                    Cuenta vinculada
                    {status?.link?.linkedByUnit
                      ? ` · verificada en ${status.link.linkedByUnit}`
                      : ""}
                    {status?.link?.linkedAt
                      ? ` · ${formatDate(status.link.linkedAt)}`
                      : ""}
                    .
                  </div>
                  {linkStatus === "linked" ? (
                    <button
                      type="button"
                      className="btn btn-outline-warning btn-sm"
                      disabled={submitting}
                      onClick={handleRequestUnlink}
                    >
                      Desvincular perfil de náuta
                    </button>
                  ) : null}
                </div>
                {profileLoading ? (
                  <p className="text-muted">Cargando documentación…</p>
                ) : profile ? (
                  <>
                    <SeafarerBasicDataTable seafarer={profile} />
                    <SeafarerHeldTitlesSection
                      rows={heldTitleRows}
                      readOnly
                      emptyMessage="Sin títulos registrados."
                    />
                    <SeafarerLicenseTableSection
                      sectionTitle="Licencias"
                      rows={licenseRows}
                      readOnly
                      emptyMessage="Sin licencias registradas."
                    />
                    <SeafarerCoursesSection seafarer={profile} readOnly />
                    <SeafarerSanctionsSection seafarer={profile} readOnly />
                    <SeafarerObservationsSection
                      seafarer={profile}
                      readOnly
                    />
                  </>
                ) : (
                  <div className="alert alert-secondary">
                    No se pudo cargar la ficha vinculada.
                  </div>
                )}
              </div>
            ) : null}

            {!isLinked && linkStatus !== "pending_link" ? (
              <div className="card shadow-sm">
                <div className="card-body">
                  <h5 className="card-title h6">
                    Vinculación con su perfil de náuta
                  </h5>
                  <p className="form-text">
                    Para gestionar su documentación (brevet, licencias, etc.)
                    debe vincular formalmente su cuenta SICEN con la ficha
                    cargada por la PNN. La coincidencia de DNI/pasaporte no
                    alcanza: adjunte una foto o PDF del frente de su cédula
                    (o de la hoja de datos del pasaporte) y elija la
                    prefectura. Un funcionario verificará su identidad a
                    distancia con ese adjunto.
                  </p>

                  {!status?.documentId ? (
                    <div className="alert alert-warning mb-0">
                      Su cuenta no tiene DNI/pasaporte registrado. Actualice
                      sus datos antes de solicitar la vinculación.
                    </div>
                  ) : !matched ? (
                    <div className="alert alert-secondary mb-0">
                      No encontramos un perfil de náuta con el documento{" "}
                      <strong>{status.documentId}</strong>. Acérquese a una
                      prefectura para registrarse en la base de gente de mar /
                      náutas deportivos.
                    </div>
                  ) : (
                    <>
                      <div className="border rounded p-3 mb-3 bg-body-tertiary">
                        <div className="small text-uppercase text-muted mb-1">
                          Perfil encontrado en la base PNN
                        </div>
                        <div className="fw-semibold">
                          {matched.fullName || "Sin nombre"}
                        </div>
                        <div className="small text-muted">
                          {matched.brevetCategory
                            ? `Brevet categoría ${matched.brevetCategory}`
                            : "Sin brevet UY_BD registrado"}
                        </div>
                      </div>

                      <div className="mb-3">
                        <label
                          className="form-label"
                          htmlFor="skipper-link-identity"
                        >
                          Documento de identidad (frente / hoja de datos)
                        </label>
                        <input
                          id="skipper-link-identity"
                          type="file"
                          className="form-control"
                          accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                          disabled={submitting}
                          onChange={(e) =>
                            setIdentityFile(e.target.files?.[0] || null)
                          }
                        />
                        <div className="form-text">
                          JPG, PNG, WEBP o PDF · máximo 5 MB. Se enviará
                          adjunto al email de Marina Mercante.
                        </div>
                      </div>

                      <div className="mb-3">
                        <label
                          className="form-label"
                          htmlFor="skipper-link-unit"
                        >
                          Prefectura que verificará su solicitud
                        </label>
                        <select
                          id="skipper-link-unit"
                          className="form-select"
                          value={unitAcronym}
                          onChange={(e) => setUnitAcronym(e.target.value)}
                          disabled={submitting}
                        >
                          <option value="">Seleccione…</option>
                          {unitsWithMm.map((u) => (
                            <option key={u.acronym} value={u.acronym}>
                              {u.acronym}
                              {u.name ? ` — ${u.name}` : ""}
                            </option>
                          ))}
                        </select>
                        {unitsWithMm.length === 0 ? (
                          <div className="form-text text-danger">
                            Ninguna prefectura tiene email de Marina Mercante
                            configurado. Contacte a la administración.
                          </div>
                        ) : (
                          <div className="form-text">
                            Elija su prefectura de preferencia. Se recomienda
                            elegir la más próxima a su domicilio por si es
                            necesaria su presentación en la misma para
                            finalizar la verificación.
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={submitting || !unitAcronym || !identityFile}
                        onClick={handleRequestLink}
                      >
                        {submitting
                          ? "Enviando…"
                          : "Solicitar vinculación"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Layout>
  );
}
