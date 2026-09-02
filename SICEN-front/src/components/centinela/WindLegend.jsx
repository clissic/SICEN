import { WIND_SPEED_LEGEND } from "../../api/openMeteoWind.js";

export function WindLegendSection() {
  return (
    <section
      className="centinela-env-legends-panel__section"
      aria-label="Leyenda de viento"
    >
      <div className="centinela-wind-legend__body">
        <span className="centinela-wind-legend__title">Viento (kn)</span>
        <ul className="centinela-wind-legend__list centinela-wind-legend__list--compact">
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
    </section>
  );
}

/** @deprecated Usar `CentinelaEnvLegendsPanel`. */
export function WindLegend({ visible }) {
  if (!visible) return null;
  return (
    <div className="centinela-wind-legend">
      <WindLegendSection />
    </div>
  );
}
