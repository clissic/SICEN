import { BathymetryLegendSection } from "./BathymetryLegend.jsx";
import { CentinelaEnvForecastSelector } from "./CentinelaEnvForecastSelector.jsx";
import { CurrentsLegendSection } from "./CurrentsLegend.jsx";
import { WavesLegendSection } from "./WavesLegend.jsx";
import { WindLegendSection } from "./WindLegend.jsx";

/**
 * Panel único de leyendas ambientales; cada capa activa agrega una sección.
 */
export function CentinelaEnvLegendsPanel({
  bathymetryOn,
  windLayerOn,
  currentsLayerOn,
  wavesLayerOn,
  forecastHours,
  onForecastHoursChange,
}) {
  const hasAny =
    bathymetryOn || windLayerOn || currentsLayerOn || wavesLayerOn;
  const hasForecastLayer = windLayerOn || currentsLayerOn || wavesLayerOn;

  if (!hasAny) return null;

  return (
    <div
      className="centinela-env-legends-panel"
      role="region"
      aria-label="Leyendas de capas ambientales"
    >
      {hasForecastLayer ? (
        <CentinelaEnvForecastSelector
          forecastHours={forecastHours}
          onForecastHoursChange={onForecastHoursChange}
        />
      ) : null}
      {bathymetryOn ? <BathymetryLegendSection /> : null}
      {windLayerOn ? <WindLegendSection /> : null}
      {currentsLayerOn ? <CurrentsLegendSection /> : null}
      {wavesLayerOn ? <WavesLegendSection /> : null}
    </div>
  );
}
