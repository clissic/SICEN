import {
  WIND_FORECAST_HOUR_OPTIONS,
  WIND_SPEED_LEGEND,
} from "../../api/openMeteoWind.js";

/**
 * Leyenda inferior + selector de horizonte de pronóstico.
 * Visible solo con la capa de viento activa.
 */
export function WindLegend({
  visible,
  forecastHours = 0,
  onForecastHoursChange,
}) {
  if (!visible) return null;

  return (
    <div
      className="centinela-wind-legend"
      role="region"
      aria-label="Pronóstico y leyenda de viento"
    >
      <div
        className="centinela-wind-legend__forecast"
        role="group"
        aria-label="Horizonte de pronóstico"
      >
        {WIND_FORECAST_HOUR_OPTIONS.map((opt) => {
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
        <span className="centinela-wind-legend__title">Viento (kn)</span>
        <ul className="centinela-wind-legend__list">
          {WIND_SPEED_LEGEND.map((item) => (
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
