import { useEffect, useMemo, useRef, useState } from "react";
import { ErrorAlert } from "../ErrorAlert.jsx";
import "../../styles/seafarer-consult-sections.css";
import {
  confirmDelete as confirmDeleteAlert,
  escapeHtml,
} from "../../utils/confirmDelete.js";
import {
  courseFormToEntry,
  heldLicenseDisplayRowToForm,
  heldLicenseFormToEntry,
  heldTitleDisplayRowToForm,
  heldTitleFormToEntry,
  INITIAL_SEAFARER_HELD_LICENSE_FORM,
  INITIAL_SEAFARER_HELD_TITLE_FORM,
  INITIAL_SEAFARER_COURSE_FORM,
  INITIAL_SEAFARER_OBSERVATION_FORM,
  INITIAL_SEAFARER_SANCTION_FORM,
  observationFormToEntry,
  sanctionFormToEntry,
  displayHeldCredentialStatus,
  SEAFARER_HELD_TITLE_USER_STATUS_OPTIONS,
} from "../../constants/seafarerConsult.js";
import { getHeldLicenseCategorySelectOptions } from "../../constants/seafarerLicenseCategories.js";
import { certificateExpiryUrgency } from "../../utils/dateDdMmYyyy.js";
import {
  displaySeafarerDate,
  displaySeafarerText,
  seafarerDateToInputValue,
} from "../../utils/seafarerDisplay.js";
import {
  LicenceCatalogPicker,
  licenceCatalogEntryId,
} from "./LicenceCatalogPicker.jsx";
import { formatTitleCatalogLabel } from "../../constants/titleCatalogForm.js";
import {
  TitleCatalogPicker,
  titleCatalogEntryId,
} from "./TitleCatalogPicker.jsx";

function EmptyRow({ cols, text }) {
  return (
    <tr className="seafarer-consult-table-empty">
      <td colSpan={cols} className="text-center py-3">
        {text}
      </td>
    </tr>
  );
}

const CONSULT_TABLE_CLASS =
  "table table-sm table-bordered mb-0 seafarer-consult-table";
const CONSULT_ADD_FORM_CLASS = "seafarer-consult-add-form";

