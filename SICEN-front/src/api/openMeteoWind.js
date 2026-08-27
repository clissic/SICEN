import { windFetchPoints } from "./client.js";

/** Opciones del selector de horizonte (horas desde ahora). */
export const WIND_FORECAST_HOUR_OPTIONS = [
  { hours: 0, label: "Ahora" },
  { hours: 3, label: "+3 h" },
  { hours: 6, label: "+6 h" },
  { hours: 12, label: "+12 h" },
  { hours: 24, label: "+24 h" },
];

const CARDINALS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSO",
  "SO",
  "OSO",
  "O",
  "ONO",
  "NO",
  "NNO",
];

/** Dirección meteorológica (de dónde viene) → texto cardinal. */
export function windFromCardinal(deg) {
  if (deg == null || Number.isNaN(deg)) return "—";
  const norm = ((deg % 360) + 360) % 360;
  const idx = Math.round(norm / 22.5) % 16;
  return CARDINALS[idx];
}

export function formatWindSummary(speedKn, directionDeg) {
  if (speedKn == null || directionDeg == null) return "Sin dato de viento";
  const kn = Math.round(speedKn);
  const dir = Math.round(directionDeg);
  return `${kn} kn · del ${windFromCardinal(dir)} (${dir}°)`;
}

/**
 * Viento a 10 m vía proxy autenticado `/api/wind/points` (Open-Meteo + cache).
 * @param {{ lat: number, lon: number }[]} points
 */
export async function fetchWindAtPoints(
  points,
  { signal, forecastHoursOffset = 0 } = {}
) {
  if (!points?.length) return [];

  const data = await windFetchPoints(points, forecastHoursOffset, { signal });
  return Array.isArray(data?.points) ? data.points : [];
}

export async function fetchWindAtPoint(lat, lon, options) {
  const [point] = await fetchWindAtPoints([{ lat, lon }], options);
  return point;
}

/** Umbrales compartidos con la leyenda inferior y colores de partículas. */
export const WIND_SPEED_LEGEND = [
  { className: "centinela-wind-arrow--light", label: "< 10 kn" },
  { className: "centinela-wind-arrow--moderate", label: "10–19 kn" },
  { className: "centinela-wind-arrow--strong", label: "≥ 20 kn" },
];
