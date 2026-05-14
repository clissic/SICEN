import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  addVesselExtraCertificatePreset,
  getVesselForCertificates,
  saveVesselCertificate,
} from "../api/client.js";
import { CLASSIFICATION_SOCIETY_OPTIONS } from "../constants/classificationSocieties.js";
import { FLAG_STATE_OPTIONS } from "../constants/flagStates.js";
import {
  VESSEL_CERTIFICATE_OTHER_KEYS,
  VESSEL_CERTIFICATE_OTHER_OPTIONS,
  getOtherCertificateLabel,
} from "../constants/vesselCertificateOtherPresets.js";
import { VESSEL_CERTIFICATE_PRESETS } from "../constants/vesselCertificatePresets.js";
import { Layout } from "../components/Layout.jsx";
import {
  certificateExpiryUrgency,
  formatDateForTableDisplay,
  parseIsoDateString,
  toHtmlDateInputValue,
} from "../utils/dateDdMmYyyy.js";

function dash(v) {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? "—" : s;
}

function findStoredCertificate(certificates, preset) {
  const labelNorm = preset.label.trim().toLowerCase();
  for (const c of certificates) {
    if (!c || typeof c !== "object") continue;
    if (c.key === preset.key) return c;
    const name = String(
      c.certificate ?? c.name ?? c.tipo ?? c.title ?? ""
    )
      .trim()
      .toLowerCase();
    if (name && name === labelNorm) return c;
  }
  return null;
}

function pickField(stored, keys) {
  if (!stored || typeof stored !== "object") return "";
  for (const k of keys) {
    if (stored[k] != null && String(stored[k]).trim() !== "") {
      return String(stored[k]).trim();
    }
  }
  return "";
}

function formatAutoridadCell(s) {
  const kind = pickField(s, ["autoridadKind"]);
  const soc = pickField(s, ["autoridadSociety"]);
  const flag = pickField(s, ["autoridadFlagCountry"]);
  if (kind === "recognized" && soc) return soc;
  if (kind === "flag" && flag) return `${flag} (bandera)`;
  return pickField(s, ["autoridad", "authority", "entidad"]);
}

/** Orden: claves guardadas en el buque + otras presentes solo en `certificates`. */
function mergeExtraCertificateKeys(extraFromDoc, certificates) {
  const ordered = [];
  const seen = new Set();
  for (const k of extraFromDoc || []) {
    const key = String(k ?? "").trim();
    if (!VESSEL_CERTIFICATE_OTHER_KEYS.has(key) || seen.has(key)) continue;
    seen.add(key);
    ordered.push(key);
  }
  const arr = Array.isArray(certificates) ? certificates : [];
  for (const c of arr) {
    if (!c || typeof c !== "object") continue;
    const key = String(c.key ?? "").trim();
    if (!VESSEL_CERTIFICATE_OTHER_KEYS.has(key) || seen.has(key)) continue;
    seen.add(key);
    ordered.push(key);
  }
  return ordered;
}

function rowFromPreset(arr, preset) {
  const s = findStoredCertificate(arr, preset);
  return {
    key: preset.key,
    label: preset.label,
    otorgado: pickField(s, ["otorgado", "issued", "otorgadoEl", "fechaOtorgado"]),
    convalidacion: pickField(s, [
      "convalidacion",
      "convalidación",
      "convalidation",
    ]),
    vencimiento: pickField(s, [
      "vencimiento",
      "expiry",
      "fechaVencimiento",
      "vence",
    ]),
    puertoConvalidacion: pickField(s, [
      "puertoConvalidacion",
      "puertoConvalidación",
      "puerto_convalidacion",
      "puertoConvalidacionTexto",
    ]),
    autoridadKind: pickField(s, ["autoridadKind"]),
    autoridadSociety: pickField(s, ["autoridadSociety"]),
    autoridadFlagCountry: pickField(s, ["autoridadFlagCountry"]),
    autoridadDisplay: formatAutoridadCell(s),
  };
}

function buildCertificateRows(certificates, extraKeysOrdered) {
  const arr = Array.isArray(certificates) ? certificates : [];
  const baseRows = VESSEL_CERTIFICATE_PRESETS.map((preset) =>
    rowFromPreset(arr, preset)
  );
  const extraRows = (extraKeysOrdered || []).map((key) =>
    rowFromPreset(arr, { key, label: getOtherCertificateLabel(key) })
  );
  return [...baseRows, ...extraRows];
}

function emptyCertForm() {
  return {
    key: "",
    otorgado: "",
    convalidacion: "",
    vencimiento: "",
    puertoConvalidacion: "",
    autoridadKind: "",
    autoridadSociety: "",
    autoridadFlagCountry: "",
  };
}

