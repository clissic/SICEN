import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { updateVesselInspection, usersGetAll } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { InspectorCombobox } from "./InspectorCombobox.jsx";

/**
 * Etiqueta humana ("Rango Apellido, Nombre") para un usuario dado. Si
 * faltan datos, cae al email. Se usa para renderizar los inspectores ya
 * agregados al modal.
 */
function inspectorChipLabel(email, usersByEmail) {
  const key = String(email || "").toLowerCase().trim();
  if (!key) return "";
  const u = usersByEmail.get(key);
  if (!u) return key;
  const fn = String(u.first_name || "").trim();
  const ln = String(u.last_name || "").trim();
  const rank = String(u.rank || "").trim();
  const full = `${ln}${fn ? `, ${fn}` : ""}`.trim();
  if (rank && full) return `${rank} ${full}`;
  return full || key;
}

/**
 * Modal para completar la diligencia sobre un "Ingreso sin inspección".
 *
 * Recibe el registro (`vesselInspections`) y al confirmar manda un PUT con
 * `inspectionPerformed: true`, la fecha de inspección, las deficiencias
 * relevadas y, opcionalmente, el PDF del reporte. No expone detalles de
 * implementación al usuario (rutas, IDs, herramientas técnicas).
 *
 * Props:
 *   - open: boolean
 *   - inspection: objeto del listado (con `_id`, `vesselId` populado,
 *     `arrivalDate`, `arrivalPort`, `cialaPriority`).
 *   - onClose: () => void — cerrar el modal sin guardar.
 *   - onSaved: () => void — callback que dispara el refetch de la tabla.
 */
const PDF_MAX_BYTES = 1 * 1024 * 1024;

/** El modal manual usa z-index 1085; Swal por defecto queda por debajo (~1060). */
const SWAL_Z_ABOVE_MODAL = 1100;

function fireSwalAboveModal(options) {
  return Swal.fire({
    ...options,
    didOpen: () => {
      const container = Swal.getContainer?.();
      if (container) container.style.zIndex = String(SWAL_Z_ABOVE_MODAL);
    },
  });
}

const EMPTY_DEFICIENCY = {
  code: "",
  name: "",
  rule: "",
  actionsTaken: "",
  ISMrelated: false,
};

