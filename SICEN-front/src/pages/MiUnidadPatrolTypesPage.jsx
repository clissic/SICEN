import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Swal from "sweetalert2";
import { Layout } from "../components/Layout.jsx";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { isEmpreUnit } from "../constants/miUnidadEmpreDivisiones.js";
import { getMiUnidadDivision } from "../constants/miUnidadDivisions.js";
import {
  createBorderPatrolType,
  deleteBorderPatrolType,
  listBorderPatrolTypes,
  updateBorderPatrolType,
} from "../api/client.js";
import {
  PATROL_AREA_OPTIONS,
  areaLabel,
} from "../constants/borderPatrolFulfillment.js";
import {
  confirmDelete,
  escapeHtml,
  notifyDeleteError,
  notifyDeleteSuccess,
} from "../utils/confirmDelete.js";

const KIND_NAME = {
  fluvial: "Fluvial",
  terrestre: "Terrestre",
};

const EMPTY_FORM = { number: "", kind: "", detail: "", area: "" };

function compareRow(label, currentValue, nextValue) {
  return `<tr>
    <th scope="row" class="text-nowrap pe-2">${escapeHtml(label)}</th>
    <td class="text-break">${escapeHtml(currentValue)}</td>
    <td class="text-break">${escapeHtml(nextValue)}</td>
  </tr>`;
}

/** Advierte si el número+tipo ya existe y pide confirmar la modificación. */
async function confirmOverwritePatrolType(existing, next) {
  const kindName = KIND_NAME[next.kind] || next.kind;
  const rows = [
    compareRow(
      "Número",
      existing.number,
      next.number
    ),
    compareRow(
      "Tipo",
      KIND_NAME[existing.kind] || existing.kind,
      kindName
    ),
    compareRow("Área", areaLabel(existing.area), areaLabel(next.area)),
    compareRow("Detalle", existing.detail, next.detail),
  ].join("");

  return Swal.fire({
    icon: "warning",
    title: "Número de patrulla ya cargado",
    html: `
      <p class="text-start mb-2">
        Ya existe la patrulla <strong>Nº ${escapeHtml(String(next.number))} · ${escapeHtml(kindName)}</strong>.
        Si aceptás, se van a modificar los datos cargados.
      </p>
      <div class="table-responsive text-start">
        <table class="table table-sm table-bordered mb-0 align-middle">
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">Cargado</th>
              <th scope="col">A cargar</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `,
    showCancelButton: true,
    focusCancel: true,
    confirmButtonText: "Sí, modificar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#0d6efd",
    reverseButtons: true,
  });
}

