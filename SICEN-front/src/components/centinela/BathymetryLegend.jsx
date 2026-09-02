import { BATHYMETRY_DEPTH_LEGEND } from "../../api/gebcoBathymetry.js";

export function BathymetryLegendSection() {
  return (
    <section
      className="centinela-env-legends-panel__section"
      aria-label="Leyenda de batimetría"
    >
      <div className="centinela-wind-legend__body">
        <span className="centinela-wind-legend__title">
          Batimetría · prof. (m)
        </span>
        <ul className="centinela-wind-legend__list centinela-wind-legend__list--compact">
          {BATHYMETRY_DEPTH_LEGEND.map((item) => (
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
export function BathymetryLegend({ visible }) {
  if (!visible) return null;
  return (
    <div className="centinela-wind-legend centinela-bathymetry-legend">
      <BathymetryLegendSection />
    </div>
  );
}
