import {
  WAVE_FORECAST_HOUR_OPTIONS,
  WAVE_HEIGHT_LEGEND,
} from "../../api/openMeteoWaves.js";

/**
 * Leyenda de oleaje: horizonte + colores de altura Hs.
 * La velocidad de las partículas representa el período (ajustada en capa).
 */
export function WavesLegend({
  visible,
  forecastHours = 0,
  onForecastHoursChange,
}) {
  if (!visible) return null;

  return (
    <div
      className="centinela-wind-legend centinela-waves-legend"
      role="region"
      aria-label="Pronóstico y leyenda de oleaje"
    >
      <div
        className="centinela-wind-legend__forecast"
        role="group"
        aria-label="Horizonte de pronóstico de oleaje"
      >
        {WAVE_FORECAST_HOUR_OPTIONS.map((opt) => {
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
        <span className="centinela-wind-legend__title">
          Olas · altura Hs (m)
        </span>
        <ul className="centinela-wind-legend__list">
          {WAVE_HEIGHT_LEGEND.map((item) => (
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
