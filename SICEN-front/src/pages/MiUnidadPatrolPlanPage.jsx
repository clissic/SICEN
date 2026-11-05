import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { BorderPatrolEditModal } from "../components/borderPatrol/BorderPatrolEditModal.jsx";
import { BorderPatrolInfoModal } from "../components/borderPatrol/BorderPatrolInfoModal.jsx";
import { BorderPatrolMonthNav } from "../components/borderPatrol/BorderPatrolMonthNav.jsx";
import {
  WEEKDAY_HEADERS,
  formatDisplay,
  isoDate,
  monthCells,
  shiftMonth,
  weekdayLong,
} from "../components/borderPatrol/borderPatrolCalendarUtils.js";
import { useAuth } from "../context/AuthContext.jsx";
import { isEmpreUnit } from "../constants/miUnidadEmpreDivisiones.js";
import { getMiUnidadDivision } from "../constants/miUnidadDivisions.js";
import { statusLabel } from "../constants/borderPatrolFulfillment.js";
import {
  listBorderPatrols,
  updateBorderPatrolStatus,
} from "../api/client.js";

function DayDetail({
  iso,
  patrols,
  onEdit,
  onInfo,
}) {
  const [kindTab, setKindTab] = useState("fluvial");
  const visible = patrols
    .filter((p) => p.kind === kindTab)
    .sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));

  return (
    <section className="mt-4" aria-label="Patrullas del día">
      <h4 className="h6 mb-3">
        {weekdayLong(iso)} {formatDisplay(iso)}
      </h4>
      <ul className="nav nav-tabs patrol-kind-tabs mb-3" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link${kindTab === "fluvial" ? " active" : ""}`}
            role="tab"
            aria-selected={kindTab === "fluvial"}
            onClick={() => setKindTab("fluvial")}
          >
            Fluviales
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link${kindTab === "terrestre" ? " active" : ""}`}
            role="tab"
            aria-selected={kindTab === "terrestre"}
            onClick={() => setKindTab("terrestre")}
          >
            Terrestres
          </button>
        </li>
      </ul>
      {visible.length === 0 ? (
        <p className="text-muted small mb-0">
          {kindTab === "fluvial"
            ? "No hay patrullas fluviales."
            : "No hay patrullas terrestres."}
        </p>
      ) : (
        <div className="table-responsive">
          <table className="table table-borderless table-sm align-middle mb-0">
            <thead>
              <tr>
                <th className="text-nowrap">Nro.</th>
                <th>Detalle</th>
                <th>Estado</th>
                <th>Observaciones</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((patrol) => (
                <tr key={patrol._id}>
                  <td className="text-nowrap">{patrol.number ?? "—"}</td>
                  <td className="text-break">
                    {patrol.detail || "Sin detalle"}
                  </td>
                  <td className="text-nowrap">
                    <span
                      className={`empre-patrol-state empre-patrol-state--${patrol.status}`}
                    >
                      {statusLabel(patrol.status)}
                    </span>
                  </td>
                  <td className="text-break empre-patrol-notes">
                    {patrol.observations ? (
                      patrol.observations
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="text-nowrap text-end">
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-body p-1 me-1"
                      data-sicen-popover="Información"
                      aria-label="Información"
                      onClick={() => onInfo(patrol)}
                    >
                      <i className="bi bi-info-circle" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-body p-1"
                      data-sicen-popover="Modificar"
                      aria-label="Modificar"
                      onClick={() => onEdit(patrol)}
                    >
                      <i className="bi bi-pencil-square" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function MiUnidadPatrolPlanPage() {
  const { user } = useAuth();
  const unit = String(user?.unit || "").trim().toUpperCase();
  const division = getMiUnidadDivision("division-i");
  const today = new Date();
  const todayIso = isoDate(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [patrols, setPatrols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [editing, setEditing] = useState(null);
  const [infoPatrol, setInfoPatrol] = useState(null);
  const [editErr, setEditErr] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    if (!unit || isEmpreUnit(unit)) return;
    setLoading(true);
    setErr("");
    try {
      const data = await listBorderPatrols({ year, month });
      setPatrols(Array.isArray(data?.patrols) ? data.patrols : []);
    } catch (e) {
      setPatrols([]);
      setErr(e?.message || "No se pudieron cargar las patrullas.");
    } finally {
      setLoading(false);
    }
  }, [year, month, unit]);

  useEffect(() => {
    load();
  }, [load]);

  const byDate = useMemo(() => {
    const map = new Map();
    for (const p of patrols) {
      const list = map.get(p.date) || [];
      list.push(p);
      map.set(p.date, list);
    }
    return map;
  }, [patrols]);

  function goMonth(delta) {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
    setSelectedDate("");
    setEditing(null);
  }

  function jumpMonth(nextYear, nextMonth) {
    if (nextYear === year && nextMonth === month) return;
    setYear(nextYear);
    setMonth(nextMonth);
    setSelectedDate("");
    setEditing(null);
  }

  async function saveEdit(payload) {
    if (!editing?._id) return;
    setSavingEdit(true);
    setEditErr("");
    try {
      const data = await updateBorderPatrolStatus(editing._id, payload);
      const next = data?.patrol;
      setPatrols((prev) =>
        prev.map((p) => (p._id === editing._id ? { ...p, ...next } : p))
      );
      setEditing(null);
    } catch (e) {
      setEditErr(e?.message || "No se pudo actualizar la patrulla.");
    } finally {
      setSavingEdit(false);
    }
  }

  if (!unit || isEmpreUnit(unit)) {
    return <Navigate to="/mi-unidad" replace />;
  }

  const cells = monthCells(year, month);

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <p className="text-muted small text-uppercase mb-1">
              {division?.title || "División I"} · Frontera
            </p>
            <h3 className="m-0">Planificación mensual</h3>
            <p className="text-muted small mb-0 mt-1">
              Planificación proyectada por el Estado Mayor.
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

        <BorderPatrolMonthNav
          year={year}
          month={month}
          onShift={goMonth}
          onJump={jumpMonth}
        />

        {loading ? (
          <p className="text-muted small">Cargando patrullas…</p>
        ) : (
          <>
            <div className="empre-patrol-cal empre-patrol-cal--head" aria-hidden>
              {WEEKDAY_HEADERS.map((label) => (
                <div key={label} className="empre-patrol-cal__weekday">
                  {label}
                </div>
              ))}
            </div>
            <div className="empre-patrol-cal">
              {cells.map((day, index) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="empre-patrol-day is-empty"
                    />
                  );
                }
                const iso = isoDate(year, month, day);
                const list = byDate.get(iso) || [];
                const fluvialCount = list.filter((p) => p.kind === "fluvial")
                  .length;
                const terrestreCount = list.filter(
                  (p) => p.kind === "terrestre"
                ).length;
                const selected = selectedDate === iso;
                const past = iso < todayIso;
                const todayCell = iso === todayIso;
                return (
                  <button
                    key={iso}
                    type="button"
                    className={`empre-patrol-day${past ? " is-past" : ""}${todayCell ? " is-today" : ""}${selected ? " is-selected" : ""}`}
                    aria-pressed={selected}
                    aria-label={`${weekdayLong(iso)} ${formatDisplay(iso)}`}
                    onClick={() => setSelectedDate(iso)}
                  >
                    <div className="empre-patrol-day__head">
                      <span className="empre-patrol-day__name">
                        {weekdayLong(iso)}
                      </span>
                      <span className="empre-patrol-day__date">{day}</span>
                    </div>
                    <div className="empre-patrol-block">
                      <div className="empre-patrol-block__title">Totales:</div>
                      <div className="empre-patrol-day__counts">
                        <span
                          className={`empre-patrol-count empre-patrol-count--fluvial${fluvialCount === 0 ? " is-zero" : ""}`}
                        >
                          <span className="empre-patrol-count__n">
                            {fluvialCount}
                          </span>
                          <span className="empre-patrol-count__label">
                            Fluvial
                          </span>
                        </span>
                        <span
                          className={`empre-patrol-count empre-patrol-count--terrestre${terrestreCount === 0 ? " is-zero" : ""}`}
                        >
                          <span className="empre-patrol-count__n">
                            {terrestreCount}
                          </span>
                          <span className="empre-patrol-count__label">
                            Terrestre
                          </span>
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedDate ? (
              <DayDetail
                key={selectedDate}
                iso={selectedDate}
                patrols={byDate.get(selectedDate) || []}
                onEdit={setEditing}
                onInfo={setInfoPatrol}
              />
            ) : null}
          </>
        )}

        <BorderPatrolEditModal
          patrol={editing}
          open={Boolean(editing)}
          saving={savingEdit}
          err={editErr}
          onClose={() => {
            if (!savingEdit) {
              setEditing(null);
              setEditErr("");
            }
          }}
          onSave={saveEdit}
        />
        <BorderPatrolInfoModal
          patrol={infoPatrol}
          open={Boolean(infoPatrol)}
          onClose={() => setInfoPatrol(null)}
        />
      </div>
    </Layout>
  );
}
