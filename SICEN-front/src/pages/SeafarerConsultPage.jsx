import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  addSeafarerCourse,
  addSeafarerHeldLicense,
  addSeafarerObservation,
  addSeafarerSanction,
  addSeafarerTitle,
  deleteSeafarerHeldLicense,
  deleteSeafarerHeldTitle,
  findSeafarerByDocument,
  updateSeafarerHeldLicense,
  updateSeafarerHeldTitle,
} from "../api/client.js";
import { SeafarerBasicDataTable } from "../components/seafarer/SeafarerBasicDataTable.jsx";
import {
  SeafarerCoursesSection,
  SeafarerHeldTitlesSection,
  SeafarerLicenseTableSection,
  SeafarerObservationsSection,
  SeafarerSanctionsSection,
} from "../components/seafarer/SeafarerConsultSections.jsx";
import { SeafarerDocumentSearchBar } from "../components/seafarer/SeafarerDocumentSearchBar.jsx";
import { Layout } from "../components/Layout.jsx";
import {
  buildHeldTitleDisplayRows,
  buildLicenseConsultDisplayRows,
} from "../constants/seafarerConsult.js";
import {
  isCcDocumentSearchType,
  normalizeSeafarerDocumentNumber,
} from "../constants/seafarerCreateForm.js";
import { scrollElementIntoViewById, scrollPageToTop } from "../utils/scrollPageToTop.js";

const emptySectionState = () => ({
  adding: false,
  err: "",
  ok: "",
});

