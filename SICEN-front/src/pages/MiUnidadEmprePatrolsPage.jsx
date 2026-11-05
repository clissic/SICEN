import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";
import { ErrorAlert } from "../components/ErrorAlert.jsx";
import { BorderPatrolEditModal } from "../components/borderPatrol/BorderPatrolEditModal.jsx";
import { BorderPatrolDailyRegistry } from "../components/borderPatrol/BorderPatrolDailyRegistry.jsx";
import { BorderPatrolFuelStats } from "../components/borderPatrol/BorderPatrolFuelStats.jsx";
import { BorderPatrolInfoModal } from "../components/borderPatrol/BorderPatrolInfoModal.jsx";
import { BorderPatrolMonthNav } from "../components/borderPatrol/BorderPatrolMonthNav.jsx";
import {
  WEEKDAY_HEADERS,
  daysInMonth,
  formatDisplay,
  isoDate,
  monthCells,
  shiftMonth,
  weekdayLong,
} from "../components/borderPatrol/borderPatrolCalendarUtils.js";
import { UserUnitSelect } from "../components/UserUnitSelect.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { statusLabel } from "../constants/borderPatrolFulfillment.js";
import {
  EMPRE_BORDER_SLUG,
  EMPRE_P3_SLUG,
  EMPRE_PATROLS_SLUG,
  getMiUnidadEmpreNestedMenu,
  isEmpreUnit,
} from "../constants/miUnidadEmpreDivisiones.js";
import {
  createBorderPatrol,
  deleteBorderPatrol,
  listBorderPatrols,
  listBorderPatrolTypes,
  listUnitsRegistered,
  updateBorderPatrolStatus,
} from "../api/client.js";
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

const KIND_ORDER = { fluvial: 0, terrestre: 1 };

function escapePopoverHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function patrolHintField(label, value) {
  return `<div class="empre-patrol-hint-field"><span class="empre-patrol-hint-k">${escapePopoverHtml(label)}</span><strong>${escapePopoverHtml(value)}</strong></div>`;
}

function patrolHintHtml({ unitName, patrolLabel, detail }) {
  return `<div class="empre-patrol-hint">${patrolHintField("Unidad:", unitName)}${patrolHintField("Patrulla:", patrolLabel)}${patrolHintField("Detalle:", detail)}</div>`;
}

function fulfilledByCommand(list, unitsByAcronym, command) {
  return list.filter((patrol) => {
    if (patrol.status !== "fulfilled") return false;
    const acronym = String(patrol.unitAcronym || "").trim().toUpperCase();
    return unitsByAcronym.get(acronym)?.highCommand === command;
  }).length;
}

function DayPatrolDetail({ iso, patrols, deletingId, onEdit, onDelete, onInfo }) {
  const units = useMemo(() => {
    return [...new Set(patrols.map((p) => p.unitAcronym))].sort((a, b) =>
      a.localeCompare(b, "es")
    );
  }, [patrols]);
  const [unitTab, setUnitTab] = useState(units[0] || "");
  const [kindTab, setKindTab] = useState("fluvial");

  useEffect(() => {
    if (!units.includes(unitTab)) setUnitTab(units[0] || "");
  }, [units, unitTab]);

  const visible = patrols
    .filter((p) => p.unitAcronym === unitTab && p.kind === kindTab)
    .sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));

  return (
    <section className="mt-4" aria-label="Patrullas del día">
      <h4 className="h6 mb-3">
        {weekdayLong(iso)} {formatDisplay(iso)}
      </h4>
      {units.length === 0 ? (
        <p className="text-muted small mb-0">No hay patrullas este día.</p>
      ) : (
        <>
          <ul className="nav nav-tabs mb-3" role="tablist">
            {units.map((acronym) => (
              <li key={acronym} className="nav-item" role="presentation">
                <button
                  type="button"
                  className={`nav-link${unitTab === acronym ? " active" : ""}`}
                  role="tab"
                  aria-selected={unitTab === acronym}
                  onClick={() => setUnitTab(acronym)}
                >
                  {acronym}
                </button>
              </li>
            ))}
          </ul>
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
                      <td className="text-break">{patrol.detail || "Sin detalle"}</td>
                      <td className="text-nowrap">
                        <span className={`empre-patrol-state empre-patrol-state--${patrol.status}`}>
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
                          disabled={deletingId === patrol._id}
                        >
                          <i className="bi bi-info-circle" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-body p-1 me-1"
                          data-sicen-popover="Modificar"
                          aria-label="Modificar"
                          onClick={() => onEdit(patrol)}
                          disabled={deletingId === patrol._id}
                        >
                          <i className="bi bi-pencil-square" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-danger p-1"
                          data-sicen-popover="Eliminar"
                          aria-label="Eliminar"
                          onClick={() => onDelete(patrol)}
                          disabled={deletingId === patrol._id}
                        >
                          {deletingId === patrol._id ? (
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
          )}
        </>
      )}
    </section>
  );
}

