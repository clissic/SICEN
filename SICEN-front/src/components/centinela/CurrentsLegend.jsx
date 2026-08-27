import {
  CURRENT_FORECAST_HOUR_OPTIONS,
  CURRENT_SPEED_LEGEND,
} from "../../api/openMeteoCurrents.js";

/**
 * Leyenda inferior de corrientes + selector de horizonte.
 * Colores teal/verde/violeta (distintos del viento).
 */
export function CurrentsLegend({
  visible,
  forecastHours = 0,
  onForecastHoursChange,
}) {
  if (!visible) return null;

  return (
    <div
      className="centinela-wind-legend centinela-currents-legend"
      role="region"
      aria-label="Pronóstico y leyenda de corrientes"
    >
      <div
        className="centinela-wind-legend__forecast"
        role="group"
        aria-label="Horizonte de pronóstico de corrientes"
      >
        {CURRENT_FORECAST_HOUR_OPTIONS.map((opt) => {
          const active = forecastHours === opt.hours;
          return (
            <button
              key={opt.hours}
              type="button"
              className={`centinela-wind-legend__hour${
                active ? " is-active" : ""
              }`}
              aria-pressed={active}
              onClick={() => onForecastHoursChange?.(opt.hours)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="centinela-wind-legend__body">
        <span className="centinela-wind-legend__title">Corrientes (kn)</span>
        <ul className="centinela-wind-legend__list">
          {CURRENT_SPEED_LEGEND.map((item) => (
            <li key={item.className} className="centinela-wind-legend__item">
              <span
                className={`centinela-wind-legend__swatch ${item.className}`}
                aria-hidden
              />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