function parseActionsTaken(text) {
  return String(text ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
}

function vesselLabel(v) {
  if (!v || typeof v !== "object") return "—";
  const imo = String(v?.identification?.imoNumber ?? "").trim();
  const name = String(v?.generalInfo?.name ?? "").trim();
  if (imo && name) return `${imo} — ${name}`;
  return name || imo || "—";
}

/**
 * Las fechas del esquema (`arrivalDate`, `inspectionDate`) se guardan
 * como UTC midnight, así que formateamos en UTC para que el día mostrado
 * coincida con el día cargado por el usuario.
 */
function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Convierte una fecha del esquema (UTC midnight) al string `YYYY-MM-DD`
 * que espera un `<input type="date">`. Usamos los getters UTC para no
 * desplazar el día por el huso del navegador. Si quedara local, en
 * UTC-3 una inspección guardada como `2026-05-24T00:00Z` aparecería
 * precargada como `2026-05-23`, y al guardar se desplazaría un día más.
 */
function toDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function InspectionCompletionModal({
  open,
  inspection,
  onClose,
  onSaved,
}) {
  const { user } = useAuth();
  const currentUserEmail = String(user?.email || "").toLowerCase();

  /* Modo del modal:
       - "create": el registro es un ingreso pendiente (`inspectionPerformed:
         false`) y se está pasando a inspección realizada por primera vez.
       - "edit": el registro ya es una inspección realizada y el usuario
         viene a modificar sus datos (precarga todos los campos).
     Lo derivamos del propio registro para no requerir un prop extra. */
  const mode = inspection?.inspectionPerformed ? "edit" : "create";
  const isEdit = mode === "edit";

  const [inspectionDate, setInspectionDate] = useState("");
  const [deficiencies, setDeficiencies] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfError, setPdfError] = useState("");
  const [clientErr, setClientErr] = useState("");
  const [saving, setSaving] = useState(false);

  /* PDF "actual" para el modo edición: la URL pública del backend más una
     bandera para indicar que el usuario decidió quitarlo (sin subir uno
     nuevo). Al guardar, esa bandera se traduce a `removeInspectionPDF`. */
  const [existingPdfUrl, setExistingPdfUrl] = useState("");
  const [removeExistingPdf, setRemoveExistingPdf] = useState(false);

  /* Lista de inspectores que firman la diligencia. Se carga al abrir con
     un valor inicial según el modo (ver `useEffect` de reset) y el usuario
     la edita sumando/quitando entradas. Cada email se agrega una sola vez:
     el combobox excluye los ya presentes para evitar duplicados. */
  const [inspectorEmails, setInspectorEmails] = useState([]);

  /* Mapa email → user para renderizar cada inspector agregado con su
     "Rango Apellido, Nombre" en lugar del email crudo. Se carga una vez
     al abrir el modal y luego se enriquece con cualquier user que el
     combobox devuelva al elegirlo. */
  const [usersByEmail, setUsersByEmail] = useState(() => new Map());

  const arrivalDateValue = useMemo(
    () => toDateInputValue(inspection?.arrivalDate),
    [inspection?.arrivalDate]
  );

  useEffect(() => {
    if (!open || !inspection) return;
    const editing = Boolean(inspection.inspectionPerformed);

    if (editing) {
      /* Precarga: convertimos las deficiencias persistidas al shape de
         estado interno (actionsTaken como string para que el input lo
         muestre tal cual; se vuelve a parsear al guardar). */
      const presetDate = toDateInputValue(inspection.inspectionDate);
      setInspectionDate(presetDate || arrivalDateValue || "");
      const defs = Array.isArray(inspection.deficiencies)
        ? inspection.deficiencies.map((d) => ({
            code: String(d?.code ?? ""),
            name: String(d?.name ?? ""),
            rule: String(d?.rule ?? ""),
            actionsTaken: Array.isArray(d?.actionsTaken)
              ? d.actionsTaken.join(", ")
              : String(d?.actionsTaken ?? ""),
            ISMrelated: Boolean(d?.ISMrelated),
          }))
        : [];
      setDeficiencies(defs);

      setExistingPdfUrl(String(inspection.inspectionPDF || ""));
      setRemoveExistingPdf(false);

      /* Inspectores preseleccionados: respetamos el array completo del
         documento (soporta multi-firma). Normalizamos a lowercase y
         deduplicamos preservando el orden original. */
      const insps = Array.isArray(inspection.inspectors)
        ? inspection.inspectors
        : [];
      const seen = new Set();
      const initial = [];
      for (const raw of insps) {
        const e = String(raw || "").toLowerCase().trim();
        if (!e || seen.has(e)) continue;
        seen.add(e);
        initial.push(e);
      }
      setInspectorEmails(initial);
    } else {
      setInspectionDate(arrivalDateValue || "");
      setDeficiencies([]);
      setExistingPdfUrl("");
      setRemoveExistingPdf(false);
      /* En modo creación dejamos arrancado al usuario logueado como
         inspector (caso más frecuente). El operador puede quitarlo y/o
         agregar a otros desde el combobox. */
      setInspectorEmails(currentUserEmail ? [currentUserEmail] : []);
    }

    setPdfFile(null);
    setPdfError("");
    setClientErr("");
    setSaving(false);
  }, [open, inspection, arrivalDateValue, currentUserEmail]);

  /* Cargamos todos los usuarios una sola vez al abrir el modal para
     poder mostrar el nombre humano de cada inspector ya agregado
     (incluyendo inspectores históricos que pudieran no estar entre los
     OSERP activos que devuelve el combobox). Errores silenciosos: si
     falla, los chips muestran el email crudo como fallback. */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    usersGetAll()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.payload) ? data.payload : [];
        const map = new Map();
        for (const u of list) {
          const email = String(u?.email || "").toLowerCase().trim();
          if (!email) continue;
          map.set(email, u);
        }
        setUsersByEmail(map);
      })
      .catch(() => {
        /* silencioso; los chips caen al email crudo */
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape" && !saving) onClose?.();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, saving]);

  if (!open || !inspection) return null;

  function addDeficiency() {
    setDeficiencies((arr) => [...arr, { ...EMPTY_DEFICIENCY }]);
  }
  function removeDeficiency(idx) {
    setDeficiencies((arr) => arr.filter((_, i) => i !== idx));
  }
  function updateDeficiency(idx, field, value) {
    setDeficiencies((arr) => {
      const next = arr.slice();
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function handlePdfChange(e) {
    setPdfError("");
    const file = e.target.files?.[0] || null;
    if (!file) {
      setPdfFile(null);
      return;
    }
    const name = file.name?.toLowerCase() || "";
    const isPdf =
      file.type === "application/pdf" ||
      file.type === "application/octet-stream" ||
      name.endsWith(".pdf");
    if (!isPdf) {
      setPdfError("El archivo debe ser un PDF (.pdf).");
      e.target.value = "";
      setPdfFile(null);
      return;
    }
    if (file.size > PDF_MAX_BYTES) {
      setPdfError("El PDF no puede superar 1 MB.");
      e.target.value = "";
      setPdfFile(null);
      return;
    }
    setPdfFile(file);
    /* Si el usuario sube uno nuevo en modo edición, asumimos que quiere
       reemplazar el existente (la bandera de "quitar" deja de tener
       sentido y se anula). */
    if (isEdit) setRemoveExistingPdf(false);
  }

  function clearPdf() {
    setPdfFile(null);
    setPdfError("");
  }

  function discardExistingPdf() {
    setRemoveExistingPdf(true);
    setPdfFile(null);
    setPdfError("");
  }

  function keepExistingPdf() {
    setRemoveExistingPdf(false);
  }

  function addInspector(email, userDoc) {
    const e = String(email || "").toLowerCase().trim();
    if (!e) return;
    setInspectorEmails((arr) => (arr.includes(e) ? arr : [...arr, e]));
    /* Enriquecemos el mapa con el user devuelto por el combobox para
       que la etiqueta del chip se resuelva al instante. */
    if (userDoc && typeof userDoc === "object") {
      setUsersByEmail((prev) => {
        const next = new Map(prev);
        next.set(e, userDoc);
        return next;
      });
    }
  }

  function removeInspector(email) {
    const e = String(email || "").toLowerCase().trim();
    if (!e) return;
    setInspectorEmails((arr) => arr.filter((x) => x !== e));
  }

  function validate() {
    if (!inspectionDate) {
      return "Indique la fecha de inspección.";
    }
    if (arrivalDateValue && inspectionDate < arrivalDateValue) {
      return "La fecha de inspección no puede ser anterior a la de ingreso.";
    }
    if (inspectorEmails.length === 0) {
      return "Agregue al menos un inspector que haya realizado la diligencia.";
    }
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setClientErr("");
    const msg = validate();
    if (msg) {
      setClientErr(msg);
      return;
    }

    /* Enviar `inspectors` explícitamente evita el auto-tagging del
       backend y deja en claro quiénes hicieron la diligencia. El
       backend respeta el array tal cual (deduplica y baja a minúsculas). */
    const payload = {
      inspectionPerformed: true,
      inspectionDate,
      inspectors: inspectorEmails.slice(),
      deficiencies: deficiencies.map((d) => ({
        code: String(d.code || "").trim(),
        name: String(d.name || "").trim(),
        rule: String(d.rule || "").trim(),
        actionsTaken: parseActionsTaken(d.actionsTaken),
        ISMrelated: Boolean(d.ISMrelated),
      })),
    };

    /* En edición: si el usuario quitó el PDF existente y no subió uno
       nuevo, agregamos el flag para que el backend lo borre del disco. */
    if (isEdit && removeExistingPdf && !pdfFile) {
      payload.removeInspectionPDF = true;
    }

    setSaving(true);
    try {
      const data = await updateVesselInspection(
        inspection._id,
        payload,
        pdfFile || null
      );
      const fallbackMsg = isEdit
        ? "Los cambios se guardaron correctamente."
        : "La inspección se registró correctamente.";
      const successMsg = data?.msg || fallbackMsg;
      /* Cerrar el modal antes del Swal de éxito: el overlay del modal
         (z-index 1085) tapaba el diálogo de SweetAlert2 y el await nunca
         resolvía, dejando el botón en "Guardando…" para siempre. */
      onSaved?.();
      onClose?.();
      setSaving(false);
      await Swal.fire({
        icon: "success",
        title: isEdit ? "Inspección actualizada" : "Inspección registrada",
        text: successMsg,
        confirmButtonText: "Aceptar",
      });
    } catch (ex) {
      const errFallback = isEdit
        ? "No se pudo actualizar la inspección."
        : "No se pudo registrar la inspección.";
      const text = ex?.data?.msg || ex?.message || errFallback;
      await fireSwalAboveModal({
        icon: "error",
        title: "Error",
        text,
        confirmButtonText: "Aceptar",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1080 }}
        aria-hidden
      />
      <div
        className="modal fade show d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspection-completion-title"
        style={{ zIndex: 1085, overflowY: "auto" }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !saving) onClose?.();
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-xl">
          <form
            className="modal-content position-relative"
            onSubmit={handleSubmit}
          >
            <div
              className={`modal-header ${
                isEdit ? "bg-primary-subtle" : "bg-warning-subtle"
              }`}
            >
              <h5
                className="modal-title"
                id="inspection-completion-title"
              >
                {isEdit ? "Modificar inspección" : "Registrar inspección"}
              </h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                disabled={saving}
                onClick={onClose}
              />
            </div>

            <div className="modal-body">
              <div className="card bg-body-tertiary border-0 mb-3">
                <div className="card-body py-2 px-3">
                  <div className="row small g-2 align-items-center">
                    <div className="col-12 col-md-6">
                      <span className="text-muted">Buque: </span>
                      <span className="fw-semibold text-body">
                        {vesselLabel(inspection.vesselId)}
                      </span>
                    </div>
                    <div className="col-12 col-md-3">
                      <span className="text-muted">Ingreso: </span>
                      <span className="fw-semibold text-body">
                        {formatDate(inspection.arrivalDate)}
                      </span>
                    </div>
                    <div className="col-12 col-md-3">
                      <span className="text-muted">Puerto: </span>
                      <span className="fw-semibold text-body">
                        {inspection.arrivalPort || "—"}
                      </span>
                    </div>
                    <div className="col-12">
                      <span className="text-muted">Prioridad CIALA: </span>
                      <span className="fw-semibold text-body">
                        {String(inspection.cialaPriority || "Sin prioridad")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {clientErr ? (
                <div className="alert alert-danger py-2">{clientErr}</div>
              ) : null}

              <div className="row g-3">
                <div className="col-md-6">
                  <label
                    htmlFor="completion-inspection-date"
                    className="form-label"
                  >
                    Fecha de inspección{" "}
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    id="completion-inspection-date"
                    className="form-control"
                    value={inspectionDate}
                    min={arrivalDateValue || undefined}
                    onChange={(e) => setInspectionDate(e.target.value)}
                    required
                  />
                  <div className="form-text">
                    Día en que se realizó la diligencia. No puede ser
                    anterior a la fecha de ingreso.
                  </div>
                </div>

                <div className="col-md-6">
                  <label htmlFor="completion-pdf" className="form-label">
                    PDF de la inspección
                  </label>

                  {isEdit && existingPdfUrl && !removeExistingPdf && !pdfFile ? (
                    <div className="d-flex align-items-center gap-2 mb-2 p-2 border rounded bg-body-tertiary">
                      <i
                        className="bi bi-filetype-pdf"
                        aria-hidden
                        style={{ color: "#fd7e14", fontSize: "1.4rem" }}
                      />
                      <a
                        href={existingPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-decoration-none text-break"
                      >
                        Ver PDF actual
                      </a>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger ms-auto"
                        onClick={discardExistingPdf}
                        aria-label="Quitar PDF actual"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : null}

                  {isEdit && removeExistingPdf && !pdfFile ? (
                    <div className="alert alert-warning py-2 small d-flex align-items-center gap-2 mb-2">
                      <i className="bi bi-exclamation-triangle" aria-hidden />
                      <span className="me-auto">
                        El PDF actual se borrará al guardar los cambios.
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={keepExistingPdf}
                      >
                        Deshacer
                      </button>
                    </div>
                  ) : null}

                  <input
                    type="file"
                    id="completion-pdf"
                    className="form-control"
                    accept="application/pdf,.pdf"
                    onChange={handlePdfChange}
                  />
                  <div className="form-text">
                    {isEdit && existingPdfUrl && !removeExistingPdf
                      ? "Subí un archivo para reemplazar el PDF actual (máx. 1 MB)."
                      : "Adjuntá el reporte en formato PDF (máx. 1 MB)."}
                  </div>
                  {pdfError ? (
                    <div className="form-text text-danger small mt-1">
                      {pdfError}
                    </div>
                  ) : null}
                  {pdfFile ? (
                    <div className="d-flex align-items-center gap-2 mt-2">
                      <span className="badge text-bg-secondary">
                        <i
                          className="bi bi-file-earmark-pdf me-1"
                          aria-hidden
                        />
                        {pdfFile.name}
                      </span>
                      <span className="text-muted small">
                        {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary ms-auto"
                        onClick={clearPdf}
                        aria-label="Quitar PDF seleccionado"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="col-12">
                  <label
                    htmlFor="completion-inspector"
                    className="form-label"
                  >
                    Inspectores que realizaron la diligencia{" "}
                    <span className="text-danger">*</span>
                  </label>

                  {inspectorEmails.length === 0 ? (
                    <div className="alert alert-secondary py-2 small mb-2">
                      Aún no agregaste inspectores. Seleccioná al menos uno
                      del desplegable.
                    </div>
                  ) : (
                    <ul className="list-group list-group-flush mb-2 border rounded">
                      {inspectorEmails.map((email) => (
                        <li
                          key={email}
                          className="list-group-item d-flex align-items-center gap-2 py-2"
                        >
                          <i
                            className="bi bi-person-badge text-secondary"
                            aria-hidden
                          />
                          <span className="flex-grow-1 text-break">
                            {inspectorChipLabel(email, usersByEmail)}
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeInspector(email)}
                            aria-label={`Quitar inspector ${email}`}
                          >
                            <i className="bi bi-x-lg" aria-hidden /> Quitar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <InspectorCombobox
                    id="completion-inspector"
                    value=""
                    onChange={(email, userDoc) =>
                      addInspector(email, userDoc)
                    }
                    excludedEmails={inspectorEmails}
                    placeholder="Agregar inspector…"
                  />
                  <div className="form-text">
                    Sumá uno o varios Oficiales Supervisores por el Estado
                    Rector de Puertos que hayan firmado la diligencia. Los
                    que ya agregaste no aparecen en el desplegable.
                  </div>
                </div>
              </div>

              <hr className="my-4" />

              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                <div>
                  <h6 className="m-0">Deficiencias detectadas</h6>
                  <p className="text-muted small mb-0">
                    Opcional. Cargue una entrada por cada deficiencia relevada.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={addDeficiency}
                >
                  <i className="bi bi-plus-circle me-1" aria-hidden />
                  Agregar deficiencia
                </button>
              </div>

              {deficiencies.length === 0 ? (
                <div className="alert alert-secondary py-2 mb-0" role="status">
                  Aún no se cargaron deficiencias.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {deficiencies.map((d, idx) => (
                    <div
                      key={idx}
                      className="border rounded-3 p-3 bg-body-tertiary"
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong>Deficiencia #{idx + 1}</strong>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeDeficiency(idx)}
                          aria-label={`Quitar deficiencia ${idx + 1}`}
                        >
                          <i className="bi bi-trash" aria-hidden /> Quitar
                        </button>
                      </div>
                      <div className="row g-3">
                        <div className="col-md-3">
                          <label
                            htmlFor={`mod-def-code-${idx}`}
                            className="form-label small mb-1"
                          >
                            Código
                          </label>
                          <input
                            type="text"
                            id={`mod-def-code-${idx}`}
                            className="form-control"
                            placeholder="Ej.: 01101"
                            value={d.code}
                            onChange={(e) =>
                              updateDeficiency(idx, "code", e.target.value)
                            }
                          />
                        </div>
                        <div className="col-md-9">
                          <label
                            htmlFor={`mod-def-name-${idx}`}
                            className="form-label small mb-1"
                          >
                            Nombre / descripción
                          </label>
                          <input
                            type="text"
                            id={`mod-def-name-${idx}`}
                            className="form-control"
                            value={d.name}
                            onChange={(e) =>
                              updateDeficiency(idx, "name", e.target.value)
                            }
                          />
                        </div>
                        <div className="col-md-6">
                          <label
                            htmlFor={`mod-def-rule-${idx}`}
                            className="form-label small mb-1"
                          >
                            Regla / normativa
                          </label>
                          <input
                            type="text"
                            id={`mod-def-rule-${idx}`}
                            className="form-control"
                            placeholder="Ej.: SOLAS II-1/3-2"
                            value={d.rule}
                            onChange={(e) =>
                              updateDeficiency(idx, "rule", e.target.value)
                            }
                          />
                        </div>
                        <div className="col-md-6">
                          <label
                            htmlFor={`mod-def-actions-${idx}`}
                            className="form-label small mb-1"
                          >
                            Acciones tomadas (códigos)
                          </label>
                          <input
                            type="text"
                            id={`mod-def-actions-${idx}`}
                            className="form-control"
                            placeholder="Ej.: 10, 17"
                            value={d.actionsTaken}
                            onChange={(e) =>
                              updateDeficiency(
                                idx,
                                "actionsTaken",
                                e.target.value
                              )
                            }
                            inputMode="numeric"
                          />
                          <div className="form-text">
                            Separe los códigos con coma o espacio.
                          </div>
                        </div>
                        <div className="col-12">
                          <div className="form-check form-switch">
                            <input
                              type="checkbox"
                              role="switch"
                              id={`mod-def-ism-${idx}`}
                              className="form-check-input"
                              checked={d.ISMrelated}
                              onChange={(e) =>
                                updateDeficiency(
                                  idx,
                                  "ISMrelated",
                                  e.target.checked
                                )
                              }
                            />
                            <label
                              htmlFor={`mod-def-ism-${idx}`}
                              className="form-check-label"
                            >
                              Relacionada al Código IGS / ISM Code
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                aria-busy={saving}
              >
                {saving
                  ? "Guardando…"
                  : isEdit
                    ? "Guardar cambios"
                    : "Registrar inspección"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
