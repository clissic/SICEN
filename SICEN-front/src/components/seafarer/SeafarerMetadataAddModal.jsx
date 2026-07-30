import { useEffect, useState } from "react";
import { ErrorAlert } from "../ErrorAlert.jsx";
import {
  addSeafarerCourse,
  addSeafarerSanction,
  createLicenceCatalogEntry,
  createTitleCatalogEntry,
  findSeafarerByDocument,
  updateLicenceCatalogEntry,
  updateTitleCatalogEntry,
} from "../../api/client.js";
import {
  initialLicenceCatalogForm,
  LICENCE_CATALOG_CATEGORY_OPTIONS,
  licenceApiRowToForm,
  licenceCatalogFormToPayload,
} from "../../constants/licenceCatalogForm.js";
import {
  courseFormToEntry,
  INITIAL_SEAFARER_COURSE_FORM,
  INITIAL_SEAFARER_SANCTION_FORM,
  sanctionFormToEntry,
} from "../../constants/seafarerConsult.js";
import {
  formatSeafarerIdentification,
  isCcDocumentSearchType,
  normalizeSeafarerCcNumber,
  normalizeSeafarerCcSeries,
  normalizeSeafarerDocumentNumber,
  SEAFARER_DOCUMENT_SEARCH_OPTIONS,
} from "../../constants/seafarerCreateForm.js";
import {
  INITIAL_TITLE_CATALOG_FORM,
  TITLE_CATALOG_DEPARTMENTS,
  TITLE_CATALOG_LEVELS,
  TITLE_CATALOG_REGULATIONS,
  titleCatalogApiRowToForm,
  titleCatalogFormToPayload,
} from "../../constants/titleCatalogForm.js";
import "../../styles/seafarer-consult-sections.css";

/** @typedef {"license"|"course"|"sanction"} AddKind */

/**
 * @param {object} props
 * @param {AddKind|null} props.kind
 * @param {boolean} props.show
 * @param {() => void} [props.onClose]
 * @param {() => void} [props.onSaved]
 * @param {"title"|"license"} [props.catalogueEntryKind] — clase en catálogo (solo si `kind === "license"`)
 * @param {object|null} [props.editingTitle] — documento de catálogo `titles` en edición
 */
