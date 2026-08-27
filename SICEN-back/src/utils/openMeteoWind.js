const OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast";

export const ALLOWED_WIND_FORECAST_OFFSETS = new Set([0, 3, 6, 12, 24]);

function forecastDaysForOffset(offsetHours) {
  return Math.min(16, Math.max(1, Math.ceil((offsetHours + 1) / 24) + 1));
}

/** Índice en serie horaria más cercano a ahora + offset. */
export function pickHourlyWindIndex(times, offsetHours = 0) {
  if (!times?.length) return 0;
  const targetMs = Date.now() + offsetHours * 3600000;
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < times.length; i += 1) {
    const t = new Date(times[i]).getTime();
    if (Number.isNaN(t)) continue;
    const diff = Math.abs(t - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function normalizeHourlyWindResponse(data, fallbackPoints, offsetHours = 0) {
  const list = Array.isArray(data) ? data : [data];
  return list.map((item, i) => {
    const times = item.hourly?.time ?? [];
    const idx = pickHourlyWindIndex(times, offsetHours);
    return {
      lat: item.latitude ?? fallbackPoints[i]?.lat,
      lon: item.longitude ?? fallbackPoints[i]?.lon,
      speedKn: item.hourly?.wind_speed_10m?.[idx] ?? null,
      directionDeg: item.hourly?.wind_direction_10m?.[idx] ?? null,
      time: times[idx] ?? null,
      forecastHoursOffset: offsetHours,
    };
  });
}

/**
 * Consulta upstream Open-Meteo (sin cache).
 * @param {{ lat: number, lon: number }[]} points
 */
export async function fetchOpenMeteoWindPoints(points, forecastHoursOffset = 0) {
  if (!points?.length) return [];

  const url = new URL(OPEN_METEO_FORECAST);
  url.searchParams.set("latitude", points.map((p) => p.lat).join(","));
  url.searchParams.set("longitude", points.map((p) => p.lon).join(","));
  url.searchParams.set("hourly", "wind_speed_10m,wind_direction_10m");
  url.searchParams.set(
    "forecast_days",
    String(forecastDaysForOffset(forecastHoursOffset))
  );
  url.searchParams.set("wind_speed_unit", "kn");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const err = new Error(`Open-Meteo respondió ${res.status}`);
    err.status = 502;
    throw err;
  }

  const data = await res.json();
  return normalizeHourlyWindResponse(data, points, forecastHoursOffset);
}

/** Clave de cache estable (2 decimales + offset horario). */
export function windPointCacheKey(lat, lon, forecastHoursOffset) {
  return `${forecastHoursOffset}:${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;
}
