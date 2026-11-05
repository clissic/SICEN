import {
  EMPRE_FUEL_TYPES,
  empreFuelTotalLiters,
} from "../constants/empreFuelStats.js";
import { FuelTypeStackedBar } from "./FuelTypeStackedBar.jsx";

function formatLiters(n) {
  const value = Number(n) || 0;
  return `${value.toLocaleString("es-UY")} L`;
}

/**
 * Estadísticas de combustible del Estado Mayor (EMPRE) en P3.
 */
export function EmpreFuelStats() {
  const types = EMPRE_FUEL_TYPES;
  const total = empreFuelTotalLiters(types);
  const max = Math.max(...types.map((t) => Number(t.liters) || 0), 0);
  const stackedItems = types.map((t) => ({
    key: t.key,
    label: t.label,
    value: Number(t.liters) || 0,
  }));

  return (
    <section className="empre-fuel-stats" aria-label="Combustible">
      <div className="empre-fuel-stats__head">
        <h4 className="empre-fuel-stats__title">Combustible</h4>
        <p className="empre-fuel-stats__subtitle mb-0">
          Consumo del ejercicio · {formatLiters(total)}
        </p>
      </div>

      <ul className="empre-fuel-stats__meters list-unstyled mb-3">
        {types.map((t) => {
          const liters = Number(t.liters) || 0;
          const widthPct = max > 0 ? (liters / max) * 100 : 0;
          return (
            <li key={t.key} className="empre-fuel-meter">
              <div className="empre-fuel-meter__row">
                <span className="empre-fuel-meter__label">{t.label}</span>
                <span className="empre-fuel-meter__value">
                  {formatLiters(liters)}
                </span>
              </div>
              <div
                className="empre-fuel-meter__track"
                aria-hidden="true"
              >
                <div
                  className={`empre-fuel-meter__fill empre-fuel-meter__fill--${t.key}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="empre-fuel-stats__mix-label">Por tipo</div>
      <FuelTypeStackedBar
        items={stackedItems}
        formatValue={formatLiters}
      />
      <ul className="empre-fuel-legend list-unstyled mb-0">
        {types.map((t) => (
          <li key={t.key} className="empre-fuel-legend__item">
            <span
              className={`empre-fuel-legend__swatch empre-fuel-mix__seg--${t.key}`}
              aria-hidden
            />
            <span>{t.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
