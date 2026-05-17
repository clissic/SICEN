import { useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  deleteLicenceCatalogEntry,
  deleteTitleCatalogEntry,
  licencesCatalogList,
  seafarerMetadataCourses,
  seafarerMetadataSanctions,
  titlesCatalogList,
} from "../api/client.js";
import { SeafarerMetadataAddModal } from "../components/seafarer/SeafarerMetadataAddModal.jsx";
import { SeafarerMetadataListBlock } from "../components/seafarer/SeafarerMetadataListBlock.jsx";
import { Layout } from "../components/Layout.jsx";
import { formatSeafarerIdentification } from "../constants/seafarerCreateForm.js";
import { formatDateForTableDisplay } from "../utils/dateDdMmYyyy.js";

const fetchTitlesCatalogPage = (page, q) =>
  titlesCatalogList({ page, pageSize: 10, q });
const fetchLicencesCatalogPage = (page, q) =>
  licencesCatalogList({ page, pageSize: 10, q, kind: "license" });

async function fetchCoursesPage(page, q) {
  return seafarerMetadataCourses({ page, pageSize: 10, q });
}

async function fetchSanctionsPage(page, q) {
  return seafarerMetadataSanctions({ page, pageSize: 10, q });
}

function showDate(v) {
  if (v == null || v === "") return "—";
  let s = v;
  if (typeof v === "string" && v.includes("T")) s = v.slice(0, 10);
  return formatDateForTableDisplay(String(s)) || "—";
}

function showText(v) {
  const t = String(v ?? "").trim();
  return t || "—";
}

function showBool(v) {
  if (v === true) return "Sí";
  if (v === false) return "No";
  return "—";
}

