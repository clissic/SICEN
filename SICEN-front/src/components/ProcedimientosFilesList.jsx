import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import * as api from "../api/client.js";
import { useUnitFromApi } from "../hooks/useUnitFromApi.js";

const PAGE_SIZE = 15;

function iconForKind(kind) {
  if (kind === "pdf") {
    return { className: "bi-file-earmark-pdf text-danger", label: "PDF" };
  }
  return { className: "bi-file-earmark-word text-primary", label: "Word" };
}

export function ProcedimientosFilesList({
  userUnit,
  filesDivision = "DIV-I",
}) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    files: [],
  });
  const [filterQuery, setFilterQuery] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const fileInputRef = useRef(null);
  /** Evita ocultar la lista al recargar tras subir un archivo. */
  const silentRefetchRef = useRef(false);
  /** `relativePath` del archivo que se está borrando */
  const [deletingRelativePath, setDeletingRelativePath] = useState(null);
  const unitDoc = useUnitFromApi(userUnit);
  const unitLabel = unitDoc?.name?.trim() || userUnit?.trim() || "";

  useEffect(() => {
    setPage(1);
  }, [filterQuery]);

  useEffect(() => {
    setFilterQuery("");
    setPage(1);
    setUploadMsg(null);
  }, [filesDivision]);

  useEffect(() => {
    let cancelled = false;
    if (!userUnit?.trim()) {
      setState({ loading: false, error: null, files: [] });
      return undefined;
    }
    if (!silentRefetchRef.current) {
      setState((s) => ({ ...s, loading: true, error: null }));
    }
    (async () => {
      try {
        const fetchList =
          filesDivision === "DIV-II"
            ? api.listProcedimientosDivIIFiles
            : api.listProcedimientosDivIFiles;
        const data = await fetchList();
        if (!cancelled) {
          silentRefetchRef.current = false;
          setState({
            loading: false,
            error: null,
            files: data.files ?? [],
          });
        }
      } catch (e) {
        if (!cancelled) {
          silentRefetchRef.current = false;
          setState({
            loading: false,
            error: e?.message || "No se pudo cargar el listado.",
            files: [],
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userUnit, filesDivision, refreshKey]);

  const filtered = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) {
      return state.files;
    }
    return state.files.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.relativePath.toLowerCase().includes(q)
    );
  }, [state.files, filterQuery]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    setPage((p) => Math.min(p, tp));
  }, [filtered.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);
  const fromN = filtered.length === 0 ? 0 : startIdx + 1;
  const toN = startIdx + pageItems.length;

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadMsg(null);
    setUploading(true);
    try {
      await api.uploadProcedimientosFile(file, filesDivision);
      silentRefetchRef.current = true;
      setRefreshKey((k) => k + 1);
      setUploadMsg({ type: "success", text: "Archivo cargado correctamente." });
    } catch (err) {
      setUploadMsg({
        type: "danger",
        text: err?.message || "No se pudo subir el archivo.",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(f) {
    const result = await Swal.fire({
      title: "¿Eliminar archivo?",
      text: `Se eliminará permanentemente «${f.name}». Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      focusCancel: true,
      reverseButtons: true,
      confirmButtonColor: "var(--bs-danger, #dc3545)",
    });

    if (!result.isConfirmed) {
      return;
    }

    setUploadMsg(null);
    setDeletingRelativePath(f.relativePath);
    try {
      await api.deleteProcedimientoFile(filesDivision, f.relativePath);
      silentRefetchRef.current = true;
      setRefreshKey((k) => k + 1);
      setUploadMsg({ type: "success", text: "Archivo eliminado." });
    } catch (err) {
      setUploadMsg({
        type: "danger",
        text: err?.message || "No se pudo borrar el archivo.",
      });
    } finally {
      setDeletingRelativePath(null);
    }
  }

  if (!userUnit?.trim()) {
    return (
      <div className="alert alert-warning mb-0">
        No tiene unidad asignada. El listado depende de su unidad en el sistema.
      </div>
    );
  }

  if (state.loading) {
    return <p className="text-muted mb-0">Cargando documentos…</p>;
  }

  if (state.error) {
    return <div className="alert alert-danger mb-0">{state.error}</div>;
  }

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <input
          ref={fileInputRef}
          type="file"
          className="d-none"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileSelected}
          disabled={uploading}
          aria-hidden
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden
              />
              Subiendo…
            </>
          ) : (
            <>
              <i className="bi bi-upload me-1" aria-hidden />
              Subir archivo
            </>
          )}
        </button>
        <span className="small text-muted">
          Formatos: PDF, Word (.doc, .docx). Máx. 40 MB.
        </span>
      </div>

      {uploadMsg ? (
        <div
          className={`alert alert-${uploadMsg.type === "success" ? "success" : "danger"} py-2 mb-3`}
          role="status"
        >
          {uploadMsg.text}
        </div>
      ) : null}

      <div className="mb-3">
        <label
          className="form-label small text-muted mb-1"
          htmlFor={`proc-files-filter-${filesDivision}`}
        >
          Buscar
        </label>
        <div className="input-group">
          <span className="input-group-text" aria-hidden>
            <i className="bi bi-search" />
          </span>
          <input
            id={`proc-files-filter-${filesDivision}`}
            type="search"
            className="form-control"
            placeholder="Nombre o ruta del archivo…"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      {state.files.length === 0 ? (
        <div className="alert alert-secondary mb-0">
          No hay documentos (.pdf, .doc, .docx) en Procedimientos
          {unitLabel ? ` para ${unitLabel}` : ""}. Puede subir el primero con
          «Subir archivo». Los archivos se guardan en{" "}
          <code className="small">
            public/files/units/{userUnit}/{filesDivision}/Procedimientos
          </code>
          .
        </div>
      ) : filtered.length === 0 ? (
        <div className="alert alert-secondary mb-0">
          Ningún archivo coincide con «{filterQuery.trim()}». Pruebe con otras
          palabras o borre el filtro.
        </div>
      ) : (
        <>
          <p className="small text-muted mb-2">
            Mostrando {fromN}–{toN} de {filtered.length}
            {filterQuery.trim()
              ? ` (filtrado de ${state.files.length})`
              : ""}
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
                      {f.relativePath}
                    </div>
                  </div>
                  <div className="d-flex flex-shrink-0 gap-1 align-items-center">
                    <a
                      className="btn btn-sm btn-outline-secondary"
                      href={f.url}
                      download={f.name}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="bi bi-download me-1" aria-hidden />
                      Descargar
                    </a>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      title="Eliminar archivo"
                      aria-label={`Eliminar ${f.name}`}
                      disabled={
                        deletingRelativePath !== null || uploading
                      }
                      onClick={() => handleDelete(f)}
                    >
                      {deletingRelativePath === f.relativePath ? (
                        <span
                          className="spinner-border spinner-border-sm"
                          role="status"
                          aria-hidden
                        />
                      ) : (
                        <i className="bi bi-trash" aria-hidden />
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 ? (
            <nav
              className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3"
              aria-label="Paginación de documentos"
            >
              <span className="small text-muted">
                Página {currentPage} de {totalPages}
              </span>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage <= 1 ? "disabled" : ""}`}>
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
    </div>
  );
}
