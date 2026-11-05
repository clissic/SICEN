import { useEffect, useMemo, useState } from "react";
import {
  PATROL_FUEL_BAR_COLORS,
  PATROL_FUEL_GRID_OPTIONS,
  PATROL_FUEL_OPTIONS,
  fuelLabel,
} from "../../constants/borderPatrolFulfillment.js";
import { MONTH_OPTIONS, yearChoices } from "./borderPatrolCalendarUtils.js";
import { ModalPortal, SICEN_MODAL_Z_INDEX } from "../ModalPortal.jsx";

function formatLiters(value) {
  const n = Number(value) || 0;
  return `${n.toLocaleString("es-UY", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })} lts.`;
}

function formatLitersCompact(value) {
  const n = Number(value) || 0;
  return `${n.toLocaleString("es-UY", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}`;
}

function emptyMonthBucket() {
  return { total: 0, byFuel: new Map(), byUnit: new Map() };
}

function addFuel(map, fuelType, liters) {
  map.set(fuelType, (map.get(fuelType) || 0) + liters);
}

/** Agrupa litros de patrullas cumplidas: mes → unidad → tipo de combustible. */
export function buildFuelStats(patrols) {
  const months = Array.from({ length: 12 }, () => emptyMonthBucket());
  const yearByFuel = new Map();
  let yearTotal = 0;

  for (const patrol of patrols || []) {
    if (patrol?.status !== "fulfilled") continue;
    const liters = Number(patrol?.fulfillment?.fuel?.liters) || 0;
    if (liters <= 0) continue;
    const fuelType = String(patrol?.fulfillment?.fuel?.type || "").trim();
    if (!fuelType) continue;
    const month = Number(String(patrol.date || "").slice(5, 7));
    if (!Number.isInteger(month) || month < 1 || month > 12) continue;
    const unit = String(patrol.unitAcronym || "").trim().toUpperCase();
    if (!unit) continue;

    const bucket = months[month - 1];
    bucket.total += liters;
    yearTotal += liters;
    addFuel(bucket.byFuel, fuelType, liters);
    addFuel(yearByFuel, fuelType, liters);

    let unitBucket = bucket.byUnit.get(unit);
    if (!unitBucket) {
      unitBucket = { total: 0, byFuel: new Map() };
      bucket.byUnit.set(unit, unitBucket);
    }
    unitBucket.total += liters;
    addFuel(unitBucket.byFuel, fuelType, liters);
  }

  return { yearTotal, yearByFuel, months };
}

