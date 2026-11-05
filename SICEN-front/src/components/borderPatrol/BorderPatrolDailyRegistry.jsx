import { useEffect, useMemo, useState } from "react";
import {
  PATROL_AREA_OPTIONS,
  areaLabel,
} from "../../constants/borderPatrolFulfillment.js";
import { BorderPatrolMonthNav } from "./BorderPatrolMonthNav.jsx";
import {
  WEEKDAY_HEADERS,
  formatDisplay,
  isoDate,
  monthCells,
  monthLabel,
  weekdayLong,
} from "./borderPatrolCalendarUtils.js";

function formatNum(value, decimals = 0) {
  const n = Number(value) || 0;
  return n.toLocaleString("es-UY", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  });
}

function emptyByArea() {
  return {
    total: 0,
    byArea: Object.fromEntries(PATROL_AREA_OPTIONS.map((opt) => [opt.id, 0])),
  };
}

function addByArea(bucket, area, amount) {
  const n = Number(amount) || 0;
  if (n <= 0) return;
  bucket.total += n;
  if (Object.prototype.hasOwnProperty.call(bucket.byArea, area)) {
    bucket.byArea[area] += n;
  }
}

/** Agrega métricas de patrullas cumplidas de un día. */
export function buildDailyRegistry(patrols) {
  const summary = {
    personnel: 0,
    breakdowns: 0,
    distanceNm: 0,
    distanceKm: 0,
    zones: {
      merchant: emptyByArea(),
      sports: emptyByArea(),
      fishing: emptyByArea(),
      registered: emptyByArea(),
      identified: emptyByArea(),
    },
    fulfilledCount: 0,
  };

  for (const patrol of patrols || []) {
    if (patrol?.status !== "fulfilled") continue;
    const f = patrol.fulfillment;
    if (!f) continue;
    summary.fulfilledCount += 1;
    summary.personnel += Number(f.personnel) || 0;
    summary.breakdowns += Number(f.breakdowns) || 0;
    if (patrol.kind === "fluvial") {
      summary.distanceNm += Number(f.distanceNm) || 0;
    } else if (patrol.kind === "terrestre") {
      summary.distanceKm += Number(f.distanceKm) || 0;
    }
    const area = String(patrol.area || f.area || "").toLowerCase();
    addByArea(summary.zones.merchant, area, f.controlledCraft?.merchant);
    addByArea(summary.zones.sports, area, f.controlledCraft?.sports);
    addByArea(summary.zones.fishing, area, f.controlledCraft?.fishing);
    addByArea(summary.zones.registered, area, f.registeredCraft);
    addByArea(summary.zones.identified, area, f.identifiedPersons);
  }

  return summary;
}

const ZONE_ROWS = [
  { id: "merchant", label: "Buques mercantes controlados" },
  { id: "sports", label: "Emb. deportivas controladas" },
  { id: "fishing", label: "Pesqueros controlados" },
  { id: "registered", label: "Embarcaciones registradas" },
  { id: "identified", label: "Personas identificadas" },
];

function KpiCard({ label, value, hint }) {
  return (
    <div className="empre-daily-kpi">
      <div className="empre-daily-kpi__label">{label}</div>
      <div className="empre-daily-kpi__value">{value}</div>
      {hint ? <div className="empre-daily-kpi__hint">{hint}</div> : null}
    </div>
  );
}

/**
 * Registro diario EMPRE: calendario del mes + totales del día elegido.
 */
