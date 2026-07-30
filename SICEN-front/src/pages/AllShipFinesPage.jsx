import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  shipFineUpdate,
  shipFineUpdateWithProves,
  shipFinesPaginated,
} from "../api/client.js";
import { CarFineProveViewer } from "../components/CarFineProveViewer.jsx";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { Layout } from "../components/Layout.jsx";
import { ShipFineCard } from "../components/ShipFineCard.jsx";
import { SHIP_FINE_ARTICLE_OPTIONS } from "../constants/fineArticles.js";
import { FLAG_STATE_OPTIONS } from "../constants/flagStates.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  formatPlate,
  provesAsArray,
} from "../utils/carFineFormatters.js";
import { preventNegativeNumberKeys } from "../utils/nonNegativeNumberInput.js";

const PROVE_MAX_BYTES = 5 * 1024 * 1024;
const PROVE_SLOT_INDICES = [0, 1, 2];

function isValidProveFile(file) {
  if (!file) return true;
  const name = (file.name || "").toLowerCase();
  const okExt = name.endsWith(".jpg") || name.endsWith(".jpeg");
  const okMime = file.type === "image/jpeg" || file.type === "image/pjpeg";
  if (!okExt || !okMime) {
    return "Solo se aceptan archivos JPEG (.jpg / .jpeg).";
  }
  if (file.size > PROVE_MAX_BYTES) {
    return "Cada foto debe pesar 5 MB o menos.";
  }
  return true;
}

function buildFineEditorForm(fine) {
  return {
    fine_date: fine?.fine_date ?? "",
    fine_time: fine?.fine_time ?? "",
    fine_article: fine?.fine_article ?? "",
    fine_amount:
      fine?.fine_amount == null ? "" : String(fine.fine_amount),
    fine_extra_amount:
      fine?.fine_extra_amount == null ? "" : String(fine.fine_extra_amount),
    omi: fine?.omi == null ? "" : String(fine.omi),
    ship_reg_number: fine?.ship_reg_number ?? "",
    flag: fine?.flag ?? "",
    owner_ci: fine?.owner_ci ?? "",
    owner_name: fine?.owner_name ?? "",
    owner_tel: fine?.owner_tel ?? "",
    owner_dir: fine?.owner_dir ?? "",
  };
}

const STATUS_EDITABLE_ROLES = new Set([
  "contable",
  "admin",
  "superAdmin",
]);

const STATUS_EDIT_OPTIONS = [
  {
    value: "due",
    label: "Pendiente",
    icon: "bi-hourglass-split",
    modifier: "due",
    description: "La multa aún no fue saldada.",
  },
  {
    value: "paid",
    label: "Pagada",
    icon: "bi-check-circle-fill",
    modifier: "paid",
    description: "El titular abonó la multa.",
  },
  {
    value: "cancelled",
    label: "Anulada",
    icon: "bi-x-circle-fill",
    modifier: "cancelled",
    description: "La multa fue anulada (error o duplicado).",
  },
  {
    value: "dismissed",
    label: "Desestimada",
    icon: "bi-slash-circle-fill",
    modifier: "dismissed",
    description: "La multa fue desestimada y no corresponde cobrarla.",
  },
];

const EMPTY_FILTERS = Object.freeze({
  fine_number: "",
  fine_status: "",
  fine_date: "",
  fine_article: "",
  fine_author: "",
  fine_amount: "",
  omi: "",
  ship_reg_number: "",
  flag: "",
  owner_ci: "",
  owner_name: "",
});

const STATUS_FILTER_OPTIONS = [
  { value: "due", label: "Pendiente" },
  { value: "paid", label: "Pagada" },
  { value: "cancelled", label: "Anulada" },
  { value: "dismissed", label: "Desestimada" },
];

