import { WIND_FORECAST_HOUR_OPTIONS } from "../../api/openMeteoWind.js";

/**
 * Selector único de horizonte de pronóstico para viento, corrientes y olas.
 */
export function CentinelaEnvForecastSelector({
  forecastHours = 0,
  onForecastHoursChange,
}) {
  return (
    <div
      className="centinela-env-legends-panel__forecast"
      role="group"
      aria-label="Horizonte de pronóstico ambiental"
    >
      <div className="centinela-wind-legend__forecast">
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
    </div>
  );
}
