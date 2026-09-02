import { WAVE_HEIGHT_LEGEND } from "../../api/openMeteoWaves.js";

export function WavesLegendSection() {
  return (
    <section
      className="centinela-env-legends-panel__section"
      aria-label="Leyenda de oleaje"
    >
      <div className="centinela-wind-legend__body">
        <span className="centinela-wind-legend__title">Olas · Hs (m)</span>
        <ul className="centinela-wind-legend__list centinela-wind-legend__list--compact">
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
    </section>
  );
}

/** @deprecated Usar `CentinelaEnvLegendsPanel`. */
export function WavesLegend({ visible }) {
  if (!visible) return null;
  return (
    <div className="centinela-wind-legend centinela-waves-legend">
      <WavesLegendSection />
    </div>
  );
}
