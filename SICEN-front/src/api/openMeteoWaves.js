import { wavesFetchPoints } from "./client.js";
import { windFromCardinal } from "./openMeteoWind.js";

export const WAVE_FORECAST_HOUR_OPTIONS = [
  { hours: 0, label: "Ahora" },
  { hours: 3, label: "+3 h" },
  { hours: 6, label: "+6 h" },
  { hours: 12, label: "+12 h" },
  { hours: 24, label: "+24 h" },
];

/** Leyenda altura significativa Hs (m) — colores de las partículas. */
export const WAVE_HEIGHT_LEGEND = [
  { className: "centinela-wave-swatch--h0", label: "< 0,5 m" },
  { className: "centinela-wave-swatch--h1", label: "0,5–1,5 m" },
  { className: "centinela-wave-swatch--h2", label: "1,5–3 m" },
  { className: "centinela-wave-swatch--h3", label: "≥ 3 m" },
];

export function formatWaveSummary(point) {
  if (!point) return "Sin dato de oleaje";
  const parts = [];
  if (point.heightM != null) {
    parts.push(`${point.heightM.toFixed(1)} m`);
  }
  if (point.periodS != null) {
    parts.push(`${Math.round(point.periodS)} s`);
  }
  if (point.directionDeg != null) {
    const dir = Math.round(point.directionDeg);
    parts.push(`del ${windFromCardinal(dir)} (${dir}°)`);
  }
  return parts.length ? parts.join(" · ") : "Sin dato de oleaje";
}

export async function fetchWaveAtPoints(
  points,
  { signal, forecastHoursOffset = 0 } = {}
) {
  if (!points?.length) return [];
  const data = await wavesFetchPoints(points, forecastHoursOffset, { signal });
  return Array.isArray(data?.points) ? data.points : [];
}

export async function fetchWaveAtPoint(lat, lon, options) {
  const [point] = await fetchWaveAtPoints([{ lat, lon }], options);
  return point;
}
