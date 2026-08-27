import { BATHYMETRY_DEPTH_LEGEND } from "../../api/gebcoBathymetry.js";

/**
 * Leyenda de bandas de color por profundidad.
 */
export function BathymetryLegend({ visible }) {
  if (!visible) return null;

  return (
    <div
      className="centinela-wind-legend centinela-bathymetry-legend"
      role="region"
      aria-label="Leyenda de batimetría"
    >
      <div className="centinela-wind-legend__body">
        <span className="centinela-wind-legend__title">
          Batimetría · profundidad (m)
        </span>
        <ul className="centinela-wind-legend__list">
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
        <p className="centinela-bathymetry-legend__note">
          GEBCO · solo agua · no sustituye carta SOHMA
        </p>
      </div>
    </div>
  );
}