export function AllShipFinesPage() {
  const { user } = useAuth();
  const canEditStatus = STATUS_EDITABLE_ROLES.has(user?.role);

  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [statusEditor, setStatusEditor] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusErr, setStatusErr] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [fineEditor, setFineEditor] = useState(null);
  const [fineSaving, setFineSaving] = useState(false);
  const [fineEditorErr, setFineEditorErr] = useState("");

  const activeFilterCount = useMemo(
    () =>
      Object.values(appliedFilters).filter(
        (v) => v != null && String(v).trim() !== ""
      ).length,
    [appliedFilters]
  );

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function applyFilters(e) {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  }

  function openStatusEditor(fine) {
    if (!canEditStatus) return;
    const currentKey =
      typeof fine.fine_status === "string"
        ? fine.fine_status.trim().toLowerCase()
        : "";
    const initial = STATUS_EDIT_OPTIONS.some((o) => o.value === currentKey)
      ? currentKey
      : "due";
    setStatusErr("");
    setStatusMsg("");
    setStatusEditor({
      fineNumber: fine.fine_number,
      currentStatus: fine.fine_status || "",
      selected: initial,
      plate: formatPlate(fine.ship_reg_number),
    });
  }

  function closeStatusEditor() {
    if (statusSaving) return;
    setStatusEditor(null);
    setStatusErr("");
    setStatusMsg("");
  }

  function openFineEditor(fine) {
    if (!canEditStatus) return;
    setFineEditorErr("");
    const existingProves = provesAsArray(fine.fine_proves);
    const proveSlots = PROVE_SLOT_INDICES.map((i) => ({
      existingUrl: existingProves[i] ?? null,
      action: "keep",
      file: null,
      previewUrl: null,
    }));
    setFineEditor({
      fineNumber: fine.fine_number,
      plate: formatPlate(fine.ship_reg_number),
      form: buildFineEditorForm(fine),
      proveSlots,
    });
  }

  function closeFineEditor() {
    if (fineSaving) return;
    if (fineEditor?.proveSlots) {
      for (const s of fineEditor.proveSlots) {
        if (s?.previewUrl) URL.revokeObjectURL(s.previewUrl);
      }
    }
    setFineEditor(null);
    setFineEditorErr("");
  }

  function setFineEditorField(key, value) {
    setFineEditor((s) => (s ? { ...s, form: { ...s.form, [key]: value } } : s));
  }

  function replaceProveSlot(idx, file) {
    if (!file) return;
    const check = isValidProveFile(file);
    if (check !== true) {
      setFineEditorErr(`Prueba ${idx + 1}: ${check}`);
      return;
    }
    setFineEditorErr("");
    setFineEditor((s) => {
      if (!s) return s;
      const slots = s.proveSlots.slice();
      const prev = slots[idx];
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      const previewUrl = URL.createObjectURL(file);
      slots[idx] = {
        existingUrl: prev?.existingUrl ?? null,
        action: "replace",
        file,
        previewUrl,
      };
      return { ...s, proveSlots: slots };
    });
  }

  function removeProveSlot(idx) {
    setFineEditor((s) => {
      if (!s) return s;
      const slots = s.proveSlots.slice();
      const prev = slots[idx];
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      slots[idx] = {
        existingUrl: prev?.existingUrl ?? null,
        action: "remove",
        file: null,
        previewUrl: null,
      };
      return { ...s, proveSlots: slots };
    });
  }

  function resetProveSlot(idx) {
    setFineEditor((s) => {
      if (!s) return s;
      const slots = s.proveSlots.slice();
      const prev = slots[idx];
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      slots[idx] = {
        existingUrl: prev?.existingUrl ?? null,
        action: "keep",
        file: null,
        previewUrl: null,
      };
      return { ...s, proveSlots: slots };
    });
  }

  async function saveFineEditor() {
    if (!fineEditor) return;
    const f = fineEditor.form;
    const fineAmount = f.fine_amount === "" ? NaN : Number(f.fine_amount);
    if (Number.isNaN(fineAmount) || fineAmount < 0) {
      setFineEditorErr(
        "El importe en U.R. debe ser un número mayor o igual a 0."
      );
      return;
    }
    const extraAmount =
      f.fine_extra_amount === "" ? 0 : Number(f.fine_extra_amount);
    if (Number.isNaN(extraAmount) || extraAmount < 0) {
      setFineEditorErr(
        "El importe extra debe ser un número mayor o igual a 0."
      );
      return;
    }
    if (!f.fine_date || !f.fine_time || !f.fine_article) {
      setFineEditorErr("Fecha, hora y artículo son obligatorios.");
      return;
    }
    const omiNumber = f.omi === "" ? NaN : Number(f.omi);
    if (!Number.isFinite(omiNumber) || omiNumber <= 0) {
      setFineEditorErr(
        "El número OMI debe ser un valor numérico mayor a 0."
      );
      return;
    }
    if (!f.ship_reg_number) {
      setFineEditorErr("La matrícula del buque es obligatoria.");
      return;
    }

    const proveSlots = fineEditor.proveSlots || [];
    for (let i = 0; i < proveSlots.length; i++) {
      const s = proveSlots[i];
      if (s?.action === "replace" && s.file) {
        const check = isValidProveFile(s.file);
        if (check !== true) {
          setFineEditorErr(`Prueba ${i + 1}: ${check}`);
          return;
        }
      }
    }
    const finalProveCount = proveSlots.filter(
      (s) =>
        (s?.action === "keep" && s.existingUrl) ||
        (s?.action === "replace" && s.file)
    ).length;
    if (finalProveCount === 0) {
      setFineEditorErr(
        "Debe quedar al menos una foto de prueba en la multa (.jpg, hasta 5 MB)."
      );
      return;
    }

    setFineSaving(true);
    setFineEditorErr("");
    try {
      const body = {
        ...f,
        fine_amount: fineAmount,
        fine_extra_amount: extraAmount,
        omi: omiNumber,
      };
      const updated = await shipFineUpdateWithProves(
        fineEditor.fineNumber,
        body,
        proveSlots
      );
      const nextFineProves = Array.isArray(updated?.payload?.fine_proves)
        ? updated.payload.fine_proves
        : null;
      setStatusMsg(
        updated?.msg ||
          `Multa N° ${fineEditor.fineNumber} actualizada correctamente.`
      );
      setData((prev) => {
        if (!prev) return prev;
        const list = Array.isArray(prev.paginatedFines)
          ? prev.paginatedFines
          : [];
        return {
          ...prev,
          paginatedFines: list.map((doc) => {
            if (doc.fine_number !== fineEditor.fineNumber) return doc;
            return {
              ...doc,
              ...body,
              ...(nextFineProves ? { fine_proves: nextFineProves } : {}),
            };
          }),
        };
      });
      if (fineEditor?.proveSlots) {
        for (const s of fineEditor.proveSlots) {
          if (s?.previewUrl) URL.revokeObjectURL(s.previewUrl);
        }
      }
      setFineEditor(null);
    } catch (ex) {
      setFineEditorErr(ex.message || "No se pudo actualizar la multa.");
    } finally {
      setFineSaving(false);
    }
  }

  async function saveStatusEditor() {
    if (!statusEditor) return;
    if (statusEditor.selected === statusEditor.currentStatus) {
      setStatusEditor(null);
      return;
    }
    setStatusSaving(true);
    setStatusErr("");
    setStatusMsg("");
    try {
      const newStatus = statusEditor.selected;
      const updated = await shipFineUpdate(statusEditor.fineNumber, {
        fine_status: newStatus,
      });
      setStatusMsg(
        updated?.msg ||
          `Estado de la multa N° ${statusEditor.fineNumber} actualizado.`
      );
      setData((prev) => {
        if (!prev) return prev;
        const list = Array.isArray(prev.paginatedFines)
          ? prev.paginatedFines
          : [];
        return {
          ...prev,
          paginatedFines: list.map((f) =>
            f.fine_number === statusEditor.fineNumber
              ? { ...f, fine_status: newStatus }
              : f
          ),
        };
      });
      setStatusEditor(null);
    } catch (ex) {
      setStatusErr(ex.message || "No se pudo actualizar el estado.");
    } finally {
      setStatusSaving(false);
    }
  }

  const closeViewer = useCallback(() => setViewer(null), []);

  const stepViewer = useCallback((delta) => {
    setViewer((current) => {
      if (!current) return current;
      const len = current.items.length;
      if (len <= 1) return current;
      const next = (current.index + delta + len) % len;
      return { ...current, index: next };
    });
  }, []);

  useEffect(() => {
    if (!statusEditor) return;
    function onKey(e) {
      if (e.key === "Escape" && !statusSaving) {
        e.preventDefault();
        setStatusEditor(null);
        setStatusErr("");
      }
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [statusEditor, statusSaving]);

  useEffect(() => {
    if (!fineEditor) return;
    function onKey(e) {
      if (e.key === "Escape" && !fineSaving) {
        e.preventDefault();
        setFineEditor(null);
        setFineEditorErr("");
      }
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fineEditor, fineSaving]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr("");
    const params = { currentPage: page, pageSize: 6, sort: "desc" };
    for (const [k, v] of Object.entries(appliedFilters)) {
      if (v != null && String(v).trim() !== "") {
        params[k] = String(v).trim();
      }
    }
    shipFinesPaginated(params)
      .then((r) => {
        if (!alive) return;
        setData(r.payload);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e.message);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [page, appliedFilters]);

  const fines = data?.paginatedFines ?? [];

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
          <h3 className="m-0">Consulta de multas de buques</h3>
          <Link
            className="btn btn-outline-secondary btn-sm"
            to="/multas/buques"
          >
            Volver
          </Link>
        </div>

        <div className="accordion mb-3" id="ship-fines-filters-accordion">
          <div className="accordion-item">
            <h2 className="accordion-header">
              <button
                className="accordion-button collapsed"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#ship-fines-filters"
                aria-expanded="false"
                aria-controls="ship-fines-filters"
              >
                <i className="bi bi-funnel me-2" aria-hidden />
                Filtros de búsqueda
                {activeFilterCount > 0 ? (
                  <span className="badge text-bg-primary ms-2">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </h2>
            <div
              id="ship-fines-filters"
              className="accordion-collapse collapse"
              data-bs-parent="#ship-fines-filters-accordion"
            >
              <div className="accordion-body">
                <form onSubmit={applyFilters} className="row g-3">
                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label" htmlFor="flt_ship_fine_number">
                      N° de multa
                    </label>
                    <input
                      id="flt_ship_fine_number"
                      type="number"
                      min={0}
                      className="form-control"
                      value={filters.fine_number}
                      onChange={(e) =>
                        setFilter("fine_number", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6 col-lg-4">
                    <label
                      className="form-label"
                      htmlFor="flt_ship_fine_status"
                    >
                      Estado
                    </label>
                    <select
                      id="flt_ship_fine_status"
                      className="form-select"
                      value={filters.fine_status}
                      onChange={(e) =>
                        setFilter("fine_status", e.target.value)
                      }
                    >
                      <option value="">Todos</option>
                      {STATUS_FILTER_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label" htmlFor="flt_ship_fine_date">
                      Fecha
                    </label>
                    <input
                      id="flt_ship_fine_date"
                      type="date"
                      className="form-control"
                      value={filters.fine_date}
                      onChange={(e) =>
                        setFilter("fine_date", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6 col-lg-4">
                    <label
                      className="form-label"
                      htmlFor="flt_ship_fine_article"
                    >
                      Artículo
                    </label>
                    <select
                      id="flt_ship_fine_article"
                      className="form-select"
                      value={filters.fine_article}
                      onChange={(e) =>
                        setFilter("fine_article", e.target.value)
                      }
                    >
                      <option value="">Todos</option>
                      {SHIP_FINE_ARTICLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6 col-lg-4">
                    <label
                      className="form-label"
                      htmlFor="flt_ship_fine_amount"
                    >
                      Importe (U.R.)
                    </label>
                    <input
                      id="flt_ship_fine_amount"
                      type="number"
                      min={0}
                      step="any"
                      className="form-control"
                      value={filters.fine_amount}
                      onChange={(e) =>
                        setFilter("fine_amount", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6 col-lg-4">
                    <label
                      className="form-label"
                      htmlFor="flt_ship_fine_author"
                    >
                      Autor (email)
                    </label>
                    <input
                      id="flt_ship_fine_author"
                      type="text"
                      className="form-control"
                      value={filters.fine_author}
                      onChange={(e) =>
                        setFilter("fine_author", e.target.value)
                      }
                      placeholder="usuario@armada.mil.uy"
                    />
                  </div>
                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label" htmlFor="flt_ship_omi">
                      Número OMI
                    </label>
                    <input
                      id="flt_ship_omi"
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      className="form-control"
                      value={filters.omi}
                      onChange={(e) =>
                        setFilter("omi", e.target.value.replace(/[^\d]/g, ""))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6 col-lg-4">
                    <label
                      className="form-label"
                      htmlFor="flt_ship_reg_number"
                    >
                      Matrícula
                    </label>
                    <input
                      id="flt_ship_reg_number"
                      type="text"
                      className="form-control text-uppercase"
                      value={filters.ship_reg_number}
                      onChange={(e) =>
                        setFilter(
                          "ship_reg_number",
                          e.target.value.replace(/\s+/g, "").toUpperCase()
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === " ") e.preventDefault();
                      }}
                      autoComplete="off"
                      style={{ textTransform: "uppercase" }}
                    />
                  </div>
                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label" htmlFor="flt_ship_flag">
                      Bandera
                    </label>
                    <select
                      id="flt_ship_flag"
                      className="form-select"
                      value={filters.flag}
                      onChange={(e) => setFilter("flag", e.target.value)}
                    >
                      <option value="">Todas</option>
                      {FLAG_STATE_OPTIONS.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                      {filters.flag &&
                      !FLAG_STATE_OPTIONS.includes(filters.flag) ? (
                        <option value={filters.flag}>{filters.flag}</option>
                      ) : null}
                    </select>
                  </div>
                  <div className="col-12 col-md-6 col-lg-4">
                    <label className="form-label" htmlFor="flt_ship_owner_ci">
                      DNI del titular
                    </label>
                    <input
                      id="flt_ship_owner_ci"
                      type="text"
                      className="form-control"
                      value={filters.owner_ci}
                      onChange={(e) =>
                        setFilter("owner_ci", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6 col-lg-4">
                    <label
                      className="form-label"
                      htmlFor="flt_ship_owner_name"
                    >
                      Nombre del titular
                    </label>
                    <input
                      id="flt_ship_owner_name"
                      type="text"
                      className="form-control"
                      value={filters.owner_name}
                      onChange={(e) =>
                        setFilter("owner_name", e.target.value)
                      }
                    />
                  </div>

                  <div className="col-12 d-flex flex-wrap justify-content-end gap-2 pt-1">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={resetFilters}
                      disabled={
                        activeFilterCount === 0 &&
                        Object.values(filters).every(
                          (v) => v == null || String(v).trim() === ""
                        )
                      }
                    >
                      <i className="bi bi-eraser me-1" aria-hidden />
                      Limpiar
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <i className="bi bi-search me-1" aria-hidden />
                      Buscar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        <ErrorAlert message={err} />
        {statusMsg ? (
          <div
            className="alert alert-success py-2 d-flex align-items-center justify-content-between gap-3"
            role="status"
          >
            <span>{statusMsg}</span>
            <button
              type="button"
              className="btn-close"
              aria-label="Cerrar"
              onClick={() => setStatusMsg("")}
            />
          </div>
        ) : null}

        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <div className="text-muted small">
            Total: <strong>{data?.totalDocs ?? "—"}</strong> · Página{" "}
            <strong>{data?.page ?? page}</strong> /{" "}
            <strong>{data?.totalPages ?? "—"}</strong> · 6 por página
          </div>
          {loading ? (
            <span className="badge text-bg-light border">Cargando…</span>
          ) : null}
        </div>

        {fines.length === 0 && !loading && !err ? (
          <div className="alert alert-secondary py-2 mb-3">
            No hay multas para mostrar.
          </div>
        ) : null}

        <div className="row g-3">
          {fines.map((r) => (
            <div key={r._id} className="col-12 col-xl-6 d-flex">
              <ShipFineCard
                fine={r}
                onStatusEdit={canEditStatus ? openStatusEditor : undefined}
                onDataEdit={canEditStatus ? openFineEditor : undefined}
                onOpenProve={(info) => setViewer(info)}
              />
            </div>
          ))}
        </div>
        <nav className="mt-3" aria-label="Paginación de multas de buques">
          <ul className="pagination pagination-sm mb-0">
            <li
              className={`page-item ${
                !data?.hasPrevPage ? "disabled" : ""
              }`}
            >
              <button
                className="page-link"
                type="button"
                onClick={() => setPage(data.prevPage)}
                disabled={!data?.hasPrevPage}
              >
                Anterior
              </button>
            </li>
            <li className="page-item disabled">
              <span className="page-link">
                {data?.page ?? page} / {data?.totalPages ?? "—"}
              </span>
            </li>
            <li
              className={`page-item ${
                !data?.hasNextPage ? "disabled" : ""
              }`}
            >
              <button
                className="page-link"
                type="button"
                onClick={() => setPage(data.nextPage)}
                disabled={!data?.hasNextPage}
              >
                Siguiente
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {fineEditor ? (
        <div
          className="car-fine-status-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Editar datos de la multa"
          onClick={closeFineEditor}
        >
          <div
            className="car-fine-status-modal__dialog car-fine-status-modal__dialog--wide card shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header d-flex align-items-center justify-content-between gap-2">
              <div>
                <div className="fw-semibold">
                  Editar datos · Multa N° {fineEditor.fineNumber}
                </div>
                {fineEditor.plate ? (
                  <small className="text-muted">
                    Matrícula {fineEditor.plate}
                  </small>
                ) : null}
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                disabled={fineSaving}
                onClick={closeFineEditor}
              />
            </div>
            <div className="card-body">
              {fineEditorErr ? (
                <ErrorAlert message={fineEditorErr} />
              ) : null}
              <form
                className="row g-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveFineEditor();
                }}
              >
                <div className="col-12">
                  <h6 className="text-muted mb-0">Datos de la multa</h6>
                </div>
                <div className="col-12 col-md-4">
                  <label
                    className="form-label"
                    htmlFor="edit_ship_fine_date"
                  >
                    Fecha*
                  </label>
                  <input
                    id="edit_ship_fine_date"
                    type="date"
                    className="form-control"
                    required
                    value={fineEditor.form.fine_date}
                    onChange={(e) =>
                      setFineEditorField("fine_date", e.target.value)
                    }
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label
                    className="form-label"
                    htmlFor="edit_ship_fine_time"
                  >
                    Hora*
                  </label>
                  <input
                    id="edit_ship_fine_time"
                    type="time"
                    className="form-control"
                    required
                    value={fineEditor.form.fine_time}
                    onChange={(e) =>
                      setFineEditorField("fine_time", e.target.value)
                    }
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label
                    className="form-label"
                    htmlFor="edit_ship_fine_article"
                  >
                    Artículo*
                  </label>
                  <select
                    id="edit_ship_fine_article"
                    className="form-select"
                    required
                    value={fineEditor.form.fine_article}
                    onChange={(e) =>
                      setFineEditorField("fine_article", e.target.value)
                    }
                  >
                    <option value="" disabled>
                      Seleccionar artículo…
                    </option>
                    {SHIP_FINE_ARTICLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                    {fineEditor.form.fine_article &&
                    !SHIP_FINE_ARTICLE_OPTIONS.some(
                      (o) => o.value === fineEditor.form.fine_article
                    ) ? (
                      <option value={fineEditor.form.fine_article}>
                        {fineEditor.form.fine_article}
                      </option>
                    ) : null}
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label
                    className="form-label"
                    htmlFor="edit_ship_fine_amount"
                  >
                    Cantidad U.R.*
                  </label>
                  <input
                    id="edit_ship_fine_amount"
                    type="number"
                    className="form-control"
                    required
                    min={0}
                    step="any"
                    onKeyDown={preventNegativeNumberKeys}
                    value={fineEditor.form.fine_amount}
                    onChange={(e) =>
                      setFineEditorField("fine_amount", e.target.value)
                    }
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label
                    className="form-label"
                    htmlFor="edit_ship_fine_extra_amount"
                  >
                    Cantidad extra U.R.
                  </label>
                  <input
                    id="edit_ship_fine_extra_amount"
                    type="number"
                    className="form-control"
                    min={0}
                    step="any"
                    onKeyDown={preventNegativeNumberKeys}
                    value={fineEditor.form.fine_extra_amount}
                    onChange={(e) =>
                      setFineEditorField(
                        "fine_extra_amount",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="col-12 mt-2">
                  <h6 className="text-muted mb-0">Datos del buque</h6>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="edit_ship_omi">
                    Número OMI*
                  </label>
                  <input
                    id="edit_ship_omi"
                    type="number"
                    className="form-control"
                    required
                    min={0}
                    step={1}
                    inputMode="numeric"
                    onKeyDown={(e) => {
                      preventNegativeNumberKeys(e);
                      if (e.key === ".") e.preventDefault();
                    }}
                    value={fineEditor.form.omi}
                    onChange={(e) =>
                      setFineEditorField(
                        "omi",
                        e.target.value.replace(/[^\d]/g, "")
                      )
                    }
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label
                    className="form-label"
                    htmlFor="edit_ship_reg_number"
                  >
                    Matrícula del buque*
                  </label>
                  <input
                    id="edit_ship_reg_number"
                    className="form-control text-uppercase"
                    required
                    inputMode="text"
                    autoComplete="off"
                    spellCheck={false}
                    value={fineEditor.form.ship_reg_number}
                    onChange={(e) =>
                      setFineEditorField(
                        "ship_reg_number",
                        e.target.value.replace(/\s+/g, "").toUpperCase()
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === " ") e.preventDefault();
                    }}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData("text");
                      if (/\s/.test(text)) {
                        e.preventDefault();
                        setFineEditorField(
                          "ship_reg_number",
                          text.replace(/\s+/g, "").toUpperCase()
                        );
                      }
                    }}
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="edit_ship_flag">
                    Bandera
                  </label>
                  <select
                    id="edit_ship_flag"
                    className="form-select"
                    value={fineEditor.form.flag}
                    onChange={(e) =>
                      setFineEditorField("flag", e.target.value)
                    }
                  >
                    <option value="">Seleccione país…</option>
                    {FLAG_STATE_OPTIONS.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                    {fineEditor.form.flag &&
                    !FLAG_STATE_OPTIONS.includes(fineEditor.form.flag) ? (
                      <option value={fineEditor.form.flag}>
                        {fineEditor.form.flag}
                      </option>
                    ) : null}
                  </select>
                </div>

                <div className="col-12 mt-2">
                  <h6 className="text-muted mb-0">Datos del propietario</h6>
                </div>
                <div className="col-12 col-md-4">
                  <label
                    className="form-label"
                    htmlFor="edit_ship_owner_ci"
                  >
                    DNI / Pasaporte
                  </label>
                  <input
                    id="edit_ship_owner_ci"
                    className="form-control"
                    value={fineEditor.form.owner_ci}
                    onChange={(e) =>
                      setFineEditorField("owner_ci", e.target.value)
                    }
                  />
                </div>
                <div className="col-12 col-md-8">
                  <label
                    className="form-label"
                    htmlFor="edit_ship_owner_name"
                  >
                    Nombre
                  </label>
                  <input
                    id="edit_ship_owner_name"
                    className="form-control"
                    value={fineEditor.form.owner_name}
                    onChange={(e) =>
                      setFineEditorField("owner_name", e.target.value)
                    }
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label
                    className="form-label"
                    htmlFor="edit_ship_owner_tel"
                  >
                    Teléfono
                  </label>
                  <input
                    id="edit_ship_owner_tel"
                    type="tel"
                    className="form-control"
                    value={fineEditor.form.owner_tel}
                    onChange={(e) =>
                      setFineEditorField("owner_tel", e.target.value)
                    }
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label
                    className="form-label"
                    htmlFor="edit_ship_owner_dir"
                  >
                    Dirección
                  </label>
                  <input
                    id="edit_ship_owner_dir"
                    className="form-control"
                    value={fineEditor.form.owner_dir}
                    onChange={(e) =>
                      setFineEditorField("owner_dir", e.target.value)
                    }
                  />
                </div>

                <div className="col-12">
                  <div className="border rounded p-3 car-fine-editor-proves">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="fw-semibold">
                        <i className="bi bi-image me-2" aria-hidden />
                        Pruebas (.jpg, máx. 5 MB)
                      </div>
                      <small className="text-muted">
                        Hasta 3 fotos. Las nuevas reemplazan a las anteriores.
                      </small>
                    </div>
                    <div className="row g-3">
                      {PROVE_SLOT_INDICES.map((idx) => {
                        const slot = fineEditor.proveSlots?.[idx];
                        if (!slot) return null;
                        const inputId = `edit_ship_prove_slot_${idx + 1}`;
                        const previewSrc =
                          slot.previewUrl ||
                          (slot.action === "keep" && slot.existingUrl
                            ? slot.existingUrl
                            : null);
                        const hasExisting = Boolean(slot.existingUrl);
                        return (
                          <div className="col-12 col-md-4" key={idx}>
                            <div className="car-fine-editor-prove h-100 d-flex flex-column">
                              <div className="car-fine-editor-prove__badge">
                                Prueba {idx + 1}
                              </div>
                              <div className="car-fine-editor-prove__preview">
                                {previewSrc ? (
                                  <img
                                    src={previewSrc}
                                    alt={`Prueba ${idx + 1}`}
                                    className="car-fine-editor-prove__img"
                                  />
                                ) : (
                                  <div className="car-fine-editor-prove__empty">
                                    <i
                                      className="bi bi-image text-muted fs-2"
                                      aria-hidden
                                    />
                                    <span className="text-muted small">
                                      {slot.action === "remove" && hasExisting
                                        ? "Foto marcada para eliminar"
                                        : "Sin foto"}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="car-fine-editor-prove__actions d-flex flex-wrap gap-2 mt-2">
                                <label
                                  htmlFor={inputId}
                                  className="btn btn-sm btn-outline-primary mb-0"
                                >
                                  <i
                                    className="bi bi-upload me-1"
                                    aria-hidden
                                  />
                                  {hasExisting || slot.file
                                    ? "Reemplazar"
                                    : "Subir"}
                                </label>
                                <input
                                  id={inputId}
                                  type="file"
                                  accept="image/jpeg,.jpg,.jpeg"
                                  className="d-none"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    if (file) replaceProveSlot(idx, file);
                                    e.target.value = "";
                                  }}
                                />
                                {(slot.action === "replace" ||
                                  slot.action === "remove") && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => resetProveSlot(idx)}
                                  >
                                    <i
                                      className="bi bi-arrow-counterclockwise me-1"
                                      aria-hidden
                                    />
                                    Deshacer
                                  </button>
                                )}
                                {hasExisting && slot.action !== "remove" && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => removeProveSlot(idx)}
                                  >
                                    <i
                                      className="bi bi-trash me-1"
                                      aria-hidden
                                    />
                                    Quitar
                                  </button>
                                )}
                              </div>
                              <div className="car-fine-editor-prove__hint mt-2 small text-muted">
                                {slot.action === "replace"
                                  ? `Nueva: ${slot.file?.name ?? ""}`
                                  : slot.action === "remove"
                                    ? "Se eliminará al guardar."
                                    : hasExisting
                                      ? "Foto actual."
                                      : "Slot vacío."}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="card-footer d-flex flex-wrap justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={closeFineEditor}
                disabled={fineSaving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary d-inline-flex align-items-center gap-2"
                onClick={saveFineEditor}
                disabled={fineSaving}
                aria-busy={fineSaving}
              >
                {fineSaving ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden
                      style={{
                        width: "1em",
                        height: "1em",
                        borderWidth: "0.15em",
                      }}
                    />
                    <span>Guardando…</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-save" aria-hidden />
                    <span>Guardar cambios</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {statusEditor ? (
        <div
          className="car-fine-status-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Cambiar estado de la multa"
          onClick={closeStatusEditor}
        >
          <div
            className="car-fine-status-modal__dialog card shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header d-flex align-items-center justify-content-between gap-2">
              <div>
                <div className="fw-semibold">
                  Cambiar estado · Multa N° {statusEditor.fineNumber}
                </div>
                {statusEditor.plate ? (
                  <small className="text-muted">
                    Matrícula {statusEditor.plate}
                  </small>
                ) : null}
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                disabled={statusSaving}
                onClick={closeStatusEditor}
              />
            </div>
            <div className="card-body">
              {statusErr ? (
                <ErrorAlert message={statusErr} />
              ) : null}
              <div
                className="car-fine-status-modal__options"
                role="radiogroup"
                aria-label="Estado de la multa"
              >
                {STATUS_EDIT_OPTIONS.map((o) => {
                  const isSelected = statusEditor.selected === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={statusSaving}
                      className={`car-fine-status-modal__option car-fine-status-modal__option--${o.modifier}${
                        isSelected ? " is-selected" : ""
                      }`}
                      onClick={() =>
                        setStatusEditor((s) =>
                          s ? { ...s, selected: o.value } : s
                        )
                      }
                    >
                      <span className="car-fine-status-modal__option-icon">
                        <i className={`bi ${o.icon}`} aria-hidden />
                      </span>
                      <span className="car-fine-status-modal__option-body">
                        <span className="car-fine-status-modal__option-label">
                          {o.label}
                        </span>
                        <span className="car-fine-status-modal__option-description">
                          {o.description}
                        </span>
                      </span>
                      {isSelected ? (
                        <i
                          className="bi bi-check-lg car-fine-status-modal__option-check"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="card-footer d-flex flex-wrap justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={closeStatusEditor}
                disabled={statusSaving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary d-inline-flex align-items-center gap-2"
                onClick={saveStatusEditor}
                disabled={
                  statusSaving ||
                  statusEditor.selected ===
                    String(statusEditor.currentStatus || "")
                      .trim()
                      .toLowerCase()
                }
                aria-busy={statusSaving}
              >
                {statusSaving ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden
                      style={{
                        width: "1em",
                        height: "1em",
                        borderWidth: "0.15em",
                      }}
                    />
                    <span>Guardando…</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-save" aria-hidden />
                    <span>Guardar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CarFineProveViewer
        viewer={viewer}
        onClose={closeViewer}
        onStep={stepViewer}
      />
    </Layout>
  );
}