/** Validación al guardar; devuelve mensaje de error o null. */
function validateCertificateModalForm(f) {
  if (!String(f.key ?? "").trim()) {
    return "Seleccione el certificado.";
  }
  const ot = parseIsoDateString(f.otorgado);
  if (!ot) {
    return "Otorgado: seleccione una fecha válida.";
  }
  const ven = parseIsoDateString(f.vencimiento);
  if (!ven) {
    return "Vencimiento: seleccione una fecha válida.";
  }
  if (ven < ot) {
    return "El vencimiento no puede ser anterior a la fecha de otorgamiento.";
  }
  const cStr = String(f.convalidacion ?? "").trim();
  if (cStr) {
    const co = parseIsoDateString(cStr);
    if (!co) {
      return "Convalidación: seleccione una fecha válida.";
    }
    if (co < ot) {
      return "La convalidación no puede ser anterior al otorgamiento.";
    }
    if (co > ven) {
      return "La convalidación no puede ser posterior al vencimiento.";
    }
  }
  const kind = String(f.autoridadKind ?? "").trim();
  if (kind !== "recognized" && kind !== "flag") {
    return "Seleccione el tipo de autoridad: sociedad reconocida o bandera.";
  }
  if (kind === "recognized") {
    if (!String(f.autoridadSociety ?? "").trim()) {
      return "Seleccione la sociedad de clasificación reconocida.";
    }
  } else if (!String(f.autoridadFlagCountry ?? "").trim()) {
    return "Seleccione el país de la autoridad (bandera).";
  }
  return null;
}

function toSavePayload(f) {
  const kind = String(f.autoridadKind ?? "").trim();
  return {
    key: String(f.key ?? "").trim(),
    otorgado: String(f.otorgado ?? "").trim(),
    convalidacion: String(f.convalidacion ?? "").trim(),
    vencimiento: String(f.vencimiento ?? "").trim(),
    puertoConvalidacion: String(f.puertoConvalidacion ?? "")
      .trim()
      .toUpperCase(),
    autoridadKind: kind === "recognized" || kind === "flag" ? kind : "",
    autoridadSociety:
      kind === "recognized" ? String(f.autoridadSociety ?? "").trim() : "",
    autoridadFlagCountry:
      kind === "flag" ? String(f.autoridadFlagCountry ?? "").trim() : "",
  };
}

/** Celda de vencimiento con aviso visual y disparador de popover (Bootstrap). */
function VencimientoTableCell({ rawVencimiento }) {
  const display = formatDateForTableDisplay(rawVencimiento);
  const shown = dash(display);
  const urgency = certificateExpiryUrgency(rawVencimiento);
  const isExpired = urgency === "expired";
  const isSoon = urgency === "soon";

  const tdClass =
    isExpired
      ? "small text-nowrap bg-danger bg-opacity-10 text-danger fw-bold"
      : isSoon
        ? "small text-nowrap bg-warning bg-opacity-25 fw-semibold text-dark"
        : "small text-nowrap";

  const iconClass = isExpired
    ? "bi bi-exclamation-triangle-fill text-danger"
    : isSoon
      ? "bi bi-exclamation-triangle-fill"
      : "";

  const popoverText = isExpired
    ? "Certificado vencido"
    : isSoon
      ? "Certificado próximo a vencer"
      : "";

  return (
    <td className={tdClass}>
      <span className="d-inline-flex align-items-center gap-1 flex-wrap">
        <span>{shown}</span>
        {isExpired || isSoon ? (
          <i
            className={iconClass}
            style={
              isSoon
                ? {
                    fontSize: "1.05rem",
                    cursor: "help",
                    color: "#d97706",
                  }
                : { fontSize: "1.05rem", cursor: "help" }
            }
            data-sicen-cert-expiry-icon="1"
            data-sicen-popover-content={popoverText}
            tabIndex={0}
            role="img"
            aria-label={popoverText}
          />
        ) : null}
      </span>
    </td>
  );
}