export function SeafarerConsultPage() {
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [ccSeries, setCcSeries] = useState("");
  const [ccNumber, setCcNumber] = useState("");
  const [seafarer, setSeafarer] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState("");

  const [heldTitles, setHeldTitles] = useState(emptySectionState);
  const [licenseLicencias, setLicenseLicencias] = useState(emptySectionState);
  const [courses, setCourses] = useState(emptySectionState);
  const [sanctions, setSanctions] = useState(emptySectionState);
  const [observations, setObservations] = useState(emptySectionState);

  const seafarerId = seafarer?._id ? String(seafarer._id) : "";

  function onDocumentTypeChange(nextType) {
    setDocumentType(nextType);
    setDocumentNumber((n) =>
      normalizeSeafarerDocumentNumber(nextType, n),
    );
    if (nextType !== "CC") {
      setCcSeries("");
      setCcNumber("");
    }
  }

  function clearSectionMessages() {
    setHeldTitles(emptySectionState());
    setLicenseLicencias(emptySectionState());
    setCourses(emptySectionState());
    setSanctions(emptySectionState());
    setObservations(emptySectionState());
  }

  async function handleSearch() {
    setSearchErr("");
    clearSectionMessages();
    if (!String(documentType).trim()) {
      setSearchErr("Seleccione el tipo de documento.");
      scrollPageToTop();
      return;
    }
    if (isCcDocumentSearchType(documentType)) {
      if (!String(ccSeries).trim()) {
        setSearchErr("Indique la serie de la credencial cívica.");
        scrollPageToTop();
        return;
      }
      if (!String(ccNumber).trim()) {
        setSearchErr("Indique el número de la credencial cívica.");
        scrollPageToTop();
        return;
      }
    } else if (!String(documentNumber).trim()) {
      setSearchErr(
        documentType === "DNI"
          ? "Indique el DNI."
          : "Indique el número de pasaporte.",
      );
      scrollPageToTop();
      return;
    }
    setSearching(true);
    setSeafarer(null);
    try {
      const data = await findSeafarerByDocument(
        documentType,
        documentNumber,
        ccSeries,
        ccNumber,
      );
      setSeafarer(data?.seafarer ?? null);
      if (!data?.seafarer) {
        setSearchErr("No se encontró ningún registro con ese documento.");
      }
    } catch (e) {
      setSeafarer(null);
      setSearchErr(e.message || e.data?.msg || "Error al buscar el registro.");
      scrollPageToTop();
    } finally {
      setSearching(false);
    }
  }

  function applySeafarerUpdate(updated, options = {}) {
    setSeafarer(updated);
    if (options.scrollToSectionId) {
      scrollElementIntoViewById(options.scrollToSectionId);
    } else {
      scrollPageToTop();
    }
  }

  const heldTitleRows = useMemo(
    () => buildHeldTitleDisplayRows(seafarer),
    [seafarer],
  );

  const licenseRows = useMemo(
    () => buildLicenseConsultDisplayRows(seafarer),
    [seafarer],
  );

  async function handleAddHeldLicense(entry) {
    if (!seafarerId) return false;
    setLicenseLicencias({ adding: true, err: "", ok: "" });
    try {
      const data = await addSeafarerHeldLicense(seafarerId, entry);
      applySeafarerUpdate(data.seafarer, {
        scrollToSectionId: "seafarer-consult-licenses",
      });
      setLicenseLicencias({
        adding: false,
        err: "",
        ok: data.msg || "Licencia agregada.",
      });
      return true;
    } catch (e) {
      setLicenseLicencias({
        adding: false,
        err:
          e.message ||
          e.data?.msg ||
          "No se pudo agregar la licencia.",
        ok: "",
      });
      scrollPageToTop();
      return false;
    }
  }

  async function handleUpdateHeldLicense(heldEntryId, entry) {
    if (!seafarerId) return false;
    setLicenseLicencias({ adding: true, err: "", ok: "" });
    try {
      const data = await updateSeafarerHeldLicense(
        seafarerId,
        heldEntryId,
        entry,
      );
      applySeafarerUpdate(data.seafarer, {
        scrollToSectionId: "seafarer-consult-licenses",
      });
      setLicenseLicencias({
        adding: false,
        err: "",
        ok: data.msg || "Licencia actualizada.",
      });
      return true;
    } catch (e) {
      setLicenseLicencias({
        adding: false,
        err:
          e.message || e.data?.msg || "No se pudo actualizar la licencia.",
        ok: "",
      });
      scrollPageToTop();
      return false;
    }
  }

  async function handleDeleteHeldLicense(heldEntryId) {
    if (!seafarerId) return false;
    setLicenseLicencias({ adding: true, err: "", ok: "" });
    try {
      const data = await deleteSeafarerHeldLicense(seafarerId, heldEntryId);
      applySeafarerUpdate(data.seafarer, {
        scrollToSectionId: "seafarer-consult-licenses",
      });
      setLicenseLicencias({
        adding: false,
        err: "",
        ok: data.msg || "Licencia eliminada.",
      });
      return true;
    } catch (e) {
      setLicenseLicencias({
        adding: false,
        err: e.message || e.data?.msg || "No se pudo eliminar la licencia.",
        ok: "",
      });
      scrollPageToTop();
      await Swal.fire({
        icon: "error",
        title: "No se pudo eliminar",
        text: e.message || e.data?.msg || "Intente de nuevo.",
        confirmButtonText: "Aceptar",
      });
      return false;
    }
  }

  async function handleAddTitle(entry) {
    if (!seafarerId) return false;
    setHeldTitles({ adding: true, err: "", ok: "" });
    try {
      const data = await addSeafarerTitle(seafarerId, entry);
      applySeafarerUpdate(data.seafarer, {
        scrollToSectionId: "seafarer-consult-titles",
      });
      setHeldTitles({
        adding: false,
        err: "",
        ok: data.msg || "Título agregado.",
      });
      return true;
    } catch (e) {
      setHeldTitles({
        adding: false,
        err: e.message || e.data?.msg || "No se pudo agregar el título.",
        ok: "",
      });
      scrollPageToTop();
      return false;
    }
  }

  async function handleUpdateHeldTitle(heldEntryId, entry) {
    if (!seafarerId) return false;
    setHeldTitles({ adding: true, err: "", ok: "" });
    try {
      const data = await updateSeafarerHeldTitle(
        seafarerId,
        heldEntryId,
        entry,
      );
      applySeafarerUpdate(data.seafarer, {
        scrollToSectionId: "seafarer-consult-titles",
      });
      setHeldTitles({
        adding: false,
        err: "",
        ok: data.msg || "Título actualizado.",
      });
      return true;
    } catch (e) {
      setHeldTitles({
        adding: false,
        err: e.message || e.data?.msg || "No se pudo actualizar el título.",
        ok: "",
      });
      scrollPageToTop();
      return false;
    }
  }

  async function handleDeleteHeldTitle(heldEntryId) {
    if (!seafarerId) return false;
    setHeldTitles({ adding: true, err: "", ok: "" });
    try {
      const data = await deleteSeafarerHeldTitle(seafarerId, heldEntryId);
      applySeafarerUpdate(data.seafarer, {
        scrollToSectionId: "seafarer-consult-titles",
      });
      setHeldTitles({
        adding: false,
        err: "",
        ok: data.msg || "Título eliminado.",
      });
      return true;
    } catch (e) {
      setHeldTitles({
        adding: false,
        err: e.message || e.data?.msg || "No se pudo eliminar el título.",
        ok: "",
      });
      scrollPageToTop();
      await Swal.fire({
        icon: "error",
        title: "No se pudo eliminar",
        text: e.message || e.data?.msg || "Intente de nuevo.",
        confirmButtonText: "Aceptar",
      });
      return false;
    }
  }

  async function handleAddCourse(entry) {
    if (!seafarerId) return false;
    setCourses({ adding: true, err: "", ok: "" });
    try {
      const data = await addSeafarerCourse(seafarerId, entry);
      applySeafarerUpdate(data.seafarer);
      setCourses({ adding: false, err: "", ok: data.msg || "Curso agregado." });
      return true;
    } catch (e) {
      setCourses({
        adding: false,
        err: e.message || e.data?.msg || "No se pudo agregar el curso.",
        ok: "",
      });
      scrollPageToTop();
      return false;
    }
  }

  async function handleAddSanction(entry) {
    if (!seafarerId) return false;
    setSanctions({ adding: true, err: "", ok: "" });
    try {
      const data = await addSeafarerSanction(seafarerId, entry);
      applySeafarerUpdate(data.seafarer);
      setSanctions({
        adding: false,
        err: "",
        ok: data.msg || "Sanción agregada.",
      });
      return true;
    } catch (e) {
      setSanctions({
        adding: false,
        err: e.message || e.data?.msg || "No se pudo agregar la sanción.",
        ok: "",
      });
      scrollPageToTop();
      return false;
    }
  }

  async function handleAddObservation(entry) {
    if (!seafarerId) return false;
    setObservations({ adding: true, err: "", ok: "" });
    try {
      const data = await addSeafarerObservation(seafarerId, entry);
      applySeafarerUpdate(data.seafarer);
      setObservations({
        adding: false,
        err: "",
        ok: data.msg || "Observación agregada.",
      });
      return true;
    } catch (e) {
      setObservations({
        adding: false,
        err: e.message || e.data?.msg || "No se pudo agregar la observación.",
        ok: "",
      });
      scrollPageToTop();
      return false;
    }
  }

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Consultar y modificar — gente de mar / nautas deportivos</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/base-gente-mar">
            Gestión de gente de mar / nautas deportivos
          </Link>
        </div>

        <SeafarerDocumentSearchBar
          documentType={documentType}
          documentNumber={documentNumber}
          ccSeries={ccSeries}
          ccNumber={ccNumber}
          onDocumentTypeChange={onDocumentTypeChange}
          onDocumentNumberChange={setDocumentNumber}
          onCcSeriesChange={setCcSeries}
          onCcNumberChange={setCcNumber}
          onSearch={handleSearch}
          searching={searching}
          searchErr={searchErr}
        />

        {seafarer ? (
          <>
            <SeafarerBasicDataTable seafarer={seafarer} />
            <SeafarerHeldTitlesSection
              rows={heldTitleRows}
              onAddTitle={handleAddTitle}
              onUpdateHeldTitle={handleUpdateHeldTitle}
              onDeleteHeldTitle={handleDeleteHeldTitle}
              adding={heldTitles.adding}
              addErr={heldTitles.err}
              addOk={heldTitles.ok}
            />
            <SeafarerLicenseTableSection
              sectionTitle="Licencias"
              rows={licenseRows}
              addToggleLabel="Agregar licencia"
              formHeading="Nueva licencia"
              saveButtonLabel="Guardar licencia"
              emptyMessage="Sin licencias registradas."
              onAddHeldLicense={handleAddHeldLicense}
              onUpdateHeldLicense={handleUpdateHeldLicense}
              onDeleteHeldLicense={handleDeleteHeldLicense}
              adding={licenseLicencias.adding}
              addErr={licenseLicencias.err}
              addOk={licenseLicencias.ok}
            />
            <SeafarerCoursesSection
              seafarer={seafarer}
              onAddCourse={handleAddCourse}
              adding={courses.adding}
              addErr={courses.err}
              addOk={courses.ok}
            />
            <SeafarerSanctionsSection
              seafarer={seafarer}
              onAddSanction={handleAddSanction}
              adding={sanctions.adding}
              addErr={sanctions.err}
              addOk={sanctions.ok}
            />
            <SeafarerObservationsSection
              seafarer={seafarer}
              onAddObservation={handleAddObservation}
              adding={observations.adding}
              addErr={observations.err}
              addOk={observations.ok}
            />
          </>
        ) : null}
      </div>
    </Layout>
  );
}