export function SeafarerMetadataAddModal({
  kind,
  show,
  onClose,
  onSaved,
  editingTitle = null,
  editingLicence = null,
  catalogueEntryKind = "license",
}) {
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [ccSeries, setCcSeries] = useState("");
  const [ccNumber, setCcNumber] = useState("");
  const [finding, setFinding] = useState(false);
  const [findErr, setFindErr] = useState("");
  const [person, setPerson] = useState(null);

  const [titleCatalogForm, setTitleCatalogForm] = useState(() => ({
    ...INITIAL_TITLE_CATALOG_FORM,
  }));
  const [licenceCatalogForm, setLicenceCatalogForm] = useState(() =>
    initialLicenceCatalogForm("license"),
  );
  const [courseForm, setCourseForm] = useState(INITIAL_SEAFARER_COURSE_FORM);
  const [sanctionForm, setSanctionForm] = useState(INITIAL_SEAFARER_SANCTION_FORM);

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const isCatalogLicence = kind === "license";

  useEffect(() => {
    if (!show) return;
    setDocumentType("");
    setDocumentNumber("");
    setCcSeries("");
    setCcNumber("");
    setFinding(false);
    setFindErr("");
    setPerson(null);
    if (kind === "license" && catalogueEntryKind === "title") {
      setTitleCatalogForm(
        editingTitle
          ? titleCatalogApiRowToForm(editingTitle)
          : { ...INITIAL_TITLE_CATALOG_FORM },
      );
      setLicenceCatalogForm(initialLicenceCatalogForm("license"));
    } else if (kind === "license") {
      setLicenceCatalogForm(
        editingLicence
          ? licenceApiRowToForm(editingLicence)
          : initialLicenceCatalogForm("license"),
      );
      setTitleCatalogForm({ ...INITIAL_TITLE_CATALOG_FORM });
    } else {
      setLicenceCatalogForm(initialLicenceCatalogForm("license"));
      setTitleCatalogForm({ ...INITIAL_TITLE_CATALOG_FORM });
    }
    setCourseForm(INITIAL_SEAFARER_COURSE_FORM);
    setSanctionForm(INITIAL_SEAFARER_SANCTION_FORM);
    setSaving(false);
    setSaveErr("");
  }, [show, kind, editingLicence, editingTitle, catalogueEntryKind]);

  function onDocTypeChange(next) {
    setDocumentType(next);
    setDocumentNumber((n) => normalizeSeafarerDocumentNumber(next, n));
    if (next !== "CC") {
      setCcSeries("");
      setCcNumber("");
    }
  }

  async function handleFindPerson() {
    setFindErr("");
    setPerson(null);
    if (!String(documentType).trim()) {
      setFindErr("Seleccione el tipo de documento.");
      return;
    }
    if (isCcDocumentSearchType(documentType)) {
      if (!String(ccSeries).trim()) {
        setFindErr("Indique la serie de la credencial cívica.");
        return;
      }
      if (!String(ccNumber).trim()) {
        setFindErr("Indique el número de la credencial cívica.");
        return;
      }
    } else if (!String(documentNumber).trim()) {
      setFindErr(
        documentType === "DNI"
          ? "Indique el DNI."
          : "Indique el número de pasaporte.",
      );
      return;
    }
    setFinding(true);
    try {
      const data = await findSeafarerByDocument(
        documentType,
        documentNumber,
        ccSeries,
        ccNumber,
      );
      setPerson(data?.seafarer ?? null);
      if (!data?.seafarer) setFindErr("No se encontró la persona.");
    } catch (e) {
      setFindErr(e.message || e.data?.msg || "Error al buscar.");
    } finally {
      setFinding(false);
    }
  }

  async function handleSave() {
    setSaveErr("");
    setSaving(true);
    try {
      if (kind === "license") {
        if (catalogueEntryKind === "title") {
          if (!String(titleCatalogForm.code ?? "").trim()) {
            setSaveErr("Indique el código del título.");
            setSaving(false);
            return;
          }
          if (!String(titleCatalogForm.stcwRegulation ?? "").trim()) {
            setSaveErr("Seleccione el reglamento.");
            setSaving(false);
            return;
          }
          if (
            !String(titleCatalogForm.nameEs ?? "").trim() ||
            !String(titleCatalogForm.nameEn ?? "").trim()
          ) {
            setSaveErr("Indique el nombre en español y en inglés.");
            setSaving(false);
            return;
          }
          if (!String(titleCatalogForm.department ?? "").trim()) {
            setSaveErr("Seleccione el departamento.");
            setSaving(false);
            return;
          }
          if (!String(titleCatalogForm.level ?? "").trim()) {
            setSaveErr("Seleccione el nivel.");
            setSaving(false);
            return;
          }
          const tPayload = titleCatalogFormToPayload(titleCatalogForm);
          if (editingTitle?._id) {
            await updateTitleCatalogEntry(String(editingTitle._id), tPayload);
          } else {
            await createTitleCatalogEntry(tPayload);
          }
        } else {
          if (!String(licenceCatalogForm.code ?? "").trim()) {
            setSaveErr("Indique el código de la licencia.");
            setSaving(false);
            return;
          }
          if (
            !String(licenceCatalogForm.nameEs ?? "").trim() &&
            !String(licenceCatalogForm.nameEn ?? "").trim()
          ) {
            setSaveErr("Indique el nombre en español y/o en inglés.");
            setSaving(false);
            return;
          }
          const payload = licenceCatalogFormToPayload(licenceCatalogForm);
          if (editingLicence?._id) {
            await updateLicenceCatalogEntry(String(editingLicence._id), payload);
          } else {
            await createLicenceCatalogEntry(payload);
          }
        }
      } else {
        if (!person?._id) {
          setSaveErr("Busque y seleccione primero a la persona.");
          setSaving(false);
          return;
        }
        if (kind === "course") {
          if (
            !String(courseForm.code ?? "").trim() &&
            !String(courseForm.name ?? "").trim()
          ) {
            setSaveErr("Indique al menos el código o el nombre del curso.");
            setSaving(false);
            return;
          }
          await addSeafarerCourse(person._id, courseFormToEntry(courseForm));
        } else {
          if (
            !String(sanctionForm.type ?? "").trim() &&
            !String(sanctionForm.description ?? "").trim()
          ) {
            setSaveErr("Indique el tipo o la descripción de la sanción.");
            setSaving(false);
            return;
          }
          await addSeafarerSanction(person._id, sanctionFormToEntry(sanctionForm));
        }
      }
      onSaved?.();
      onClose?.();
    } catch (e) {
      setSaveErr(e.message || e.data?.msg || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (!show || !kind) return null;

  const isTitleCatalog =
    catalogueEntryKind === "title";
  const title =
    kind === "license"
      ? isTitleCatalog
        ? editingTitle
          ? "Modificar título"
          : "Agregar título al catálogo"
        : editingLicence
          ? "Modificar licencia"
          : "Agregar licencia al catálogo"
      : kind === "course"
        ? "Agregar curso o capacitación"
        : "Agregar sanción";

  const isCcSearch = isCcDocumentSearchType(documentType);
  const isPassportSearch = documentType === "Pasaporte";

  function setTit(k, v) {
    setTitleCatalogForm((f) => ({ ...f, [k]: v }));
  }
  function setCat(k, v) {
    setLicenceCatalogForm((f) => ({ ...f, [k]: v }));
  }
  function setCrs(k, v) {
    setCourseForm((f) => ({ ...f, [k]: v }));
  }
  function setSan(k, v) {
    setSanctionForm((f) => ({ ...f, [k]: v }));
  }

  const canSavePersonFlow = !!person;
  const canSave = isCatalogLicence ? !saving : !saving && canSavePersonFlow;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{ zIndex: 1050, background: "rgba(0,0,0,0.5)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="metadata-add-title"
    >
      <div
        className="card shadow-lg"
        style={{
          maxWidth: isTitleCatalog ? 920 : 720,
          width: "100%",
          maxHeight: "92vh",
          overflow: "auto",
        }}
      >
        <div className="card-header d-flex align-items-center justify-content-between">
          <h5 className="mb-0" id="metadata-add-title">
            {title}
          </h5>
          <button
            type="button"
            className="btn-close"
            aria-label="Cerrar"
            onClick={onClose}
          />
        </div>
        <div className="card-body">
          {isCatalogLicence ? (
            <p className="text-muted small mb-3">
              Alta en el catálogo{" "}
              <strong>{isTitleCatalog ? "titles" : "licences"}</strong> como{" "}
              <strong>{isTitleCatalog ? "título" : "licencia"}</strong>. La
              auditoría la completa el servidor al guardar.
            </p>
          ) : (
            <p className="text-muted small mb-3">
              Busque a la persona por documento. El registro se asociará a su ficha de gente de mar.
            </p>
          )}
          {!isCatalogLicence ? (
            <>
              <div className="row g-2 mb-3">
                <div className="col-md-3">
                  <label className="form-label">Tipo de documento</label>
                  <select
                    className="form-select form-select-sm"
                    value={documentType}
                    onChange={(e) => onDocTypeChange(e.target.value)}
                  >
                    {SEAFARER_DOCUMENT_SEARCH_OPTIONS.map((o) => (
                      <option key={o.value || "e"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {isCcSearch ? (
                  <>
                    <div className="col-md-2">
                      <label className="form-label">CC — Serie</label>
                      <input
                        className="form-control form-control-sm"
                        autoComplete="off"
                        style={{ textTransform: "uppercase" }}
                        value={ccSeries}
                        onChange={(e) =>
                          setCcSeries(normalizeSeafarerCcSeries(e.target.value))
                        }
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">CC — Número</label>
                      <input
                        className="form-control form-control-sm"
                        autoComplete="off"
                        inputMode="numeric"
                        value={ccNumber}
                        onChange={(e) =>
                          setCcNumber(normalizeSeafarerCcNumber(e.target.value))
                        }
                      />
                    </div>
                  </>
                ) : (
                  <div className="col-md-4">
                    <label className="form-label">
                      {documentType === "DNI" ? "DNI" : "Número de pasaporte"}
                    </label>
                    <input
                      className="form-control form-control-sm"
                      autoComplete="off"
                      inputMode={documentType === "DNI" ? "numeric" : "text"}
                      style={
                        isPassportSearch ? { textTransform: "uppercase" } : undefined
                      }
                      value={documentNumber}
                      onChange={(e) =>
                        setDocumentNumber(
                          normalizeSeafarerDocumentNumber(
                            documentType,
                            e.target.value,
                          ),
                        )
                      }
                    />
                  </div>
                )}
                <div className="col-md-3 d-flex align-items-end">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm w-100"
                    disabled={finding}
                    onClick={handleFindPerson}
                  >
                    {finding ? "Buscando…" : "Buscar persona"}
                  </button>
                </div>
              </div>
              {findErr ? (
                <ErrorAlert message={findErr} className="alert alert-danger py-2 small" />
              ) : null}
              {person ? (
                <div className="alert alert-secondary py-2 small mb-3">
                  <strong>Persona:</strong>{" "}
                  {String(person.personalData?.firstName ?? "").trim()}{" "}
                  {String(person.personalData?.lastName ?? "").trim()} —{" "}
                  {formatSeafarerIdentification(person)}
                </div>
              ) : null}
            </>
          ) : null}

          {isCatalogLicence && isTitleCatalog ? (
            <div className="seafarer-consult-add-form">
              <div className="row g-2">
                <div className="col-md-4">
                  <label className="form-label">Código *</label>
                  <input
                    className="form-control form-control-sm"
                    autoComplete="off"
                    value={titleCatalogForm.code}
                    onChange={(e) => setTit("code", e.target.value)}
                  />
                </div>
                <div className="col-md-8">
                  <label className="form-label">Reglamento *</label>
                  <select
                    className="form-select form-select-sm"
                    value={titleCatalogForm.stcwRegulation}
                    onChange={(e) => setTit("stcwRegulation", e.target.value)}
                  >
                    <option value="">Seleccione…</option>
                    {titleCatalogForm.stcwRegulation &&
                    !TITLE_CATALOG_REGULATIONS.includes(
                      titleCatalogForm.stcwRegulation,
                    ) ? (
                      <option value={titleCatalogForm.stcwRegulation}>
                        {titleCatalogForm.stcwRegulation}
                      </option>
                    ) : null}
                    {TITLE_CATALOG_REGULATIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Nombre (español) *</label>
                  <input
                    className="form-control form-control-sm"
                    value={titleCatalogForm.nameEs}
                    onChange={(e) => setTit("nameEs", e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Nombre (inglés) *</label>
                  <input
                    className="form-control form-control-sm"
                    value={titleCatalogForm.nameEn}
                    onChange={(e) => setTit("nameEn", e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Departamento *</label>
                  <select
                    className="form-select form-select-sm"
                    value={titleCatalogForm.department}
                    onChange={(e) => setTit("department", e.target.value)}
                  >
                    <option value="">Seleccione…</option>
                    {titleCatalogForm.department &&
                    !TITLE_CATALOG_DEPARTMENTS.includes(titleCatalogForm.department) ? (
                      <option value={titleCatalogForm.department}>
                        {titleCatalogForm.department}
                      </option>
                    ) : null}
                    {TITLE_CATALOG_DEPARTMENTS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Nivel *</label>
                  <select
                    className="form-select form-select-sm"
                    value={titleCatalogForm.level}
                    onChange={(e) => setTit("level", e.target.value)}
                  >
                    <option value="">Seleccione…</option>
                    {titleCatalogForm.level &&
                    !TITLE_CATALOG_LEVELS.includes(titleCatalogForm.level) ? (
                      <option value={titleCatalogForm.level}>
                        {titleCatalogForm.level}
                      </option>
                    ) : null}
                    {TITLE_CATALOG_LEVELS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Función</label>
                  <input
                    className="form-control form-control-sm"
                    value={titleCatalogForm.function}
                    onChange={(e) => setTit("function", e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Aplicación</label>
                  <input
                    className="form-control form-control-sm"
                    value={titleCatalogForm.application}
                    onChange={(e) => setTit("application", e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Años de vigencia</label>
                  <input
                    type="number"
                    min={0}
                    className="form-control form-control-sm"
                    value={titleCatalogForm.validityYears}
                    onChange={(e) => setTit("validityYears", e.target.value)}
                  />
                </div>
                <div className="col-md-6 d-flex align-items-end">
                  <div className="form-check">
                    <input
                      id="tit-renewal"
                      className="form-check-input"
                      type="checkbox"
                      checked={titleCatalogForm.requiresRenewal}
                      onChange={(e) =>
                        setTit("requiresRenewal", e.target.checked)
                      }
                    />
                    <label className="form-check-label" htmlFor="tit-renewal">
                      Requiere renovación
                    </label>
                  </div>
                </div>
                <div className="col-12">
                  <div className="form-check">
                    <input
                      id="tit-active"
                      className="form-check-input"
                      type="checkbox"
                      checked={titleCatalogForm.active}
                      onChange={(e) => setTit("active", e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="tit-active">
                      Activo en catálogo
                    </label>
                  </div>
                </div>
              </div>
              <p className="text-muted small mt-2 mb-0">
                Código, reglamento, nombres ES/EN, departamento y nivel son obligatorios.
              </p>
            </div>
          ) : null}

          {isCatalogLicence && !isTitleCatalog ? (
            <div className="seafarer-consult-add-form">
              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label">Código *</label>
                  <input
                    className="form-control form-control-sm"
                    autoComplete="off"
                    value={licenceCatalogForm.code}
                    onChange={(e) => setCat("code", e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Categoría</label>
                  <select
                    className="form-select form-select-sm"
                    value={licenceCatalogForm.category}
                    onChange={(e) => setCat("category", e.target.value)}
                  >
                    <option value="">Seleccione…</option>
                    {licenceCatalogForm.category &&
                    !LICENCE_CATALOG_CATEGORY_OPTIONS.includes(
                      licenceCatalogForm.category,
                    ) ? (
                      <option value={licenceCatalogForm.category}>
                        {licenceCatalogForm.category}
                      </option>
                    ) : null}
                    {LICENCE_CATALOG_CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Nombre (español)</label>
                  <input
                    className="form-control form-control-sm"
                    value={licenceCatalogForm.nameEs}
                    onChange={(e) => setCat("nameEs", e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Nombre (inglés)</label>
                  <input
                    className="form-control form-control-sm"
                    value={licenceCatalogForm.nameEn}
                    onChange={(e) => setCat("nameEn", e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Autoridad otorgante</label>
                  <input
                    className="form-control form-control-sm"
                    value={licenceCatalogForm.authority}
                    onChange={(e) => setCat("authority", e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <div className="form-check mt-2">
                    <input
                      id="lic-renewal"
                      className="form-check-input"
                      type="checkbox"
                      checked={licenceCatalogForm.requiresRenewal}
                      onChange={(e) => setCat("requiresRenewal", e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="lic-renewal">
                      Requiere renovación
                    </label>
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="form-check mt-2">
                    <input
                      id="lic-active"
                      className="form-check-input"
                      type="checkbox"
                      checked={licenceCatalogForm.active}
                      onChange={(e) => setCat("active", e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="lic-active">
                      Activo en catálogo
                    </label>
                  </div>
                </div>
              </div>
              <p className="text-muted small mt-2 mb-0">
                Indique al menos un nombre (ES y/o EN).
              </p>
            </div>
          ) : null}

          {!isCatalogLicence && person ? (
            <div className="seafarer-consult-add-form">
              {kind === "course" ? (
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label">Código</label>
                    <input
                      className="form-control form-control-sm"
                      value={courseForm.code}
                      onChange={(e) => setCrs("code", e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Nombre</label>
                    <input
                      className="form-control form-control-sm"
                      value={courseForm.name}
                      onChange={(e) => setCrs("name", e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Tipo</label>
                    <input
                      className="form-control form-control-sm"
                      value={courseForm.type}
                      onChange={(e) => setCrs("type", e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Institución</label>
                    <input
                      className="form-control form-control-sm"
                      value={courseForm.institutionName}
                      onChange={(e) => setCrs("institutionName", e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Código institución</label>
                    <input
                      className="form-control form-control-sm"
                      value={courseForm.institutionCode}
                      onChange={(e) => setCrs("institutionCode", e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Aprobación</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={courseForm.approvalDate}
                      onChange={(e) => setCrs("approvalDate", e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Vencimiento</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={courseForm.expirationDate}
                      onChange={(e) => setCrs("expirationDate", e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Nº certificado</label>
                    <input
                      className="form-control form-control-sm"
                      value={courseForm.certificateNumber}
                      onChange={(e) =>
                        setCrs("certificateNumber", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Estado</label>
                    <input
                      className="form-control form-control-sm"
                      value={courseForm.status}
                      onChange={(e) => setCrs("status", e.target.value)}
                    />
                  </div>
                </div>
              ) : null}

              {kind === "sanction" ? (
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label">Código</label>
                    <input
                      className="form-control form-control-sm"
                      value={sanctionForm.code}
                      onChange={(e) => setSan("code", e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Tipo</label>
                    <input
                      className="form-control form-control-sm"
                      value={sanctionForm.type}
                      onChange={(e) => setSan("type", e.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Descripción</label>
                    <input
                      className="form-control form-control-sm"
                      value={sanctionForm.description}
                      onChange={(e) => setSan("description", e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Fecha</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={sanctionForm.issueDate}
                      onChange={(e) => setSan("issueDate", e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Vencimiento</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={sanctionForm.expirationDate}
                      onChange={(e) =>
                        setSan("expirationDate", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Autoridad</label>
                    <input
                      className="form-control form-control-sm"
                      value={sanctionForm.authority}
                      onChange={(e) => setSan("authority", e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Nº resolución</label>
                    <input
                      className="form-control form-control-sm"
                      value={sanctionForm.resolutionNumber}
                      onChange={(e) =>
                        setSan("resolutionNumber", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Estado</label>
                    <input
                      className="form-control form-control-sm"
                      value={sanctionForm.status}
                      onChange={(e) => setSan("status", e.target.value)}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {saveErr ? (
            <ErrorAlert message={saveErr} className="alert alert-danger py-2 small mt-3 mb-0" />
          ) : null}

          <div className="d-flex justify-content-end gap-2 mt-3">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!canSave}
              onClick={handleSave}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