export function ShipCertificatesPage() {
  const { vesselId } = useParams();
  const certificatesTableRef = useRef(null);
  const [vessel, setVessel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certModalMode, setCertModalMode] = useState("add");
  const [certForm, setCertForm] = useState(emptyCertForm);
  const [saving, setSaving] = useState(false);
  const [otherCertChoice, setOtherCertChoice] = useState("");
  const [addingOtherCert, setAddingOtherCert] = useState(false);

  const load = useCallback(async () => {
    if (!vesselId?.trim()) {
      setErr("Identificador de buque no válido.");
      setVessel(null);
      setLoading(false);
      return;
    }
    setErr("");
    setLoading(true);
    try {
      const data = await getVesselForCertificates(vesselId);
      setVessel(data?.vessel ?? null);
    } catch (e) {
      setVessel(null);
      setErr(e.message || e.data?.msg || "No se pudo cargar el buque.");
    } finally {
      setLoading(false);
    }
  }, [vesselId]);

  useEffect(() => {
    load();
  }, [load]);

  const mergedExtraCertificateKeys = useMemo(
    () =>
      mergeExtraCertificateKeys(
        vessel?.extraCertificatePresetKeys,
        vessel?.certificates
      ),
    [vessel?.certificates, vessel?.extraCertificatePresetKeys]
  );

  const tableRows = useMemo(
    () => buildCertificateRows(vessel?.certificates, mergedExtraCertificateKeys),
    [vessel?.certificates, mergedExtraCertificateKeys]
  );

  useEffect(() => {
    const root = certificatesTableRef.current;
    if (!root || typeof window === "undefined" || loading || err || !vessel) {
      return undefined;
    }
    const Bootstrap = window.bootstrap;
    if (!Bootstrap?.Popover) return undefined;

    const els = root.querySelectorAll("[data-sicen-cert-expiry-icon]");
    const instances = [];
    for (const el of els) {
      const content = el.getAttribute("data-sicen-popover-content");
      if (!content) continue;
      try {
        instances.push(
          new Bootstrap.Popover(el, {
            trigger: "hover focus",
            placement: "top",
            container: "body",
            sanitize: true,
            content,
          })
        );
      } catch {
        /* noop */
      }
    }
    return () => {
      for (const p of instances) {
        try {
          p.dispose();
        } catch {
          /* noop */
        }
      }
    };
  }, [tableRows, loading, err, vessel]);

  const otherCertDropdownOptions = useMemo(() => {
    const present = new Set(mergedExtraCertificateKeys);
    return VESSEL_CERTIFICATE_OTHER_OPTIONS.filter((o) => !present.has(o.key));
  }, [mergedExtraCertificateKeys]);

  const certModalKeyOptions = useMemo(() => {
    if (
      certModalMode === "edit" &&
      certForm.key &&
      VESSEL_CERTIFICATE_OTHER_KEYS.has(certForm.key)
    ) {
      return [
        {
          key: certForm.key,
          label: getOtherCertificateLabel(certForm.key),
        },
      ];
    }
    return VESSEL_CERTIFICATE_PRESETS;
  }, [certModalMode, certForm.key]);

  function setCert(k, v) {
    setCertForm((prev) => ({ ...prev, [k]: v }));
  }

  function setAutoridadKind(v) {
    setCertForm((prev) => ({
      ...prev,
      autoridadKind: v,
      autoridadSociety: "",
      autoridadFlagCountry: "",
    }));
  }

  function openAddModal() {
    setCertModalMode("add");
    setCertForm(emptyCertForm());
    setCertModalOpen(true);
  }

  function openEditModal(row) {
    setCertModalMode("edit");
    setCertForm({
      key: row.key,
      otorgado: toHtmlDateInputValue(row.otorgado),
      convalidacion: toHtmlDateInputValue(row.convalidacion),
      vencimiento: toHtmlDateInputValue(row.vencimiento),
      puertoConvalidacion: row.puertoConvalidacion,
      autoridadKind: row.autoridadKind || "",
      autoridadSociety: row.autoridadSociety || "",
      autoridadFlagCountry: row.autoridadFlagCountry || "",
    });
    setCertModalOpen(true);
  }

  function closeCertModal() {
    setCertModalOpen(false);
    setSaving(false);
  }

  async function handleAddOtherCertificate() {
    const key = String(otherCertChoice ?? "").trim();
    if (!key) {
      await Swal.fire({
        icon: "info",
        title: "Seleccione un certificado",
        text: "Elija un tipo en el desplegable antes de agregar.",
        confirmButtonText: "Aceptar",
      });
      return;
    }
    setAddingOtherCert(true);
    try {
      const data = await addVesselExtraCertificatePreset(vesselId, key);
      setVessel(data?.vessel ?? null);
      setOtherCertChoice("");
    } catch (ex) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo agregar",
        text:
          ex.message ||
          ex.data?.msg ||
          "No se pudo actualizar la lista de certificados.",
        confirmButtonText: "Aceptar",
      });
    } finally {
      setAddingOtherCert(false);
    }
  }

  async function handleSaveCertificate(e) {
    e.preventDefault();
    const validationErr = validateCertificateModalForm(certForm);
    if (validationErr) {
      await Swal.fire({
        icon: "error",
        title: "No se puede guardar",
        text: validationErr,
        confirmButtonText: "Aceptar",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = toSavePayload(certForm);
      const data = await saveVesselCertificate(vesselId, payload);
      setVessel(data?.vessel ?? null);
      await Swal.fire({
        icon: "success",
        title: "Certificado guardado",
        text: "El certificado se cargó con éxito.",
        confirmButtonText: "Aceptar",
      });
      closeCertModal();
    } catch (ex) {
      await Swal.fire({
        icon: "error",
        title: "Error al guardar",
        text: ex.message || ex.data?.msg || "No se pudo guardar el certificado.",
        confirmButtonText: "Aceptar",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
          <div>
            <h3 className="m-0">Certificados del buque</h3>
            {vessel?.name ? (
              <p className="text-muted small mb-0 mt-1">{vessel.name}</p>
            ) : null}
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={openAddModal}
              disabled={loading || !!err}
            >
              Agregar certificado
            </button>
            <Link
              className="btn btn-outline-secondary"
              to="/base-buques/todos"
            >
              Volver a consultar buques
            </Link>
          </div>
        </div>

        {err ? <div className="alert alert-danger py-2">{err}</div> : null}

        {loading ? (
          <p className="text-muted small mb-0">Cargando certificados…</p>
        ) : vessel && !err ? (
          <>
            <div className="card shadow-sm">
            <div className="table-responsive" ref={certificatesTableRef}>
              <table className="table table-sm table-striped table-bordered mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Certificado</th>
                    <th>Otorgado</th>
                    <th>Convalidación</th>
                    <th>Vencimiento</th>
                    <th>Puerto convalidación</th>
                    <th>Autoridad</th>
                    <th className="text-end text-nowrap"> </th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.key}>
                      <td className="small text-break" style={{ minWidth: "12rem" }}>
                        {row.label}
                      </td>
                      <td className="small text-nowrap">
                        {dash(formatDateForTableDisplay(row.otorgado))}
                      </td>
                      <td className="small text-nowrap">
                        {dash(formatDateForTableDisplay(row.convalidacion))}
                      </td>
                      <VencimientoTableCell rawVencimiento={row.vencimiento} />
                      <td className="small">{dash(row.puertoConvalidacion)}</td>
                      <td className="small">
                        {dash(row.autoridadDisplay)}
                      </td>
                      <td className="text-end text-nowrap">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => openEditModal(row)}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

            <section className="mt-4" aria-labelledby="other-certs-heading">
              <h2 id="other-certs-heading" className="h5 mb-3">
                Agregar otros certificados:
              </h2>
              <div className="d-flex flex-wrap align-items-end gap-2">
                <div className="flex-grow-1" style={{ minWidth: "18rem" }}>
                  <label
                    className="form-label small mb-1"
                    htmlFor="other-cert-select"
                  >
                    Certificado opcional
                  </label>
                  <select
                    id="other-cert-select"
                    className="form-select"
                    value={otherCertChoice}
                    onChange={(e) => setOtherCertChoice(e.target.value)}
                    disabled={
                      loading ||
                      !!err ||
                      addingOtherCert ||
                      otherCertDropdownOptions.length === 0
                    }
                  >
                    <option value="">Seleccione…</option>
                    {otherCertDropdownOptions.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddOtherCertificate}
                  disabled={
                    loading ||
                    !!err ||
                    addingOtherCert ||
                    !otherCertChoice ||
                    otherCertDropdownOptions.length === 0
                  }
                >
                  {addingOtherCert ? "Agregando…" : "Agregar"}
                </button>
              </div>
              {otherCertDropdownOptions.length === 0 ? (
                <p className="text-muted small mt-2 mb-0">
                  Todos los certificados opcionales de la lista ya figuran en la
                  tabla.
                </p>
              ) : null}
            </section>
          </>
        ) : null}
      </div>

      {certModalOpen ? (
        <>
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cert-modal-title"
          >
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="cert-modal-title">
                    {certModalMode === "add"
                      ? "Agregar certificado"
                      : "Editar certificado"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Cerrar"
                    onClick={closeCertModal}
                    disabled={saving}
                  />
                </div>
                <form onSubmit={handleSaveCertificate}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label
                        className="form-label small"
                        htmlFor="cert-form-key"
                      >
                        Certificado
                      </label>
                      <select
                        id="cert-form-key"
                        className="form-select"
                        disabled={certModalMode === "edit" || saving}
                        value={certForm.key}
                        onChange={(e) => setCert("key", e.target.value)}
                      >
                        <option value="">Seleccione…</option>
                        {certModalKeyOptions.map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="row g-3 mb-1">
                      <div className="col-12 col-lg-4">
                        <label
                          className="form-label small"
                          htmlFor="cert-otorgado"
                        >
                          Otorgado
                        </label>
                        <input
                          id="cert-otorgado"
                          type="date"
                          className="form-control"
                          disabled={saving}
                          value={certForm.otorgado}
                          onChange={(e) => setCert("otorgado", e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <div className="col-12 col-lg-4">
                        <label
                          className="form-label small"
                          htmlFor="cert-convalidacion"
                        >
                          Convalidación
                        </label>
                        <input
                          id="cert-convalidacion"
                          type="date"
                          className="form-control"
                          disabled={saving}
                          value={certForm.convalidacion}
                          onChange={(e) =>
                            setCert("convalidacion", e.target.value)
                          }
                          autoComplete="off"
                        />
                      </div>
                      <div className="col-12 col-lg-4">
                        <label
                          className="form-label small"
                          htmlFor="cert-vencimiento"
                        >
                          Vencimiento
                        </label>
                        <input
                          id="cert-vencimiento"
                          type="date"
                          className="form-control"
                          disabled={saving}
                          value={certForm.vencimiento}
                          onChange={(e) =>
                            setCert("vencimiento", e.target.value)
                          }
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label
                        className="form-label small"
                        htmlFor="cert-puerto"
                      >
                        Puerto convalidación
                      </label>
                      <input
                        id="cert-puerto"
                        type="text"
                        className="form-control"
                        style={{ textTransform: "uppercase" }}
                        disabled={saving}
                        value={certForm.puertoConvalidacion}
                        onChange={(e) =>
                          setCert(
                            "puertoConvalidacion",
                            e.target.value.toUpperCase()
                          )
                        }
                        autoComplete="off"
                      />
                    </div>

                    <div className="row g-3 align-items-end">
                      <div className="col-12 col-lg-6">
                        <label
                          className="form-label small"
                          htmlFor="cert-autoridad-tipo"
                        >
                          Autoridad — tipo
                        </label>
                        <select
                          id="cert-autoridad-tipo"
                          className="form-select"
                          disabled={saving}
                          value={certForm.autoridadKind}
                          onChange={(e) => setAutoridadKind(e.target.value)}
                        >
                          <option value="">Seleccione…</option>
                          <option value="recognized">Sociedad reconocida</option>
                          <option value="flag">Bandera</option>
                        </select>
                      </div>
                      <div className="col-12 col-lg-6">
                        {certForm.autoridadKind === "recognized" ? (
                          <>
                            <label
                              className="form-label small"
                              htmlFor="cert-autoridad-sociedad"
                            >
                              Sociedad reconocida
                            </label>
                            <select
                              id="cert-autoridad-sociedad"
                              className="form-select"
                              disabled={saving}
                              value={certForm.autoridadSociety}
                              onChange={(e) =>
                                setCert("autoridadSociety", e.target.value)
                              }
                            >
                              <option value="">
                                Seleccione sociedad de clasificación…
                              </option>
                              {CLASSIFICATION_SOCIETY_OPTIONS.map((label) => (
                                <option key={label} value={label}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : certForm.autoridadKind === "flag" ? (
                          <>
                            <label
                              className="form-label small"
                              htmlFor="cert-autoridad-pais"
                            >
                              País (bandera)
                            </label>
                            <select
                              id="cert-autoridad-pais"
                              className="form-select"
                              disabled={saving}
                              value={certForm.autoridadFlagCountry}
                              onChange={(e) =>
                                setCert("autoridadFlagCountry", e.target.value)
                              }
                            >
                              <option value="">Seleccione país…</option>
                              {FLAG_STATE_OPTIONS.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <>
                            <label
                              className="form-label small text-muted"
                              htmlFor="cert-autoridad-detalle"
                            >
                              Detalle
                            </label>
                            <select
                              id="cert-autoridad-detalle"
                              className="form-select"
                              disabled
                              value=""
                            >
                              <option value="">Primero elija tipo de autoridad</option>
                            </select>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={closeCertModal}
                      disabled={saving}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving ? "Guardando…" : "Guardar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop fade show"
            aria-hidden="true"
            role="presentation"
            onClick={() => {
              if (!saving) closeCertModal();
            }}
          />
        </>
      ) : null}
    </Layout>
  );
}
