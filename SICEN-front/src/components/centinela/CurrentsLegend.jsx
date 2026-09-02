import { CURRENT_SPEED_LEGEND } from "../../api/openMeteoCurrents.js";

export function CurrentsLegendSection() {
  return (
    <section
      className="centinela-env-legends-panel__section"
      aria-label="Leyenda de corrientes"
    >
      <div className="centinela-wind-legend__body">
        <span className="centinela-wind-legend__title">Corrientes (kn)</span>
        <ul className="centinela-wind-legend__list centinela-wind-legend__list--compact">
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
    </section>
  );
}

/** @deprecated Usar `CentinelaEnvLegendsPanel`. */
export function CurrentsLegend({ visible }) {
  if (!visible) return null;
  return (
    <div className="centinela-wind-legend centinela-currents-legend">
      <CurrentsLegendSection />
    </div>
  );
}