function PatrolGridScroll({ children, watch }) {
  const ref = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const left = el.scrollLeft > 4;
    const right = max > 4 && el.scrollLeft < max - 4;
    setEdges((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right }
    );
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update, watch]);

  return (
    <div className="empre-patrol-grid-wrap">
      <div ref={ref} className="empre-patrol-grid-scroll">
        {children}
      </div>
      {edges.left ? (
        <div className="empre-patrol-grid-fade empre-patrol-grid-fade--left" />
      ) : null}
      {edges.right ? (
        <div className="empre-patrol-grid-fade empre-patrol-grid-fade--right" />
      ) : null}
    </div>
  );
}

function PatrolsScreen({ resolved }) {
  const { division, item, menu } = resolved;
  const today = new Date();
  const todayIso = isoDate(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [statsYear, setStatsYear] = useState(today.getFullYear());
  const [dailyYear, setDailyYear] = useState(today.getFullYear());
  const [dailyMonth, setDailyMonth] = useState(today.getMonth() + 1);
  const [tab, setTab] = useState("plan");
  const [statsSubTab, setStatsSubTab] = useState("combustibles");
  const [patrols, setPatrols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsPatrols, setStatsPatrols] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [dailyPatrols, setDailyPatrols] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [err, setErr] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [editing, setEditing] = useState(null);
  const [infoPatrol, setInfoPatrol] = useState(null);
  const [editErr, setEditErr] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [unit, setUnit] = useState("");
  const [date, setDate] = useState(isoDate(today.getFullYear(), today.getMonth() + 1, today.getDate()));
  const [kind, setKind] = useState("");
  const [typeId, setTypeId] = useState("");
  const [types, setTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [unitNames, setUnitNames] = useState(() => new Map());

  const load = useCallback(async () => {
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
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (tab !== "stats" || statsSubTab !== "combustibles") return undefined;
    let cancelled = false;
    setStatsLoading(true);
    setErr("");
    listBorderPatrols({ year: statsYear })
      .then((data) => {
        if (cancelled) return;
        setStatsPatrols(Array.isArray(data?.patrols) ? data.patrols : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setStatsPatrols([]);
        setErr(e?.message || "No se pudieron cargar las estadísticas.");
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, statsSubTab, statsYear]);

  useEffect(() => {
    if (tab !== "stats" || statsSubTab !== "diario") return undefined;
    let cancelled = false;
    setDailyLoading(true);
    setErr("");
    listBorderPatrols({ year: dailyYear, month: dailyMonth })
      .then((data) => {
        if (cancelled) return;
        setDailyPatrols(Array.isArray(data?.patrols) ? data.patrols : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setDailyPatrols([]);
        setErr(e?.message || "No se pudo cargar el registro diario.");
      })
      .finally(() => {
        if (!cancelled) setDailyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, statsSubTab, dailyYear, dailyMonth]);

  useEffect(() => {
    let cancelled = false;
    listUnitsRegistered()
      .then((data) => {
        if (cancelled) return;
        const map = new Map();
        for (const u of data?.units ?? []) {
          const acronym = String(u?.acronym || "").trim().toUpperCase();
          if (!acronym) continue;
          map.set(acronym, {
            name: String(u?.name || "").trim(),
            highCommand: String(u?.highCommand || "").trim().toUpperCase(),
          });
        }
        setUnitNames(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!unit) {
      setTypes([]);
      setTypeId("");
      setTypesLoading(false);
      return undefined;
    }
    let cancelled = false;
    setTypesLoading(true);
    setTypeId("");
    listBorderPatrolTypes(unit)
      .then((data) => {
        if (!cancelled) {
          setTypes(Array.isArray(data?.types) ? data.types : []);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setTypes([]);
          setFormErr(e?.message || "No se pudieron cargar las patrullas de la unidad.");
        }
      })
      .finally(() => {
        if (!cancelled) setTypesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [unit]);

  const byDate = useMemo(() => {
    const map = new Map();
    for (const p of patrols) {
      const list = map.get(p.date) || [];
      list.push(p);
      map.set(p.date, list);
    }
    return map;
  }, [patrols]);

  const columns = useMemo(() => {
    const map = new Map();
    for (const p of patrols) {
      const id = p.typeId
        ? String(p.typeId)
        : `${p.kind}|${p.number ?? ""}`;
      const key = `${p.unitAcronym}|${id}`;
      if (!map.has(key)) {
        const acronym = String(p.unitAcronym || "").trim().toUpperCase();
        map.set(key, {
          key,
          unit: p.unitAcronym,
          unitName: unitNames.get(acronym)?.name || p.unitAcronym,
          number: p.number,
          kind: p.kind,
          detail: p.detail || "",
        });
      }
    }
    return [...map.values()].sort((a, b) => {
      const byUnit = a.unit.localeCompare(b.unit, "es");
      if (byUnit) return byUnit;
      const byKind = (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9);
      if (byKind) return byKind;
      return (Number(a.number) || 0) - (Number(b.number) || 0);
    });
  }, [patrols, unitNames]);

  const unitSpans = useMemo(() => {
    const spans = [];
    for (const col of columns) {
      const last = spans[spans.length - 1];
      if (last && last.unit === col.unit) last.count += 1;
      else spans.push({ unit: col.unit, count: 1 });
    }
    return spans;
  }, [columns]);

  const assignedKey = useMemo(() => {
    const set = new Set();
    for (const p of patrols) {
      const id = p.typeId
        ? String(p.typeId)
        : `${p.kind}|${p.number ?? ""}`;
      set.add(`${p.unitAcronym}|${id}|${p.date}`);
    }
    return set;
  }, [patrols]);

  const visibleTypes = useMemo(() => {
    const list = kind ? types.filter((t) => t.kind === kind) : types;
    return [...list].sort((a, b) => {
      const byNumber = a.number - b.number;
      if (byNumber) return byNumber;
      return (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9);
    });
  }, [types, kind]);

  const typePlaceholder = !unit
    ? "Elegí la unidad"
    : !kind
      ? "Elegí el tipo"
      : typesLoading
        ? "Cargando patrullas…"
        : types.length === 0
          ? "Esta unidad todavía no cargó patrullas"
          : visibleTypes.length === 0
            ? "No hay patrullas de ese tipo"
            : "Elegí la patrulla…";

  useEffect(() => {
    if (!typeId) return;
    if (!visibleTypes.some((t) => t._id === typeId)) setTypeId("");
  }, [visibleTypes, typeId]);

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

  function openEdit(patrol) {
    setEditing(patrol);
    setEditErr("");
  }

  const closeEdit = useCallback(() => {
    setEditing(null);
    setEditErr("");
  }, []);

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

  async function removePatrol(patrol) {
    if (!patrol?._id) return;
    const result = await confirmDelete({
      resource: "patrulla",
      summaryHtml: `
        <p class="mb-2">Se eliminará la asignación de este día:</p>
        <ul class="mb-2 ps-3">
          <li>Unidad: <strong>${escapeHtml(patrol.unitAcronym)}</strong></li>
          <li>Nro.: <strong>${escapeHtml(patrol.number)}</strong></li>
          <li>Detalle: ${escapeHtml(patrol.detail || "Sin detalle")}</li>
          <li>Fecha: ${escapeHtml(formatDisplay(patrol.date))}</li>
        </ul>
      `,
    });
    if (!result.isConfirmed) return;
    setDeletingId(patrol._id);
    try {
      const data = await deleteBorderPatrol(patrol._id);
      setPatrols((prev) => prev.filter((p) => p._id !== patrol._id));
      setEditing((current) => (current?._id === patrol._id ? null : current));
      await notifyDeleteSuccess(data?.msg);
    } catch (e) {
      await notifyDeleteError(e, "No se pudo eliminar la patrulla.");
    } finally {
      setDeletingId("");
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormErr("");
    setOkMsg("");
    if (!unit) {
      setFormErr("Elegí una unidad.");
      return;
    }
    if (!date) {
      setFormErr("Elegí una fecha.");
      return;
    }
    if (kind !== "fluvial" && kind !== "terrestre") {
      setFormErr("Elegí si es terrestre o fluvial.");
      return;
    }
    if (!typeId) {
      setFormErr(
        types.length === 0
          ? "Esta unidad todavía no cargó patrullas."
          : "Elegí la patrulla."
      );
      return;
    }
    setSaving(true);
    try {
      await createBorderPatrol({ unitAcronym: unit, date, kind, typeId });
      setOkMsg("Patrulla planificada.");
      setKind("");
      setTypeId("");
      const [y, m] = date.split("-").map(Number);
      if (y !== year || m !== month) {
        setYear(y);
        setMonth(m);
      } else {
        await load();
      }
    } catch (ex) {
      setFormErr(ex?.message || "No se pudo asignar la patrulla.");
    } finally {
      setSaving(false);
    }
  }

  const cells = monthCells(year, month);
  const dayCount = daysInMonth(year, month);

  return (
    <Layout>
      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <p className="text-muted small text-uppercase mb-1">
              {division.title} · {item.title}
            </p>
            <h3 className="m-0">{menu.title}</h3>
            <p className="text-muted small mb-0 mt-1">{menu.subtitle}</p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Link
              className="btn btn-outline-secondary btn-sm"
              to={`/mi-unidad/${division.slug}/${item.slug}`}
            >
              {item.title}
            </Link>
            <Link className="btn btn-outline-secondary btn-sm" to="/mi-unidad">
              Mi Unidad
            </Link>
          </div>
        </div>

        <ul className="nav nav-tabs mb-3" role="tablist">
          <li className="nav-item" role="presentation">
            <button
              type="button"
              className={`nav-link${tab === "plan" ? " active" : ""}`}
              onClick={() => setTab("plan")}
              role="tab"
              aria-selected={tab === "plan"}
            >
              Planificación
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              type="button"
              className={`nav-link${tab === "add" ? " active" : ""}`}
              onClick={() => setTab("add")}
              role="tab"
              aria-selected={tab === "add"}
            >
              Agregar patrulla
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              type="button"
              className={`nav-link${tab === "stats" ? " active" : ""}`}
              onClick={() => setTab("stats")}
              role="tab"
              aria-selected={tab === "stats"}
            >
              Estadísticas
            </button>
          </li>
        </ul>

        <ErrorAlert message={err} className="alert alert-danger py-2 small" />

        {tab === "plan" ? (
          <section aria-label="Planificación del mes">
            <BorderPatrolMonthNav year={year} month={month} onShift={goMonth} onJump={jumpMonth} />
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
                    const fluvialCount = list.filter((p) => p.kind === "fluvial").length;
                    const terrestreCount = list.filter((p) => p.kind === "terrestre").length;
                    const prenaFulfilled = fulfilledByCommand(list, unitNames, "PRENA");
                    const comfloFulfilled = fulfilledByCommand(list, unitNames, "COMFLO");
                    const selected = selectedDate === iso;
                    const past = iso < todayIso;
                    const todayCell = iso === todayIso;
                    return (
                      <button
                        key={iso}
                        type="button"
                        className={`empre-patrol-day${past ? " is-past" : ""}${todayCell ? " is-today" : ""}${selected ? " is-selected" : ""}`}
                        aria-pressed={selected}
                        aria-label={`${weekdayLong(iso)} ${formatDisplay(iso)}${todayCell ? ", hoy" : ""}${past ? ", ya transcurrido" : ""}. Cumplidas PRENA: ${prenaFulfilled}. Cumplidas COMFLO: ${comfloFulfilled}`}
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
                              <span className="empre-patrol-count__n">{fluvialCount}</span>
                              <span className="empre-patrol-count__label">Fluvial</span>
                            </span>
                            <span
                              className={`empre-patrol-count empre-patrol-count--terrestre${terrestreCount === 0 ? " is-zero" : ""}`}
                            >
                              <span className="empre-patrol-count__n">{terrestreCount}</span>
                              <span className="empre-patrol-count__label">Terrestre</span>
                            </span>
                          </div>
                        </div>
                        <div className="empre-patrol-block">
                          <div className="empre-patrol-block__title">Cumplidas:</div>
                          <div className="empre-patrol-day__counts">
                            <span
                              className={`empre-patrol-count empre-patrol-count--cmd-prena${prenaFulfilled === 0 ? " is-zero" : ""}`}
                            >
                              <span className="empre-patrol-count__n">{prenaFulfilled}</span>
                              <span className="empre-patrol-count__label">PRENA</span>
                            </span>
                            <span
                              className={`empre-patrol-count empre-patrol-count--cmd-comflo${comfloFulfilled === 0 ? " is-zero" : ""}`}
                            >
                              <span className="empre-patrol-count__n">{comfloFulfilled}</span>
                              <span className="empre-patrol-count__label">COMFLO</span>
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedDate ? (
                  <DayPatrolDetail
                    key={selectedDate}
                    iso={selectedDate}
                    patrols={byDate.get(selectedDate) || []}
                    deletingId={deletingId}
                    onEdit={openEdit}
                    onDelete={removePatrol}
                    onInfo={setInfoPatrol}
                  />
                ) : null}
              </>
            )}
          </section>
        ) : tab === "stats" ? (
          <section aria-label="Estadísticas">
            <ul className="nav nav-tabs mb-3" role="tablist">
              {[
                { id: "combustibles", label: "Combustibles" },
                { id: "diario", label: "Registro diario" },
                { id: "semanal", label: "Registro semanal" },
                { id: "mensual", label: "Registro mensual" },
              ].map((item) => (
                <li className="nav-item" key={item.id} role="presentation">
                  <button
                    type="button"
                    className={`nav-link${statsSubTab === item.id ? " active" : ""}`}
                    onClick={() => setStatsSubTab(item.id)}
                    role="tab"
                    aria-selected={statsSubTab === item.id}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>

            {statsSubTab === "combustibles" ? (
              <BorderPatrolFuelStats
                year={statsYear}
                onYearChange={setStatsYear}
                patrols={statsPatrols}
                loading={statsLoading}
                unitNames={unitNames}
              />
            ) : statsSubTab === "diario" ? (
              <BorderPatrolDailyRegistry
                year={dailyYear}
                month={dailyMonth}
                onShift={(delta) => {
                  const next = shiftMonth(dailyYear, dailyMonth, delta);
                  setDailyYear(next.year);
                  setDailyMonth(next.month);
                }}
                onJump={(nextYear, nextMonth) => {
                  setDailyYear(nextYear);
                  setDailyMonth(nextMonth);
                }}
                patrols={dailyPatrols}
                loading={dailyLoading}
              />
            ) : (
              <p className="text-muted mb-0">Contenido en preparación.</p>
            )}
          </section>
        ) : (
          <section aria-label="Agregar patrulla">
            <form className="row g-3 mb-4" onSubmit={handleCreate}>
              <div className="col-12 col-md-6 col-xl-3">
                <label className="form-label" htmlFor="patrol-unit">
                  Unidad
                </label>
                <UserUnitSelect
                  id="patrol-unit"
                  value={unit}
                  onChange={(next) => {
                    setUnit(next);
                    if (!next) setKind("");
                  }}
                  required
                  emptyOptionLabel="Elegí una unidad…"
                />
              </div>
              <div className="col-12 col-md-6 col-xl-3">
                <label className="form-label" htmlFor="patrol-kind">
                  Tipo
                </label>
                <select
                  id="patrol-kind"
                  className="form-select"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  disabled={!unit}
                  required
                >
                  <option value="">
                    {unit ? "Elegí el tipo…" : "Elegí la unidad"}
                  </option>
                  <option value="terrestre">Terrestre</option>
                  <option value="fluvial">Fluvial</option>
                </select>
              </div>
              <div className="col-12 col-md-6 col-xl-3">
                <label className="form-label" htmlFor="patrol-type">
                  Patrulla
                </label>
                <select
                  id="patrol-type"
                  className="form-select"
                  value={visibleTypes.some((t) => t._id === typeId) ? typeId : ""}
                  onChange={(e) => setTypeId(e.target.value)}
                  disabled={
                    !unit || !kind || typesLoading || visibleTypes.length === 0
                  }
                >
                  <option value="">{typePlaceholder}</option>
                  {visibleTypes.map((t) => (
                    <option key={t._id} value={t._id}>
                      {`${t.number} - ${t.detail}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-6 col-xl-3">
                <label className="form-label" htmlFor="patrol-date">
                  Fecha
                </label>
                <input
                  id="patrol-date"
                  type="date"
                  className="form-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={!typeId}
                  required
                />
              </div>
              <div className="col-12">
                <ErrorAlert
                  message={formErr}
                  className="alert alert-danger py-2 small"
                />
                {okMsg ? (
                  <div className="alert alert-success py-2 small" role="status">
                    {okMsg}
                  </div>
                ) : null}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || !unit || !kind || !typeId || !date}
                >
                  {saving ? "Guardando…" : "Asignar patrulla"}
                </button>
              </div>
            </form>

            <BorderPatrolMonthNav year={year} month={month} onShift={goMonth} onJump={jumpMonth} />
            {unitSpans.length === 0 && !loading ? (
              <p className="text-muted small">
                No hay patrullas en este mes.
              </p>
            ) : null}
            <PatrolGridScroll watch={`${year}-${month}-${columns.length}-${loading}`}>
              <table className="table table-sm table-bordered align-middle empre-patrol-grid mb-0">
                <thead>
                  <tr>
                    <th
                      className="empre-patrol-daycol"
                      rowSpan={unitSpans.length ? 2 : 1}
                    >
                      Día
                    </th>
                    <th
                      className="empre-patrol-datecol"
                      rowSpan={unitSpans.length ? 2 : 1}
                    >
                      Fecha
                    </th>
                    {unitSpans.map((span) => (
                      <th
                        key={span.unit}
                        colSpan={span.count}
                        className="text-center"
                      >
                        {span.unit}
                      </th>
                    ))}
                  </tr>
                  {unitSpans.length > 0 ? (
                    <tr>
                      {columns.map((col) => {
                        const letter =
                          col.kind === "fluvial"
                            ? "F"
                            : col.kind === "terrestre"
                              ? "T"
                              : "";
                        const code = col.number
                          ? `${col.number}${letter}`
                          : KIND_NAME[col.kind] || col.kind;
                        const kindName = KIND_NAME[col.kind] || col.kind;
                        const patrolLabel = col.number
                          ? `#${col.number} ${kindName}`
                          : kindName;
                        const hint = patrolHintHtml({
                          unitName: col.unitName || col.unit,
                          patrolLabel,
                          detail: col.detail || "Sin detalle",
                        });
                        return (
                          <th
                            key={col.key}
                            className="text-center empre-patrol-col"
                            data-sicen-popover={hint}
                            data-sicen-popover-html="true"
                            data-sicen-popover-placement="bottom"
                          >
                            {code}
                          </th>
                        );
                      })}
                    </tr>
                  ) : null}
                </thead>
                <tbody>
                  {Array.from({ length: dayCount }, (_, i) => {
                    const day = i + 1;
                    const iso = isoDate(year, month, day);
                    return (
                      <tr key={iso}>
                        <td className="empre-patrol-daycol">{weekdayLong(iso)}</td>
                        <td className="empre-patrol-datecol text-nowrap">
                          {formatDisplay(iso)}
                        </td>
                        {columns.map((col) => (
                          <td
                            key={`${iso}-${col.key}`}
                            className="text-center empre-patrol-col"
                          >
                            {assignedKey.has(`${col.key}|${iso}`) ? "1" : ""}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </PatrolGridScroll>
          </section>
        )}
        <BorderPatrolEditModal
          patrol={editing}
          open={Boolean(editing)}
          saving={savingEdit}
          err={editErr}
          onClose={() => {
            if (!savingEdit) closeEdit();
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

export function MiUnidadEmpreBorderMenuPage() {
  const { user } = useAuth();
  const { menuSlug } = useParams();
  const resolved = getMiUnidadEmpreNestedMenu(
    EMPRE_P3_SLUG,
    EMPRE_BORDER_SLUG,
    menuSlug
  );

  if (!isEmpreUnit(user?.unit)) {
    return <Navigate to="/mi-unidad" replace />;
  }
  if (!resolved) {
    return (
      <Navigate
        to={`/mi-unidad/${EMPRE_P3_SLUG}/${EMPRE_BORDER_SLUG}`}
        replace
      />
    );
  }
  if (menuSlug !== EMPRE_PATROLS_SLUG) {
    return (
      <Navigate
        to={`/mi-unidad/${EMPRE_P3_SLUG}/${EMPRE_BORDER_SLUG}`}
        replace
      />
    );
  }
  return <PatrolsScreen resolved={resolved} />;
}
