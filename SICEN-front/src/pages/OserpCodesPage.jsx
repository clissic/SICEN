import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import oserpFiles from "../generated/oserpFilesManifest.js";
import { Layout } from "../components/Layout.jsx";

const PAGE_SIZE = 5;

/**
 * PDF con la tabla de códigos de deficiencia del PSC (archivo suelto en
 * public/files/OSERP). Se resuelve desde el manifiesto generado para que la
 * URL respete la codificación real del nombre en disco (acentos incluidos).
 */
const PSC_CODES_PDF =
  (oserpFiles?.root ?? []).find((f) => /deficiencia de psc/i.test(f.name)) ||
  null;

/** Normaliza para búsqueda: minúsculas y sin diacríticos. */
function normalizeForSearch(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Ícono + etiqueta según el tipo de archivo. */
function iconForKind(kind) {
  if (kind === "pdf") {
    return { className: "bi-file-earmark-pdf text-danger", label: "PDF" };
  }
  if (kind === "word") {
    return { className: "bi-file-earmark-word text-primary", label: "Word" };
  }
  return { className: "bi-file-earmark text-secondary", label: "Archivo" };
}

/** Tamaño legible a partir de los bytes del archivo. */
function formatFileSize(bytes) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) {
    return "—";
  }
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return kb < 10 ? `${kb.toFixed(1)} KB` : `${Math.round(kb)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
}

/** Subtítulo con fecha (mtime) y tamaño, igual que el listado de procedimientos. */
function formatSubtitle(modifiedAtIso, sizeBytes) {
  const sizePart = formatFileSize(sizeBytes);
  if (!modifiedAtIso) {
    return sizePart !== "—" ? `(${sizePart})` : "";
  }
  const d = new Date(modifiedAtIso);
  if (Number.isNaN(d.getTime())) {
    return sizePart !== "—" ? `(${sizePart})` : "";
  }
  const dateStr = d.toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `Creado el ${dateStr} (${sizePart})`;
}

function FilesColumn({ title, icon, files }) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const searchId = useId();

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query).trim();
    if (!q) return files;
    const terms = q.split(/\s+/).filter(Boolean);
    return files.filter((f) => {
      const haystack = normalizeForSearch(f.name);
      return terms.every((t) => haystack.includes(t));
    });
  }, [files, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);
  const fromN = filtered.length === 0 ? 0 : startIdx + 1;
  const toN = startIdx + pageItems.length;

  return (
    <div className="card h-100 shadow-sm">
      <div className="card-body d-flex flex-column">
        <h5 className="card-title d-flex align-items-center gap-2 mb-3">
          <i className={`bi ${icon} text-secondary`} aria-hidden />
          {title}
          <span className="badge text-bg-secondary ms-auto">
            {files.length}
          </span>
        </h5>

        {files.length === 0 ? (
          <div className="alert alert-secondary mb-0">
            No hay documentos disponibles.
          </div>
        ) : (
          <>
            <div className="input-group input-group-sm mb-3">
              <span className="input-group-text" aria-hidden>
                <i className="bi bi-search" />
              </span>
              <input
                id={searchId}
                type="search"
                className="form-control"
                placeholder="Buscar por palabras clave…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={`Buscar en ${title}`}
                autoComplete="off"
              />
            </div>

            {filtered.length === 0 ? (
              <div className="alert alert-secondary mb-0">
                Ningún documento coincide con «{query.trim()}».
              </div>
            ) : (
              <>
            <p className="small text-muted mb-2">
              Mostrando {fromN}–{toN} de {filtered.length}
              {query.trim() ? ` (filtrado de ${files.length})` : ""}
            </p>
            <ul className="list-group list-group-flush border rounded">
              {pageItems.map((f) => {
                const { className, label } = iconForKind(f.kind);
                return (
                  <li
                    key={f.url}
                    className="list-group-item d-flex align-items-center gap-3"
                  >
                    <i
                      className={`bi ${className} fs-3 flex-shrink-0`}
                      title={label}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-grow-1">
                      <div className="fw-medium text-break">{f.name}</div>
                      <div className="small text-muted text-break">
                        {formatSubtitle(f.modifiedAt, f.sizeBytes)}
                      </div>
                    </div>
                    <a
                      className="btn btn-sm btn-outline-secondary flex-shrink-0"
                      href={f.url}
                      download={f.name}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="bi bi-download me-1" aria-hidden />
                      Descargar
                    </a>
                  </li>
                );
              })}
            </ul>

            {totalPages > 1 ? (
              <nav
                className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3"
                aria-label={`Paginación de ${title}`}
              >
                <span className="small text-muted">
                  Página {currentPage} de {totalPages}
                </span>
                <ul className="pagination pagination-sm mb-0">
                  <li
                    className={`page-item ${currentPage <= 1 ? "disabled" : ""}`}
                  >
                    <button
                      type="button"
                      className="page-link"
                      disabled={currentPage <= 1}
                      onClick={() => setPage(Math.max(1, currentPage - 1))}
                    >
                      Anterior
                    </button>
                  </li>
                  <li
                    className={`page-item ${
                      currentPage >= totalPages ? "disabled" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="page-link"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setPage(Math.min(totalPages, currentPage + 1))
                      }
                    >
                      Siguiente
                    </button>
                  </li>
                </ul>
              </nav>
            ) : null}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Tarjeta "CÓDIGOS Y REGLAMENTOS" del módulo OSERP: lista la documentación
 * disponible en `public/files/OSERP`, separada en dos columnas (en escritorio):
 * «Convenios internacionales» (carpeta `Internacionales`) y «Reglamentación
 * nacional» (carpeta `Nacionales`). El catálogo se arma en compilación con el
 * manifiesto generado `src/generated/oserpFilesManifest.js`.
 */
export function OserpCodesPage() {
  const internacionales = oserpFiles?.internacionales ?? [];
  const nacionales = oserpFiles?.nacionales ?? [];

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="m-0">Códigos y reglamentos</h3>
            <p className="text-muted small mb-0 mt-1">
              Documentación útil para el OSERP.
            </p>
            {PSC_CODES_PDF ? (
              <a
                className="btn btn-outline-danger btn-sm mt-2 d-inline-flex align-items-center gap-2"
                href={PSC_CODES_PDF.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="bi bi-file-earmark-pdf" aria-hidden />
                Ver Códigos de Deficiencia de PSC
                <i
                  className="bi bi-box-arrow-up-right small"
                  aria-hidden
                  title="Se abre en otra pestaña"
                />
              </a>
            ) : null}
          </div>
          <Link
            className="btn btn-outline-secondary btn-sm"
            to="/estado-rector-puertos/oserp"
          >
            OSERP
          </Link>
        </div>


        <div className="row row-cols-1 row-cols-lg-2 g-3 align-items-stretch">
          <div className="col">
            <FilesColumn
              title="Convenios internacionales"
              icon="bi-globe2"
              files={internacionales}
            />
          </div>
          <div className="col">
            <FilesColumn
              title="Reglamentación nacional"
              icon="bi-bank"
              files={nacionales}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