function SectionCard({ title, children, addLabel, onAdd, adding, addErr, addOk, domId }) {
  return (
    <div id={domId} className="card shadow-sm mb-4">
      <div className="card-body">
        <h5 className="card-title mb-3">{title}</h5>
        {children}
        {addErr ? (
          <ErrorAlert message={addErr} className="alert alert-danger py-2 mt-3 mb-0 small" />
        ) : null}
        {addOk ? (
          <div className="alert alert-success py-2 mt-3 mb-0 small">{addOk}</div>
        ) : null}
        <div className="mt-3">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={onAdd}
          >
            {addLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, id, children }) {
  return (
    <div className="col-12 col-md-6 col-lg-4">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

/** Celda de vencimiento con aviso (certificados / títulos / licencias). */
function ConsultMetadataExpiryCell({
  expirationDate,
  expiredLabel = "Vencido",
  soonLabel = "Próximo a vencer",
}) {
  const display = displaySeafarerDate(expirationDate);
  const raw = seafarerDateToInputValue(expirationDate);
  const urgency = raw ? certificateExpiryUrgency(raw) : null;
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

  const popoverText = isExpired ? expiredLabel : isSoon ? soonLabel : "";

  return (
    <td className={tdClass}>
      <span className="d-inline-flex align-items-center gap-1 flex-wrap">
        <span>{display}</span>
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
            data-sicen-seafarer-meta-expiry="1"
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

/**
 * @param {object} props
 * @param {any[]} props.rows — `buildHeldTitleDisplayRows(seafarer)`
 * @param {(entry: object) => Promise<boolean>} props.onAddTitle
 * @param {(heldEntryId: string, entry: object) => Promise<boolean>} props.onUpdateHeldTitle
 * @param {(heldEntryId: string) => Promise<boolean>} props.onDeleteHeldTitle
 * @param {boolean} props.adding
 * @param {string} props.addErr
 * @param {string} props.addOk
 */
export function SeafarerHeldTitlesSection({
  rows,
  onAddTitle,
  onUpdateHeldTitle,
  onDeleteHeldTitle,
  adding,
  addErr,
  addOk,
}) {
  const [open, setOpen] = useState(false);
  const [dateErr, setDateErr] = useState("");
  const [editingHeldEntryId, setEditingHeldEntryId] = useState(null);
  const [form, setForm] = useState(() => ({
    ...INITIAL_SEAFARER_HELD_TITLE_FORM,
  }));
  const titlesTableRef = useRef(null);

  useEffect(() => {
    const root = titlesTableRef.current;
    if (!root || typeof window === "undefined") return undefined;
    const Bootstrap = window.bootstrap;
    if (!Bootstrap?.Popover) return undefined;

    const els = root.querySelectorAll("[data-sicen-seafarer-meta-expiry]");
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
  }, [rows]);

  function resetFormAndEdit() {
    setEditingHeldEntryId(null);
    setForm({ ...INITIAL_SEAFARER_HELD_TITLE_FORM });
    setDateErr("");
  }

  function set(k, v) {
    if (k === "issuedDate" || k === "expirationDate") setDateErr("");
    setForm((f) => ({ ...f, [k]: v }));
  }

  function startEdit(row) {
    if (row.source !== "held" || !row.heldEntryId) return;
    setDateErr("");
    setEditingHeldEntryId(row.heldEntryId);
    setForm(heldTitleDisplayRowToForm(row));
    setOpen(true);
  }

  async function confirmDelete(row) {
    if (row.source !== "held" || !row.heldEntryId) return;
    const label =
      [row.code, row.name].filter((x) => String(x).trim()).join(" — ") ||
      "este título";
    const result = await confirmDeleteAlert({
      resource: "título",
      summaryHtml: `
        <p class="mb-2">Se quitará de la ficha del marinero el siguiente título:</p>
        <ul class="mb-2 ps-3">
          <li><strong>${escapeHtml(label)}</strong></li>
        </ul>
      `,
    });
    if (!result.isConfirmed) return;
    await onDeleteHeldTitle(row.heldEntryId);
  }

  async function submitAdd() {
    if (!String(form.titleId ?? "").trim()) {
      setDateErr(
        "Seleccione un título del catálogo (clic en un resultado de la lista).",
      );
      return;
    }
    setDateErr("");
    const iss = String(form.issuedDate ?? "").trim();
    const exp = String(form.expirationDate ?? "").trim();
    if (!iss) {
      setDateErr("La fecha de emisión es obligatoria.");
      return;
    }
    if (!exp) {
      setDateErr("La fecha de vencimiento es obligatoria.");
      return;
    }
    if (exp <= iss) {
      setDateErr(
        "La fecha de vencimiento debe ser posterior a la fecha de emisión.",
      );
      return;
    }
    const payload = heldTitleFormToEntry(form);
    if (form.isRenewal) {
      payload.isRenewal = true;
    }
    let ok;
    if (editingHeldEntryId) {
      ok = await onUpdateHeldTitle(editingHeldEntryId, payload);
    } else {
      ok = await onAddTitle(payload);
    }
    if (ok) {
      resetFormAndEdit();
      setOpen(false);
    }
  }

  const titleCols = 8;

  return (
    <SectionCard
      title="Títulos"
      domId="seafarer-consult-titles"
      addLabel={open ? "Ocultar formulario" : "Agregar título"}
      onAdd={() => {
        resetFormAndEdit();
        setOpen((v) => !v);
      }}
      adding={adding}
      addErr={addErr}
      addOk={addOk}
    >
      <div className="table-responsive" ref={titlesTableRef}>
        <table className={CONSULT_TABLE_CLASS}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Número</th>
              <th>Emisión</th>
              <th>Vencimiento</th>
              <th>Aplicación</th>
              <th>Estado</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow cols={titleCols} text="Sin títulos registrados." />
            ) : (
              rows.map((r) => (
                <tr key={r.rowKey}>
                  <td>{displaySeafarerText(r.code)}</td>
                  <td>{displaySeafarerText(r.name)}</td>
                  <td>{displaySeafarerText(r.number)}</td>
                  <td>{displaySeafarerDate(r.issuedDate)}</td>
                  <ConsultMetadataExpiryCell
                    expirationDate={r.expirationDate}
                    expiredLabel="Título vencido"
                    soonLabel="Título próximo a vencer"
                  />
                  <td>{displaySeafarerText(r.catalogApplication)}</td>
                  <td>{displayHeldCredentialStatus(r.status)}</td>
                  <td className="text-center text-nowrap">
                    {r.source === "held" && r.heldEntryId ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-body p-1 me-1"
                          data-sicen-popover="Modificar"
                          aria-label="Modificar"
                          disabled={adding}
                          onClick={() => startEdit(r)}
                        >
                          <i className="bi bi-pencil-square" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-danger p-1"
                          data-sicen-popover="Eliminar"
                          aria-label="Eliminar"
                          disabled={adding}
                          onClick={() => confirmDelete(r)}
                        >
                          <i className="bi bi-trash3" aria-hidden />
                        </button>
                      </>
                    ) : (
                      <span className="text-muted small">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {open ? (
        <div className={CONSULT_ADD_FORM_CLASS}>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <h6 className="mb-0">
              {editingHeldEntryId ? "Modificar título" : "Nuevo título"}
            </h6>
            {editingHeldEntryId ? (
              <button
                type="button"
                className="btn btn-link btn-sm py-0"
                disabled={adding}
                onClick={() => {
                  resetFormAndEdit();
                }}
              >
                Cancelar edición
              </button>
            ) : null}
          </div>
          <div className="row g-2">
            <div className="col-12 col-lg-8">
              <label className="form-label" htmlFor="held-tit-search">
                Título *
              </label>
              <TitleCatalogPicker
                inputId="held-tit-search"
                disabled={adding}
                selected={
                  form.titleId
                    ? {
                        _id: form.titleId,
                        label:
                          form._pickerLabel ||
                          `ID ${String(form.titleId).slice(0, 8)}…`,
                      }
                    : null
                }
                onSelect={(doc) => {
                  setDateErr("");
                  const tid = titleCatalogEntryId(doc);
                  setForm((f) => ({
                    ...f,
                    titleId: tid,
                    _pickerLabel: formatTitleCatalogLabel(doc),
                  }));
                }}
                onClear={() => {
                  setDateErr("");
                  setForm((f) => ({
                    ...f,
                    titleId: "",
                    _pickerLabel: "",
                  }));
                }}
              />
            </div>
            <Field label="Número (título / certificado)" id="held-tit-num">
              <input
                id="held-tit-num"
                className="form-control form-control-sm"
                value={form.number}
                onChange={(e) => set("number", e.target.value)}
              />
            </Field>
            <Field label="Instituto emisor" id="held-tit-inst">
              <input
                id="held-tit-inst"
                className="form-control form-control-sm"
                value={form.issuingInstitution}
                onChange={(e) => set("issuingInstitution", e.target.value)}
              />
            </Field>
            <Field label="Fecha de emisión *" id="held-tit-issued">
              <input
                id="held-tit-issued"
                type="date"
                required
                className="form-control form-control-sm"
                value={form.issuedDate}
                onChange={(e) => set("issuedDate", e.target.value)}
              />
            </Field>
            <Field label="Fecha de vencimiento *" id="held-tit-exp">
              <input
                id="held-tit-exp"
                type="date"
                required
                className="form-control form-control-sm"
                value={form.expirationDate}
                onChange={(e) => set("expirationDate", e.target.value)}
              />
            </Field>
            <Field label="Estado" id="held-tit-st">
              <select
                id="held-tit-st"
                className="form-select form-select-sm"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {SEAFARER_HELD_TITLE_USER_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="form-text small mb-0 mt-1">
                Si la fecha de vencimiento ya pasó, el sistema guardará el estado
                como Vencido.
              </p>
            </Field>
            <div className="col-12">
              <div className="form-check mt-1">
                <input
                  id="held-tit-renewal"
                  type="checkbox"
                  className="form-check-input"
                  checked={Boolean(form.isRenewal)}
                  disabled={adding}
                  onChange={(e) => set("isRenewal", e.target.checked)}
                />
                <label
                  className="form-check-label small"
                  htmlFor="held-tit-renewal"
                >
                  Renovación
                </label>
              </div>
            </div>
          </div>
          {dateErr ? (
            <div className="alert alert-warning py-2 small mt-3 mb-0">{dateErr}</div>
          ) : null}
          <button
            type="button"
            className="btn btn-primary btn-sm mt-3"
            disabled={adding}
            onClick={submitAdd}
          >
            {editingHeldEntryId ? "Guardar cambios" : "Guardar título"}
          </button>
        </div>
      ) : null}
    </SectionCard>
  );
}

/**
 * @param {object} props
 * @param {string} props.sectionTitle
 * @param {any[]} props.rows — `buildLicenseConsultDisplayRows(seafarer)`
 * @param {string} props.addToggleLabel
 * @param {string} props.formHeading
 * @param {string} props.saveButtonLabel
 * @param {string} props.emptyMessage
 * @param {(entry: object) => Promise<boolean>} props.onAddHeldLicense
 * @param {(heldEntryId: string, entry: object) => Promise<boolean>} props.onUpdateHeldLicense
 * @param {(heldEntryId: string) => Promise<boolean>} props.onDeleteHeldLicense
 * @param {boolean} props.adding
 * @param {string} props.addErr
 * @param {string} props.addOk
 */
export function SeafarerLicenseTableSection({
  sectionTitle,
  rows,
  addToggleLabel,
  formHeading,
  saveButtonLabel,
  emptyMessage,
  onAddHeldLicense,
  onUpdateHeldLicense,
  onDeleteHeldLicense,
  adding,
  addErr,
  addOk,
}) {
  const [open, setOpen] = useState(false);
  const [dateErr, setDateErr] = useState("");
  const [editingHeldEntryId, setEditingHeldEntryId] = useState(null);
  const [form, setForm] = useState(() => ({
    ...INITIAL_SEAFARER_HELD_LICENSE_FORM,
  }));
  const licensesTableRef = useRef(null);

  const licenseCategoryOptions = useMemo(
    () =>
      getHeldLicenseCategorySelectOptions({
        code: form._catalogCode,
        nameEs: form._catalogNameEs,
        nameEn: form._catalogNameEn,
      }),
    [form._catalogCode, form._catalogNameEs, form._catalogNameEn],
  );

  useEffect(() => {
    const root = licensesTableRef.current;
    if (!root || typeof window === "undefined") return undefined;
    const Bootstrap = window.bootstrap;
    if (!Bootstrap?.Popover) return undefined;

    const els = root.querySelectorAll("[data-sicen-seafarer-meta-expiry]");
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
  }, [rows]);

  function resetFormAndEdit() {
    setEditingHeldEntryId(null);
    setForm({ ...INITIAL_SEAFARER_HELD_LICENSE_FORM });
    setDateErr("");
  }

  function setField(k, v) {
    if (k === "issuedDate" || k === "expirationDate") setDateErr("");
    setForm((f) => ({ ...f, [k]: v }));
  }

  function startEdit(row) {
    if (row.source !== "held" || !row.heldEntryId) return;
    setDateErr("");
    setEditingHeldEntryId(row.heldEntryId);
    setForm(heldLicenseDisplayRowToForm(row));
    setOpen(true);
  }

  async function confirmDelete(row) {
    if (row.source !== "held" || !row.heldEntryId) return;
    const label =
      [row.code, row.name].filter((x) => String(x).trim()).join(" — ") ||
      "esta licencia";
    const result = await confirmDeleteAlert({
      resource: "licencia",
      summaryHtml: `
        <p class="mb-2">Se quitará de la ficha del marinero la siguiente licencia:</p>
        <ul class="mb-2 ps-3">
          <li><strong>${escapeHtml(label)}</strong></li>
        </ul>
      `,
    });
    if (!result.isConfirmed) return;
    await onDeleteHeldLicense(row.heldEntryId);
  }

  async function submitAdd() {
    if (!String(form.licenseId ?? "").trim()) {
      setDateErr(
        "Seleccione una licencia del catálogo (clic en un resultado de la lista).",
      );
      return;
    }
    setDateErr("");
    const iss = String(form.issuedDate ?? "").trim();
    const exp = String(form.expirationDate ?? "").trim();
    if (!iss) {
      setDateErr("La fecha de emisión es obligatoria.");
      return;
    }
    if (!exp) {
      setDateErr("La fecha de vencimiento es obligatoria.");
      return;
    }
    if (exp <= iss) {
      setDateErr(
        "La fecha de vencimiento debe ser posterior a la fecha de emisión.",
      );
      return;
    }
    const payload = heldLicenseFormToEntry(form);
    if (form.isRenewal) {
      payload.isRenewal = true;
    }
    let ok;
    if (editingHeldEntryId) {
      ok = await onUpdateHeldLicense(editingHeldEntryId, payload);
    } else {
      ok = await onAddHeldLicense(payload);
    }
    if (ok) {
      resetFormAndEdit();
      setOpen(false);
    }
  }

  const licenseCols = 9;

  return (
    <SectionCard
      title={sectionTitle}
      domId="seafarer-consult-licenses"
      addLabel={open ? "Ocultar formulario" : addToggleLabel}
      onAdd={() => {
        resetFormAndEdit();
        setOpen((v) => !v);
      }}
      adding={adding}
      addErr={addErr}
      addOk={addOk}
    >
      <div className="table-responsive" ref={licensesTableRef}>
        <table className={CONSULT_TABLE_CLASS}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Número</th>
              <th>Emisión</th>
              <th>Vencimiento</th>
              <th>Estado</th>
              <th className="text-end">Renovaciones</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow cols={licenseCols} text={emptyMessage} />
            ) : (
              rows.map((r) => (
                <tr key={r.rowKey}>
                  <td>{displaySeafarerText(r.code)}</td>
                  <td>{displaySeafarerText(r.name)}</td>
                  <td>{displaySeafarerText(r.category)}</td>
                  <td>{displaySeafarerText(r.number)}</td>
                  <td>{displaySeafarerDate(r.issuedDate)}</td>
                  <ConsultMetadataExpiryCell
                    expirationDate={r.expirationDate}
                    expiredLabel="Licencia vencida"
                    soonLabel="Licencia próxima a vencer"
                  />
                  <td>{displayHeldCredentialStatus(r.status)}</td>
                  <td className="text-end">
                    {r.renewalsCount == null
                      ? "—"
                      : String(r.renewalsCount)}
                  </td>
                  <td className="text-center text-nowrap">
                    {r.source === "held" && r.heldEntryId ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-body p-1 me-1"
                          data-sicen-popover="Modificar"
                          aria-label="Modificar"
                          disabled={adding}
                          onClick={() => startEdit(r)}
                        >
                          <i className="bi bi-pencil-square" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-danger p-1"
                          data-sicen-popover="Eliminar"
                          aria-label="Eliminar"
                          disabled={adding}
                          onClick={() => confirmDelete(r)}
                        >
                          <i className="bi bi-trash3" aria-hidden />
                        </button>
                      </>
                    ) : (
                      <span className="text-muted small">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {open ? (
        <div className={CONSULT_ADD_FORM_CLASS}>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <h6 className="mb-0">
              {editingHeldEntryId ? "Modificar licencia" : formHeading}
            </h6>
            {editingHeldEntryId ? (
              <button
                type="button"
                className="btn btn-link btn-sm py-0"
                disabled={adding}
                onClick={() => {
                  resetFormAndEdit();
                }}
              >
                Cancelar edición
              </button>
            ) : null}
          </div>
          <div className="row g-2">
            <div className="col-12 col-lg-8">
              <label className="form-label" htmlFor="held-lic-search">
                Licencia (catálogo) *
              </label>
              <LicenceCatalogPicker
                inputId="held-lic-search"
                disabled={adding}
                selected={
                  form.licenseId
                    ? {
                        _id: form.licenseId,
                        label:
                          form._pickerLabel ||
                          `ID ${String(form.licenseId).slice(0, 8)}…`,
                      }
                    : null
                }
                onSelect={(doc) => {
                  setDateErr("");
                  const es = String(doc?.name?.es ?? "").trim();
                  const en = String(doc?.name?.en ?? "").trim();
                  const code = String(doc?.code ?? "").trim();
                  const name = es || en;
                  const lid = licenceCatalogEntryId(doc);
                  setForm((f) => ({
                    ...f,
                    licenseId: lid,
                    _pickerLabel: [code, name].filter(Boolean).join(" — "),
                    category: "",
                    _catalogCode: code,
                    _catalogNameEs: es,
                    _catalogNameEn: en,
                  }));
                }}
                onClear={() => {
                  setDateErr("");
                  setForm((f) => ({
                    ...f,
                    licenseId: "",
                    _pickerLabel: "",
                    category: "",
                    _catalogCode: "",
                    _catalogNameEs: "",
                    _catalogNameEn: "",
                  }));
                }}
              />
            </div>
            <Field label="Categoría" id="held-lic-category">
              {licenseCategoryOptions.length > 0 ? (
                <select
                  id="held-lic-category"
                  className="form-select form-select-sm"
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                >
                  <option value="">Seleccione categoría…</option>
                  {licenseCategoryOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  {form.category &&
                  !licenseCategoryOptions.includes(form.category) ? (
                    <option value={form.category}>
                      {form.category} (valor actual)
                    </option>
                  ) : null}
                </select>
              ) : (
                <input
                  id="held-lic-category"
                  type="text"
                  className="form-control form-control-sm"
                  placeholder={
                    form.licenseId
                      ? "Sin lista fija para esta licencia (texto libre)"
                      : "Elija una licencia del catálogo"
                  }
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  disabled={!form.licenseId}
                />
              )}
            </Field>
            <Field label="Número" id="held-lic-num">
              <input
                id="held-lic-num"
                className="form-control form-control-sm"
                value={form.number}
                onChange={(e) => setField("number", e.target.value)}
              />
            </Field>
            <Field label="Fecha de emisión *" id="held-lic-issued">
              <input
                id="held-lic-issued"
                type="date"
                required
                className="form-control form-control-sm"
                value={form.issuedDate}
                onChange={(e) => setField("issuedDate", e.target.value)}
              />
            </Field>
            <Field label="Fecha de vencimiento *" id="held-lic-exp">
              <input
                id="held-lic-exp"
                type="date"
                required
                className="form-control form-control-sm"
                value={form.expirationDate}
                onChange={(e) => setField("expirationDate", e.target.value)}
              />
            </Field>
            <Field label="Estado" id="held-lic-st">
              <select
                id="held-lic-st"
                className="form-select form-select-sm"
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
              >
                {SEAFARER_HELD_TITLE_USER_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="form-text small mb-0 mt-1">
                Si la fecha de vencimiento ya pasó, el sistema guardará el estado
                como Vencido.
              </p>
            </Field>
            <div className="col-12">
              <div className="form-check mt-1">
                <input
                  id="held-lic-renewal"
                  type="checkbox"
                  className="form-check-input"
                  checked={Boolean(form.isRenewal)}
                  disabled={adding}
                  onChange={(e) => setField("isRenewal", e.target.checked)}
                />
                <label
                  className="form-check-label small"
                  htmlFor="held-lic-renewal"
                >
                  Renovación
                </label>
              </div>
            </div>
          </div>
          {dateErr ? (
            <div className="alert alert-warning py-2 small mt-3 mb-0">{dateErr}</div>
          ) : null}
          <button
            type="button"
            className="btn btn-primary btn-sm mt-3"
            disabled={adding}
            onClick={submitAdd}
          >
            {editingHeldEntryId ? "Guardar cambios" : saveButtonLabel}
          </button>
        </div>
      ) : null}
    </SectionCard>
  );
}
export function SeafarerCoursesSection({ seafarer, onAddCourse, adding, addErr, addOk }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_SEAFARER_COURSE_FORM);
  const rows = Array.isArray(seafarer?.courses) ? seafarer.courses : [];

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submitAdd() {
    const ok = await onAddCourse(courseFormToEntry(form));
    if (ok) {
      setForm(INITIAL_SEAFARER_COURSE_FORM);
      setOpen(false);
    }
  }

  return (
    <SectionCard
      title="Cursos y capacitaciones"
      addLabel={open ? "Ocultar formulario" : "Agregar curso"}
      onAdd={() => setOpen((v) => !v)}
      adding={adding}
      addErr={addErr}
      addOk={addOk}
    >
      <div className="table-responsive">
        <table className={CONSULT_TABLE_CLASS}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Institución</th>
              <th>Aprobación</th>
              <th>Vencimiento</th>
              <th>Certificado</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow cols={8} text="Sin cursos registrados." />
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.code}-${r.name}-${i}`}>
                  <td>{displaySeafarerText(r.code)}</td>
                  <td>{displaySeafarerText(r.name)}</td>
                  <td>{displaySeafarerText(r.type)}</td>
                  <td>
                    {displaySeafarerText(r.institution?.name)}
                    {r.institution?.code
                      ? ` (${displaySeafarerText(r.institution.code)})`
                      : ""}
                  </td>
                  <td>{displaySeafarerDate(r.approvalDate)}</td>
                  <td>{displaySeafarerDate(r.expirationDate)}</td>
                  <td>{displaySeafarerText(r.certificate?.number)}</td>
                  <td>{displaySeafarerText(r.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {open ? (
        <div className={CONSULT_ADD_FORM_CLASS}>
          <h6 className="mb-3">Nuevo curso</h6>
          <div className="row g-2">
            <Field label="Código" id="c-code">
              <input
                id="c-code"
                className="form-control form-control-sm"
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
              />
            </Field>
            <Field label="Nombre" id="c-name">
              <input
                id="c-name"
                className="form-control form-control-sm"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>
            <Field label="Tipo" id="c-type">
              <input
                id="c-type"
                className="form-control form-control-sm"
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
              />
            </Field>
            <Field label="Institución" id="c-inst">
              <input
                id="c-inst"
                className="form-control form-control-sm"
                value={form.institutionName}
                onChange={(e) => set("institutionName", e.target.value)}
              />
            </Field>
            <Field label="Código institución" id="c-instc">
              <input
                id="c-instc"
                className="form-control form-control-sm"
                value={form.institutionCode}
                onChange={(e) => set("institutionCode", e.target.value)}
              />
            </Field>
            <Field label="Aprobación" id="c-apr">
              <input
                id="c-apr"
                type="date"
                className="form-control form-control-sm"
                value={form.approvalDate}
                onChange={(e) => set("approvalDate", e.target.value)}
              />
            </Field>
            <Field label="Vencimiento" id="c-exp">
              <input
                id="c-exp"
                type="date"
                className="form-control form-control-sm"
                value={form.expirationDate}
                onChange={(e) => set("expirationDate", e.target.value)}
              />
            </Field>
            <Field label="Nº certificado" id="c-cert">
              <input
                id="c-cert"
                className="form-control form-control-sm"
                value={form.certificateNumber}
                onChange={(e) => set("certificateNumber", e.target.value)}
              />
            </Field>
            <Field label="Estado" id="c-st">
              <input
                id="c-st"
                className="form-control form-control-sm"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              />
            </Field>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm mt-3"
            disabled={adding}
            onClick={submitAdd}
          >
            Guardar curso
          </button>
        </div>
      ) : null}
    </SectionCard>
  );
}

export function SeafarerSanctionsSection({
  seafarer,
  onAddSanction,
  adding,
  addErr,
  addOk,
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_SEAFARER_SANCTION_FORM);
  const rows = Array.isArray(seafarer?.sanctions) ? seafarer.sanctions : [];

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submitAdd() {
    const ok = await onAddSanction(sanctionFormToEntry(form));
    if (ok) {
      setForm(INITIAL_SEAFARER_SANCTION_FORM);
      setOpen(false);
    }
  }

  return (
    <SectionCard
      title="Sanciones"
      addLabel={open ? "Ocultar formulario" : "Agregar sanción"}
      onAdd={() => setOpen((v) => !v)}
      adding={adding}
      addErr={addErr}
      addOk={addOk}
    >
      <div className="table-responsive">
        <table className={CONSULT_TABLE_CLASS}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Fecha</th>
              <th>Vencimiento</th>
              <th>Autoridad</th>
              <th>Resolución</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow cols={8} text="Sin sanciones registradas." />
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.code}-${r.type}-${i}`}>
                  <td>{displaySeafarerText(r.code)}</td>
                  <td>{displaySeafarerText(r.type)}</td>
                  <td>{displaySeafarerText(r.description)}</td>
                  <td>{displaySeafarerDate(r.issueDate)}</td>
                  <td>{displaySeafarerDate(r.expirationDate)}</td>
                  <td>{displaySeafarerText(r.authority)}</td>
                  <td>{displaySeafarerText(r.resolutionNumber)}</td>
                  <td>{displaySeafarerText(r.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {open ? (
        <div className={CONSULT_ADD_FORM_CLASS}>
          <h6 className="mb-3">Nueva sanción</h6>
          <div className="row g-2">
            <Field label="Código" id="s-code">
              <input
                id="s-code"
                className="form-control form-control-sm"
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
              />
            </Field>
            <Field label="Tipo *" id="s-type">
              <input
                id="s-type"
                className="form-control form-control-sm"
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
              />
            </Field>
            <Field label="Descripción" id="s-desc">
              <input
                id="s-desc"
                className="form-control form-control-sm"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            <Field label="Fecha" id="s-issue">
              <input
                id="s-issue"
                type="date"
                className="form-control form-control-sm"
                value={form.issueDate}
                onChange={(e) => set("issueDate", e.target.value)}
              />
            </Field>
            <Field label="Vencimiento" id="s-exp">
              <input
                id="s-exp"
                type="date"
                className="form-control form-control-sm"
                value={form.expirationDate}
                onChange={(e) => set("expirationDate", e.target.value)}
              />
            </Field>
            <Field label="Autoridad" id="s-auth">
              <input
                id="s-auth"
                className="form-control form-control-sm"
                value={form.authority}
                onChange={(e) => set("authority", e.target.value)}
              />
            </Field>
            <Field label="Nº resolución" id="s-res">
              <input
                id="s-res"
                className="form-control form-control-sm"
                value={form.resolutionNumber}
                onChange={(e) => set("resolutionNumber", e.target.value)}
              />
            </Field>
            <Field label="Estado" id="s-st">
              <input
                id="s-st"
                className="form-control form-control-sm"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              />
            </Field>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm mt-3"
            disabled={adding}
            onClick={submitAdd}
          >
            Guardar sanción
          </button>
        </div>
      ) : null}
    </SectionCard>
  );
}

export function SeafarerObservationsSection({
  seafarer,
  onAddObservation,
  adding,
  addErr,
  addOk,
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_SEAFARER_OBSERVATION_FORM);
  const rows = Array.isArray(seafarer?.observations) ? seafarer.observations : [];

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submitAdd() {
    const ok = await onAddObservation(observationFormToEntry(form));
    if (ok) {
      setForm(INITIAL_SEAFARER_OBSERVATION_FORM);
      setOpen(false);
    }
  }

  return (
    <SectionCard
      title="Observaciones"
      addLabel={open ? "Ocultar formulario" : "Agregar observación"}
      onAdd={() => setOpen((v) => !v)}
      adding={adding}
      addErr={addErr}
      addOk={addOk}
    >
      <div className="table-responsive">
        <table className={CONSULT_TABLE_CLASS}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Categoría</th>
              <th>Texto</th>
              <th>Registrado por</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow cols={4} text="Sin observaciones registradas." />
            ) : (
              rows.map((r, i) => (
                <tr key={`obs-${i}`}>
                  <td>{displaySeafarerDate(r.date)}</td>
                  <td>{displaySeafarerText(r.category)}</td>
                  <td>{displaySeafarerText(r.text)}</td>
                  <td>{displaySeafarerText(r.registeredBy)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {open ? (
        <div className={CONSULT_ADD_FORM_CLASS}>
          <h6 className="mb-3">Nueva observación</h6>
          <div className="row g-2">
            <Field label="Fecha" id="o-date">
              <input
                id="o-date"
                type="date"
                className="form-control form-control-sm"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>
            <Field label="Categoría" id="o-cat">
              <input
                id="o-cat"
                className="form-control form-control-sm"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              />
            </Field>
            <div className="col-12">
              <label className="form-label" htmlFor="o-text">
                Texto *
              </label>
              <textarea
                id="o-text"
                className="form-control form-control-sm"
                rows={3}
                value={form.text}
                onChange={(e) => set("text", e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm mt-3"
            disabled={adding || !String(form.text).trim()}
            onClick={submitAdd}
          >
            Guardar observación
          </button>
        </div>
      ) : null}
    </SectionCard>
  );
}