export function SeafarerMetadataPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [addKind, setAddKind] = useState(null);
  const [catalogueEntryKind, setCatalogueEntryKind] = useState("license");
  const [editingTitle, setEditingTitle] = useState(null);
  const [editingLicence, setEditingLicence] = useState(null);

  function bumpRefresh() {
    setRefreshKey((k) => k + 1);
  }

  function closeModal() {
    setAddKind(null);
    setEditingTitle(null);
    setEditingLicence(null);
    setCatalogueEntryKind("license");
  }

  async function handleDeleteTitleCatalog(row) {
    const id = row?._id != null ? String(row._id) : "";
    if (!id) return;
    const code = String(row.code ?? "").trim() || "este registro";
    const result = await Swal.fire({
      title: "¿Eliminar del catálogo?",
      text: `Se eliminará el título «${code}». Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      focusCancel: true,
      confirmButtonColor: "#dc3545",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteTitleCatalogEntry(id);
      bumpRefresh();
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo eliminar",
        text:
          e.message ||
          e.data?.msg ||
          "Intente de nuevo o compruebe su conexión.",
        confirmButtonText: "Aceptar",
      });
    }
  }

  async function handleDeleteLicenceCatalog(row) {
    const id = row?._id != null ? String(row._id) : "";
    if (!id) return;
    const code = String(row.code ?? "").trim() || "este registro";
    const result = await Swal.fire({
      title: "¿Eliminar del catálogo?",
      text: `Se eliminará la licencia «${code}». Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      focusCancel: true,
      confirmButtonColor: "#dc3545",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteLicenceCatalogEntry(id);
      bumpRefresh();
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo eliminar",
        text:
          e.message ||
          e.data?.msg ||
          "Intente de nuevo o compruebe su conexión.",
        confirmButtonText: "Aceptar",
      });
    }
  }

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <h3 className="m-0">Metadatos — gente de mar</h3>
          <Link className="btn btn-outline-secondary btn-sm" to="/base-gente-mar">
            Gestión de gente de mar
          </Link>
        </div>
        <p className="text-muted small mb-4">
          <strong>Títulos</strong> usan el catálogo <code className="small">titles</code> (reglamento STCW o
          Patrones de Cabotaje).{" "}
          <strong>Licencias</strong> usan <code className="small">licences</code>. Cursos y sanciones
          provienen de las fichas de gente de mar; al agregar ahí se pide documento de la persona.
        </p>

        <SeafarerMetadataListBlock
          blockId="meta-titles"
          title="Títulos"
          fetchPage={fetchTitlesCatalogPage}
          refreshKey={refreshKey}
          addLabel="Agregar título"
          onAddClick={() => {
            setCatalogueEntryKind("title");
            setEditingTitle(null);
            setEditingLicence(null);
            setAddKind("license");
          }}
          tableHead={
            <tr>
              <th>Código</th>
              <th>Reglamento</th>
              <th>Nombre (ES)</th>
              <th>Nombre (EN)</th>
              <th>Departamento</th>
              <th>Nivel</th>
              <th>Renovación</th>
              <th>Vigencia (años)</th>
              <th>Activo</th>
              <th>Actualizado</th>
              <th className="text-center">Acciones</th>
            </tr>
          }
          renderRow={(row, i) => (
            <tr key={row._id ? String(row._id) : `tit-${i}`}>
              <td>{showText(row.code)}</td>
              <td>{showText(row.stcwRegulation)}</td>
              <td>{showText(row.name?.es)}</td>
              <td>{showText(row.name?.en)}</td>
              <td>{showText(row.department)}</td>
              <td>{showText(row.level)}</td>
              <td>{showBool(row.requiresRenewal)}</td>
              <td>{row.validityYears != null ? String(row.validityYears) : "—"}</td>
              <td>{showBool(row.active)}</td>
              <td>{showDate(row.metadata?.updatedAt)}</td>
              <td className="text-center text-nowrap">
                <button
                  type="button"
                  className="btn btn-link btn-sm text-body p-1 me-1"
                  title="Modificar"
                  aria-label="Modificar"
                  onClick={() => {
                    setCatalogueEntryKind("title");
                    setEditingTitle(row);
                    setEditingLicence(null);
                    setAddKind("license");
                  }}
                >
                  <i className="bi bi-pencil-square" aria-hidden />
                </button>
                <button
                  type="button"
                  className="btn btn-link btn-sm text-danger p-1"
                  title="Eliminar"
                  aria-label="Eliminar"
                  onClick={() => handleDeleteTitleCatalog(row)}
                >
                  <i className="bi bi-trash3" aria-hidden />
                </button>
              </td>
            </tr>
          )}
        />

        <SeafarerMetadataListBlock
          blockId="meta-licenses"
          title="Licencias"
          fetchPage={fetchLicencesCatalogPage}
          refreshKey={refreshKey}
          addLabel="Agregar licencia"
          onAddClick={() => {
            setCatalogueEntryKind("license");
            setEditingTitle(null);
            setEditingLicence(null);
            setAddKind("license");
          }}
          tableHead={
            <tr>
              <th>Código</th>
              <th>Nombre (ES)</th>
              <th>Nombre (EN)</th>
              <th>Categoría</th>
              <th>Autoridad</th>
              <th>Renovación</th>
              <th>Activo</th>
              <th>Actualizado</th>
              <th className="text-center">Acciones</th>
            </tr>
          }
          renderRow={(row, i) => (
            <tr key={row._id ? String(row._id) : `lic-${i}`}>
              <td>{showText(row.code)}</td>
              <td>{showText(row.name?.es)}</td>
              <td>{showText(row.name?.en)}</td>
              <td>{showText(row.category)}</td>
              <td>{showText(row.authority)}</td>
              <td>{showBool(row.requiresRenewal)}</td>
              <td>{showBool(row.active)}</td>
              <td>{showDate(row.metadata?.updatedAt)}</td>
              <td className="text-center text-nowrap">
                <button
                  type="button"
                  className="btn btn-link btn-sm text-body p-1 me-1"
                  title="Modificar"
                  aria-label="Modificar"
                  onClick={() => {
                    setCatalogueEntryKind("license");
                    setEditingLicence(row);
                    setEditingTitle(null);
                    setAddKind("license");
                  }}
                >
                  <i className="bi bi-pencil-square" aria-hidden />
                </button>
                <button
                  type="button"
                  className="btn btn-link btn-sm text-danger p-1"
                  title="Eliminar"
                  aria-label="Eliminar"
                  onClick={() => handleDeleteLicenceCatalog(row)}
                >
                  <i className="bi bi-trash3" aria-hidden />
                </button>
              </td>
            </tr>
          )}
        />

        <SeafarerMetadataListBlock
          blockId="meta-courses"
          title="Cursos y capacitaciones"
          fetchPage={fetchCoursesPage}
          refreshKey={refreshKey}
          addLabel="Agregar curso o capacitación"
          onAddClick={() => {
            setEditingTitle(null);
            setEditingLicence(null);
            setAddKind("course");
          }}
          tableHead={
            <tr>
              <th>Persona</th>
              <th>Documento</th>
              <th>Código</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Institución</th>
              <th>Aprobación</th>
              <th>Vencimiento</th>
              <th>Certificado</th>
              <th>Estado</th>
            </tr>
          }
          renderRow={(row, i) => (
            <tr key={`${row.seafarerId}-${row.code}-${i}`}>
              <td>{showText(row.personName)}</td>
              <td>
                {formatSeafarerIdentification(row)}
              </td>
              <td>{showText(row.code)}</td>
              <td>{showText(row.name)}</td>
              <td>{showText(row.type)}</td>
              <td>
                {showText(row.institution?.name)}
                {row.institution?.code
                  ? ` (${showText(row.institution.code)})`
                  : ""}
              </td>
              <td>{showDate(row.approvalDate)}</td>
              <td>{showDate(row.expirationDate)}</td>
              <td>{showText(row.certificate?.number)}</td>
              <td>{showText(row.status)}</td>
            </tr>
          )}
        />

        <SeafarerMetadataListBlock
          blockId="meta-sanctions"
          title="Sanciones"
          fetchPage={fetchSanctionsPage}
          refreshKey={refreshKey}
          addLabel="Agregar sanción"
          onAddClick={() => {
            setEditingTitle(null);
            setEditingLicence(null);
            setAddKind("sanction");
          }}
          tableHead={
            <tr>
              <th>Persona</th>
              <th>Documento</th>
              <th>Código</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Fecha</th>
              <th>Vencimiento</th>
              <th>Autoridad</th>
              <th>Resolución</th>
              <th>Estado</th>
            </tr>
          }
          renderRow={(row, i) => (
            <tr key={`${row.seafarerId}-san-${i}`}>
              <td>{showText(row.personName)}</td>
              <td>
                {formatSeafarerIdentification(row)}
              </td>
              <td>{showText(row.code)}</td>
              <td>{showText(row.type)}</td>
              <td>{showText(row.description)}</td>
              <td>{showDate(row.issueDate)}</td>
              <td>{showDate(row.expirationDate)}</td>
              <td>{showText(row.authority)}</td>
              <td>{showText(row.resolutionNumber)}</td>
              <td>{showText(row.status)}</td>
            </tr>
          )}
        />

        <SeafarerMetadataAddModal
          kind={addKind}
          show={!!addKind}
          catalogueEntryKind={
            addKind === "license" ? catalogueEntryKind : "license"
          }
          editingTitle={addKind === "license" ? editingTitle : null}
          editingLicence={addKind === "license" ? editingLicence : null}
          onClose={closeModal}
          onSaved={bumpRefresh}
        />
      </div>
    </Layout>
  );
}