/** Grilla 2×2 de totales por tipo (Super 95, Premium, 50S, 10S). */
function FuelTypeGrid({ byFuel, compact = false }) {
  return (
    <div
      className={`empre-fuel-type-grid${compact ? " empre-fuel-type-grid--compact" : ""}`}
      aria-label="Totales por tipo de combustible"
    >
      {PATROL_FUEL_GRID_OPTIONS.map((opt) => {
        const liters = byFuel?.get?.(opt.id) || 0;
        return (
          <div
            key={opt.id}
            className={`empre-fuel-type-cell${liters === 0 ? " is-zero" : ""}`}
            style={{ "--empre-fuel-dot": PATROL_FUEL_BAR_COLORS[opt.id] }}
            title={`${opt.label}: ${formatLiters(liters)}`}
          >
            <span className="empre-fuel-type-cell__name">
              {compact ? opt.shortLabel : opt.label}
            </span>
            <span className="empre-fuel-type-cell__value">
              {compact ? formatLitersCompact(liters) : formatLiters(liters)}
              {compact ? <span className="empre-fuel-type-cell__unit"> lts.</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function YearJumpModal({ open, year, onClose, onApply }) {
  const [draftYear, setDraftYear] = useState(year);

  useEffect(() => {
    if (!open) return;
    setDraftYear(year);
  }, [open, year]);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <ModalPortal>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="border-patrol-stats-year-title"
        style={{ background: "rgba(0,0,0,0.45)", zIndex: SICEN_MODAL_Z_INDEX }}
        onClick={onClose}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(event) => event.stopPropagation()}
        >
          <form
            className="modal-content"
            onSubmit={(event) => {
              event.preventDefault();
              onApply(Number(draftYear));
            }}
          >
            <div className="modal-header">
              <h5 className="modal-title" id="border-patrol-stats-year-title">
                Elegir año
              </h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={onClose}
              />
            </div>
            <div className="modal-body">
              <label className="form-label" htmlFor="border-patrol-stats-year">
                Año
              </label>
              <select
                id="border-patrol-stats-year"
                className="form-select"
                value={draftYear}
                onChange={(event) => setDraftYear(Number(event.target.value))}
              >
                {yearChoices(draftYear).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-footer empre-patrol-month-actions">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => onApply(new Date().getFullYear())}
              >
                Hoy
              </button>
              <button type="submit" className="btn btn-primary">
                Ir
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

function FuelBars({ byFuel, maxLiters }) {
  const rows = PATROL_FUEL_OPTIONS.map((opt) => ({
    id: opt.id,
    label: opt.label,
    liters: byFuel.get(opt.id) || 0,
    color: PATROL_FUEL_BAR_COLORS[opt.id] || "#6c757d",
  })).filter((row) => row.liters > 0);

  const extras = [...byFuel.entries()]
    .filter(([id]) => !PATROL_FUEL_OPTIONS.some((opt) => opt.id === id))
    .map(([id, liters]) => ({
      id,
      label: fuelLabel(id),
      liters,
      color: "#6c757d",
    }));

  const all = [...rows, ...extras];
  if (all.length === 0) {
    return <p className="text-muted small mb-0">Sin consumo registrado.</p>;
  }

  const scale = Math.max(maxLiters, 1);

  return (
    <ul className="empre-fuel-bars list-unstyled mb-0">
      {all.map((row) => (
        <li key={row.id} className="empre-fuel-bar">
          <div className="empre-fuel-bar__meta">
            <span className="empre-fuel-bar__label">{row.label}</span>
            <span className="empre-fuel-bar__value">{formatLiters(row.liters)}</span>
          </div>
          <div
            className="empre-fuel-bar__track"
            role="presentation"
            aria-hidden
          >
            <div
              className="empre-fuel-bar__fill"
              style={{
                width: `${Math.max(2, (row.liters / scale) * 100)}%`,
                background: row.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function MonthFuelMix({ byFuel }) {
  const total = [...(byFuel?.values?.() || [])].reduce((sum, n) => sum + n, 0);
  if (total <= 0) return null;

  return (
    <div className="empre-fuel-mix" aria-label="Composición del mes">
      {PATROL_FUEL_OPTIONS.map((opt) => {
        const liters = byFuel.get(opt.id) || 0;
        if (liters <= 0) return null;
        const pct = (liters / total) * 100;
        return (
          <span
            key={opt.id}
            className="empre-fuel-mix__seg"
            style={{
              width: `${pct}%`,
              background: PATROL_FUEL_BAR_COLORS[opt.id] || "#6c757d",
            }}
            data-sicen-popover={`${opt.label}: ${formatLiters(liters)}`}
          />
        );
      })}
    </div>
  );
}

/**
 * Estadísticas de combustible EMPRE: año → mes → unidad → tipo.
 */
export function BorderPatrolFuelStats({
  year,
  onYearChange,
  patrols,
  loading,
  unitNames,
}) {
  const [jumpOpen, setJumpOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [unitTab, setUnitTab] = useState("");

  const stats = useMemo(() => buildFuelStats(patrols), [patrols]);

  useEffect(() => {
    setSelectedMonth(null);
    setUnitTab("");
  }, [year]);

  const monthDetail = selectedMonth ? stats.months[selectedMonth - 1] : null;
  const units = useMemo(() => {
    if (!monthDetail) return [];
    return [...monthDetail.byUnit.keys()].sort((a, b) => a.localeCompare(b));
  }, [monthDetail]);

  useEffect(() => {
    if (!units.length) {
      setUnitTab("");
      return;
    }
    if (!units.includes(unitTab)) setUnitTab(units[0]);
  }, [units, unitTab]);

  const activeUnit = unitTab ? monthDetail?.byUnit.get(unitTab) : null;
  const maxFuelInUnit = activeUnit
    ? Math.max(0, ...activeUnit.byFuel.values())
    : 0;

  return (
    <section aria-label="Estadísticas de combustible">
      <div className="empre-patrol-month-nav d-flex align-items-center justify-content-between gap-2 mb-3 flex-wrap">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          aria-label="Año anterior"
          onClick={() => onYearChange(year - 1)}
        >
          <i className="bi bi-chevron-left" aria-hidden />
        </button>
        <button
          type="button"
          className="btn btn-link text-decoration-none fw-semibold px-2 empre-fuel-year-btn"
          onClick={() => setJumpOpen(true)}
        >
          {year}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          aria-label="Año siguiente"
          onClick={() => onYearChange(year + 1)}
        >
          <i className="bi bi-chevron-right" aria-hidden />
        </button>
      </div>

      <YearJumpModal
        open={jumpOpen}
        year={year}
        onClose={() => setJumpOpen(false)}
        onApply={(next) => {
          setJumpOpen(false);
          onYearChange(next);
        }}
      />

      {loading ? (
        <p className="text-muted small">Cargando estadísticas…</p>
      ) : (
        <>
          <div className="empre-fuel-year-total mb-3">
            <div className="empre-fuel-year-total__top">
              <div>
                <div className="empre-fuel-year-total__label">
                  Consumo del año
                </div>
                <div className="empre-fuel-year-total__value">
                  <span className="empre-fuel-total-prefix">Total:</span>{" "}
                  {formatLiters(stats.yearTotal)}
                </div>
              </div>
              {(stats.yearByFuel.get("jet-a1") || 0) > 0 ? (
                <div className="empre-fuel-year-total__jet small text-muted">
                  Jet A-1: {formatLiters(stats.yearByFuel.get("jet-a1"))}
                </div>
              ) : null}
            </div>
            <FuelTypeGrid byFuel={stats.yearByFuel} />
            <p className="text-muted small mb-0 mt-2">
              Solo patrullas cumplidas. Elegí un mes para ver el detalle por
              unidad y tipo de combustible.
            </p>
          </div>

          <div className="empre-fuel-months" role="list">
            {MONTH_OPTIONS.map((label, index) => {
              const month = index + 1;
              const bucket = stats.months[index];
              const total = bucket.total;
              const selected = selectedMonth === month;
              return (
                <button
                  key={label}
                  type="button"
                  role="listitem"
                  className={`empre-fuel-month${selected ? " is-selected" : ""}${total === 0 ? " is-zero" : ""}`}
                  aria-pressed={selected}
                  onClick={() =>
                    setSelectedMonth((prev) => (prev === month ? null : month))
                  }
                >
                  <span className="empre-fuel-month__name">{label}</span>
                  <span className="empre-fuel-month__total">
                    <span className="empre-fuel-total-prefix">Total:</span>{" "}
                    {total > 0 ? formatLiters(total) : "—"}
                  </span>
                  <FuelTypeGrid byFuel={bucket.byFuel} compact />
                </button>
              );
            })}
          </div>

          {selectedMonth && monthDetail ? (
            <div className="empre-fuel-detail mt-4">
              <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-2">
                <div>
                  <h4 className="h5 mb-1">
                    {MONTH_OPTIONS[selectedMonth - 1]} {year}
                  </h4>
                  <div className="empre-fuel-detail__total">
                    Total del mes:{" "}
                    <strong>{formatLiters(monthDetail.total)}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setSelectedMonth(null)}
                >
                  Cerrar mes
                </button>
              </div>

              <FuelTypeGrid byFuel={monthDetail.byFuel} />
              <div className="mt-2">
                <MonthFuelMix byFuel={monthDetail.byFuel} />
              </div>

              {units.length === 0 ? (
                <p className="text-muted small mt-3 mb-0">
                  No hay consumo cargado en este mes.
                </p>
              ) : (
                <>
                  <ul className="nav nav-tabs mt-3 mb-3" role="tablist">
                    {units.map((acronym) => {
                      const unitTotal = monthDetail.byUnit.get(acronym)?.total || 0;
                      const name = unitNames?.get?.(acronym)?.name;
                      return (
                        <li className="nav-item" key={acronym} role="presentation">
                          <button
                            type="button"
                            className={`nav-link${unitTab === acronym ? " active" : ""}`}
                            role="tab"
                            aria-selected={unitTab === acronym}
                            onClick={() => setUnitTab(acronym)}
                          >
                            <span className="fw-semibold">{acronym}</span>
                            <span className="empre-fuel-unit-tab__liters">
                              {formatLiters(unitTotal)}
                            </span>
                            {name ? (
                              <span className="visually-hidden"> · {name}</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  {activeUnit ? (
                    <div>
                      <div className="empre-fuel-unit-head mb-3">
                        <div className="text-muted small">Unidad</div>
                        <div className="fw-semibold">
                          {unitTab}
                          {unitNames?.get?.(unitTab)?.name
                            ? ` · ${unitNames.get(unitTab).name}`
                            : ""}
                        </div>
                        <div className="small mt-1">
                          Subtotal:{" "}
                          <strong>{formatLiters(activeUnit.total)}</strong>
                        </div>
                      </div>
                      <FuelBars
                        byFuel={activeUnit.byFuel}
                        maxLiters={maxFuelInUnit}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