function PatrolKindTable({ types, emptyLabel, deletingId, onEdit, onDelete }) {
  if (types.length === 0) {
    return <p className="text-muted small mb-0">{emptyLabel}</p>;
  }
  return (
    <div className="table-responsive">
      <table className="table table-borderless table-sm align-middle mb-0">
        <thead>
          <tr>
            <th>Número</th>
            <th>Área</th>
            <th>Detalle</th>
            <th className="text-end">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {types.map((type) => (
            <tr key={type._id}>
              <td>{type.number}</td>
              <td className="text-nowrap">{areaLabel(type.area)}</td>
              <td>{type.detail}</td>
              <td className="text-nowrap text-end">
                <button
                  type="button"
                  className="btn btn-link btn-sm text-body p-1 me-1"
                  data-sicen-popover="Editar"
                  aria-label="Editar"
                  onClick={() => onEdit(type)}
                  disabled={deletingId === type._id}
                >
                  <i className="bi bi-pencil-square" aria-hidden />
                </button>
                <button
                  type="button"
                  className="btn btn-link btn-sm text-danger p-1"
                  data-sicen-popover="Eliminar"
                  aria-label="Eliminar"
                  onClick={() => onDelete(type)}
                  disabled={deletingId === type._id}
                >
                  {deletingId === type._id ? (
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-label="Eliminando"
                    />
                  ) : (
                    <i className="bi bi-trash3" aria-hidden />
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MiUnidadPatrolTypesPage() {
  const { user } = useAuth();
  const unit = String(user?.unit || "").trim().toUpperCase();
  const division = getMiUnidadDivision("division-i");
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [tab, setTab] = useState("fluvial");

  const load = useCallback(async () => {
    if (!unit || isEmpreUnit(unit)) return;
    setLoading(true);
    setErr("");
    try {
      const data = await listBorderPatrolTypes(unit);
      setTypes(Array.isArray(data?.types) ? data.types : []);
    } catch (e) {
      setTypes([]);
      setErr(e?.message || "No se pudieron cargar las patrullas.");
    } finally {
      setLoading(false);
    }
  }, [unit]);

  useEffect(() => {
    load();
  }, [load]);

  if (!unit || isEmpreUnit(unit)) {
    return <Navigate to="/mi-unidad" replace />;
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit(type) {
    setEditingId(type._id);
    setForm({
      number: String(type.number),
      kind: type.kind,
      detail: type.detail,
      area: type.area || "",
    });
    setTab(type.kind === "terrestre" ? "terrestre" : "fluvial");
    setErr("");
  }

  function cancelEdit() {
    setEditingId("");
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    const number = Number(form.number);
    if (!Number.isInteger(number) || number < 1 || number > 99) {
      setErr("El número de patrulla tiene que ser entre 1 y 99.");
      return;
    }
    if (form.kind !== "fluvial" && form.kind !== "terrestre") {
      setErr("Elegí si es terrestre o fluvial.");
      return;
    }
    if (!form.detail.trim()) {
      setErr("Escribí el detalle de la patrulla.");
      return;
    }
    if (!form.area) {
      setErr("Elegí el área.");
      return;
    }
    const payload = {
      number,
      kind: form.kind,
      detail: form.detail.trim(),
      area: form.area,
    };
    const existing = types.find(
      (type) =>
        Number(type.number) === number &&
        type.kind === form.kind &&
        type._id !== editingId
    );
    if (existing) {
      const result = await confirmOverwritePatrolType(existing, payload);
      if (!result.isConfirmed) return;
    }
    setSaving(true);
    try {
      if (existing) {
        await updateBorderPatrolType(existing._id, payload);
      } else if (editingId) {
        await updateBorderPatrolType(editingId, payload);
      } else {
        await createBorderPatrolType(payload);
      }
      setTab(payload.kind);
      cancelEdit();
      await load();
    } catch (ex) {
      setErr(ex?.message || "No se pudo guardar la patrulla.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(type) {
    const kindName = KIND_NAME[type.kind] || type.kind;
    const result = await confirmDelete({
      resource: "patrulla",
      summaryHtml: `<ul class="mb-2 ps-3"><li>Nº ${escapeHtml(type.number)} · ${escapeHtml(kindName)}</li><li>${escapeHtml(areaLabel(type.area))}</li><li>${escapeHtml(type.detail)}</li></ul>`,
      extraNote:
        "Las asignaciones ya planificadas conservan el número, el área y el detalle.",
    });
    if (!result.isConfirmed) return;
    setDeletingId(type._id);
    setErr("");
    try {
      const data = await deleteBorderPatrolType(type._id);
      if (editingId === type._id) cancelEdit();
      notifyDeleteSuccess(data?.msg || "Patrulla eliminada.");
      await load();
    } catch (ex) {
      notifyDeleteError(ex, "No se pudo eliminar la patrulla.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <p className="text-muted small text-uppercase mb-1">
              {division?.title} · Frontera
            </p>
            <h3 className="m-0">Patrullas de frontera</h3>
            <p className="text-muted small mb-0 mt-1">
              Cargá el número, el área y el detalle de cada patrulla de {unit}.
              EMPRE las ve al planificar, cuando elige esta unidad.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Link
              className="btn btn-outline-secondary btn-sm"
              to="/mi-unidad/division-i"
            >
              {division?.title || "División I"}
            </Link>
            <Link className="btn btn-outline-secondary btn-sm" to="/mi-unidad">
              Mi Unidad
            </Link>
          </div>
        </div>

        <ErrorAlert message={err} className="alert alert-danger py-2 small" />

        <form className="row g-3 mb-4" onSubmit={handleSubmit}>
          <div className="col-12 col-md-2">
            <label className="form-label" htmlFor="patrol-type-number">
              Número
            </label>
            <input
              id="patrol-type-number"
              type="number"
              min={1}
              max={99}
              step={1}
              inputMode="numeric"
              className="form-control"
              value={form.number}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
                updateField("number", digits);
              }}
              onKeyDown={(e) => {
                if ([".", ",", "e", "E", "+", "-"].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              required
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label" htmlFor="patrol-type-kind">
              Terrestre o fluvial
            </label>
            <select
              id="patrol-type-kind"
              className="form-select"
              value={form.kind}
              onChange={(e) => {
                const next = e.target.value;
                updateField("kind", next);
                if (next === "fluvial" || next === "terrestre") setTab(next);
              }}
              required
            >
              <option value="">Elegí el tipo…</option>
              <option value="terrestre">Terrestre</option>
              <option value="fluvial">Fluvial</option>
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label" htmlFor="patrol-type-area">
              Área
            </label>
            <select
              id="patrol-type-area"
              className="form-select"
              value={form.area}
              onChange={(e) => updateField("area", e.target.value)}
              required
            >
              <option value="">Elegí el área…</option>
              {PATROL_AREA_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="patrol-type-detail">
              Detalle
            </label>
            <input
              id="patrol-type-detail"
              type="text"
              className="form-control"
              maxLength={240}
              placeholder="De dónde a dónde"
              value={form.detail}
              onChange={(e) => updateField("detail", e.target.value)}
              required
            />
          </div>
          <div className="col-12 d-flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? "Guardando…"
                : editingId
                  ? "Guardar cambios"
                  : "Cargar patrulla"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={cancelEdit}
                disabled={saving}
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>

        <ul className="nav nav-tabs patrol-kind-tabs mb-3" role="tablist">
          <li className="nav-item" role="presentation">
            <button
              type="button"
              className={`nav-link${tab === "fluvial" ? " active" : ""}`}
              role="tab"
              aria-selected={tab === "fluvial"}
              onClick={() => setTab("fluvial")}
            >
              Fluviales
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              type="button"
              className={`nav-link${tab === "terrestre" ? " active" : ""}`}
              role="tab"
              aria-selected={tab === "terrestre"}
              onClick={() => setTab("terrestre")}
            >
              Terrestres
            </button>
          </li>
        </ul>

        {loading ? (
          <p className="text-muted small">Cargando patrullas…</p>
        ) : (
          <PatrolKindTable
            types={types.filter((type) => type.kind === tab)}
            emptyLabel={
              tab === "fluvial"
                ? "Todavía no hay patrullas fluviales."
                : "Todavía no hay patrullas terrestres."
            }
            deletingId={deletingId}
            onEdit={startEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    </Layout>
  );
}
