import { currentsFetchPoints } from "./client.js";
import { windFromCardinal } from "./openMeteoWind.js";

/** Mismos horizontes que viento. */
export const CURRENT_FORECAST_HOUR_OPTIONS = [
  { hours: 0, label: "Ahora" },
  { hours: 3, label: "+3 h" },
  { hours: 6, label: "+6 h" },
  { hours: 12, label: "+12 h" },
  { hours: 24, label: "+24 h" },
];

export function formatCurrentSummary(speedKn, directionDeg) {
  if (speedKn == null || directionDeg == null) {
    return "Sin dato de corriente";
  }
  const kn = Math.round(speedKn * 10) / 10;
  const dir = Math.round(directionDeg);
  return `${kn} kn · hacia ${windFromCardinal(dir)} (${dir}°)`;
}

/**
 * Corrientes vía proxy `/api/currents/points` (Open-Meteo Marine + cache).
 */
export async function fetchCurrentAtPoints(
  points,
  { signal, forecastHoursOffset = 0 } = {}
) {
  if (!points?.length) return [];

  const data = await currentsFetchPoints(points, forecastHoursOffset, {
    signal,
  });
  return Array.isArray(data?.points) ? data.points : [];
}

export async function fetchCurrentAtPoint(lat, lon, options) {
  const [point] = await fetchCurrentAtPoints([{ lat, lon }], options);
  return point;
}

/** Umbrales leyenda (nudos) — escala típica de corrientes costeras. */
export const CURRENT_SPEED_LEGEND = [
  { className: "centinela-current-swatch--light", label: "< 0,5 kn" },
  { className: "centinela-current-swatch--moderate", label: "0,5–1,5 kn" },
  { className: "centinela-current-swatch--strong", label: "≥ 1,5 kn" },
];