export function BorderPatrolDailyRegistry({
  year,
  month,
  onShift,
  onJump,
  patrols,
  loading,
}) {
  const today = new Date();
  const todayIso = isoDate(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );
  const [selectedDate, setSelectedDate] = useState(() =>
    year === today.getFullYear() && month === today.getMonth() + 1
      ? todayIso
      : isoDate(year, month, 1)
  );

  useEffect(() => {
    const prefix = `${year}-${String(month).padStart(2, "0")}-`;
    setSelectedDate((prev) => {
      if (String(prev).startsWith(prefix)) return prev;
      if (year === today.getFullYear() && month === today.getMonth() + 1) {
        return todayIso;
      }
      return isoDate(year, month, 1);
    });
  }, [year, month, todayIso]);

  const cells = useMemo(() => monthCells(year, month), [year, month]);

  const byDate = useMemo(() => {
    const map = new Map();
    for (const p of patrols || []) {
      if (p?.status !== "fulfilled") continue;
      const list = map.get(p.date) || [];
      list.push(p);
      map.set(p.date, list);
    }
    return map;
  }, [patrols]);

  const dayPatrols = byDate.get(selectedDate) || [];
  const summary = useMemo(
    () => buildDailyRegistry(dayPatrols),
    [dayPatrols]
  );

  return (
    <section aria-label="Registro diario">
      <BorderPatrolMonthNav
        year={year}
        month={month}
        onShift={onShift}
        onJump={onJump}
      />

      {loading ? (
        <p className="text-muted small">Cargando registro…</p>
      ) : (
        <>
          <div className="empre-patrol-cal empre-patrol-cal--head" aria-hidden>
            {WEEKDAY_HEADERS.map((label) => (
              <div key={label} className="empre-patrol-cal__weekday">
                {label}
              </div>
            ))}
          </div>
          <div className="empre-patrol-cal empre-daily-cal">
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
              const count = list.length;
              const selected = selectedDate === iso;
              const past = iso < todayIso;
              const todayCell = iso === todayIso;
              return (
                <button
                  key={iso}
                  type="button"
                  className={`empre-patrol-day empre-daily-day${past ? " is-past" : ""}${todayCell ? " is-today" : ""}${selected ? " is-selected" : ""}${count === 0 ? " is-empty-data" : ""}`}
                  aria-pressed={selected}
                  aria-label={`${weekdayLong(iso)} ${formatDisplay(iso)}${todayCell ? ", hoy" : ""}. ${count} patrulla${count === 1 ? "" : "s"} cumplida${count === 1 ? "" : "s"}`}
                  onClick={() => setSelectedDate(iso)}
                >
                  <div className="empre-patrol-day__head">
                    <span className="empre-patrol-day__name">
                      {weekdayLong(iso)}
                    </span>
                    <span className="empre-patrol-day__date">{day}</span>
                  </div>
                  <div className="empre-daily-day__body">
                    {count > 0 ? (
                      <>
                        <span className="empre-daily-day__count">{count}</span>
                        <span className="empre-daily-day__caption">
                          cumplida{count === 1 ? "" : "s"}
                        </span>
                      </>
                    ) : (
                      <span className="empre-daily-day__caption is-muted">
                        Sin datos
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="empre-daily-detail mt-4">
            <div className="empre-daily-detail__head mb-3">
              <h4 className="h5 mb-1">
                {weekdayLong(selectedDate)} · {formatDisplay(selectedDate)}
              </h4>
              <p className="text-muted small mb-0">
                {monthLabel(year, month)} · {summary.fulfilledCount} patrulla
                {summary.fulfilledCount === 1 ? "" : "s"} cumplida
                {summary.fulfilledCount === 1 ? "" : "s"}
              </p>
            </div>

            {summary.fulfilledCount === 0 ? (
              <p className="text-muted small mb-0">
                No hay patrullas cumplidas este día. Elegí otra fecha o cargá el
                cumplimiento desde Planificación.
              </p>
            ) : (
              <>
                <div className="empre-daily-kpis mb-4">
                  <KpiCard
                    label="Personal en la misión"
                    value={formatNum(summary.personnel)}
                    hint="Suma del personal afectado"
                  />
                  <KpiCard
                    label="Averías"
                    value={formatNum(summary.breakdowns)}
                  />
                  <KpiCard
                    label="Millas náuticas patrulladas"
                    value={formatNum(summary.distanceNm, 1)}
                    hint="Patrullas fluviales"
                  />
                  <KpiCard
                    label="Kilómetros patrullados"
                    value={formatNum(summary.distanceKm, 1)}
                    hint="Patrullas terrestres"
                  />
                </div>

                <h5 className="h6 mb-2">Controles por zona</h5>
                <div className="table-responsive">
                  <table className="table table-sm table-bordered align-middle empre-daily-craft mb-0">
                    <colgroup>
                      <col className="empre-daily-craft__concept" />
                      {PATROL_AREA_OPTIONS.map((opt) => (
                        <col key={opt.id} className="empre-daily-craft__metric" />
                      ))}
                      <col className="empre-daily-craft__metric" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th scope="col">Concepto</th>
                        {PATROL_AREA_OPTIONS.map((opt) => (
                          <th
                            key={opt.id}
                            scope="col"
                            className="empre-daily-craft__num"
                          >
                            {opt.label}
                          </th>
                        ))}
                        <th scope="col" className="empre-daily-craft__num is-total">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ZONE_ROWS.map((row) => {
                        const data = summary.zones[row.id];
                        return (
                          <tr key={row.id}>
                            <th scope="row">{row.label}</th>
                            {PATROL_AREA_OPTIONS.map((opt) => (
                              <td key={opt.id} className="empre-daily-craft__num">
                                {formatNum(data.byArea[opt.id] || 0)}
                              </td>
                            ))}
                            <td className="empre-daily-craft__num is-total">
                              {formatNum(data.total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-muted small mt-2 mb-0">
                  Las zonas usan el área asignada a cada patrulla (
                  {areaLabel("rio-uruguay")}, {areaLabel("rio-de-la-plata")} y{" "}
                  {areaLabel("oceano-atlantico")}).
                </p>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
