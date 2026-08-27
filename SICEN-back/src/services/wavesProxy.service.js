import env from "../config/env.config.js";
import {
  ALLOWED_WAVE_FORECAST_OFFSETS,
  fetchOpenMeteoWavePoints,
  wavePointCacheKey,
} from "../utils/openMeteoWaves.js";

const MAX_POINTS = 64;
const MAX_CACHE_ENTRIES = 8000;

/** @type {Map<string, { at: number, data: object }>} */
const cache = new Map();

function httpError(msg, status = 400) {
  const err = new Error(msg);
  err.status = status;
  return err;
}

function pruneCache(now) {
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  const ttl = env.wavesCacheTtlMs;
  for (const [key, entry] of cache) {
    if (now - entry.at > ttl) cache.delete(key);
    if (cache.size <= MAX_CACHE_ENTRIES * 0.85) break;
  }
  if (cache.size > MAX_CACHE_ENTRIES) {
    const drop = cache.size - MAX_CACHE_ENTRIES;
    let n = 0;
    for (const key of cache.keys()) {
      cache.delete(key);
      n += 1;
      if (n >= drop) break;
    }
  }
}

function validatePoint(p, index) {
  const lat = Number(p?.lat);
  const lon = Number(p?.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw httpError(`Punto ${index + 1}: latitud inválida.`);
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw httpError(`Punto ${index + 1}: longitud inválida.`);
  }
  return { lat, lon };
}

/**
 * Oleaje con cache por punto (Open-Meteo Marine vía proxy).
 */
export async function getWavePoints({ points, forecastHoursOffset = 0 }) {
  if (!Array.isArray(points) || points.length === 0) {
    throw httpError("Se requiere al menos un punto.");
  }
  if (points.length > MAX_POINTS) {
    throw httpError(`Máximo ${MAX_POINTS} puntos por consulta.`);
  }

  const offset = Number(forecastHoursOffset);
  if (!ALLOWED_WAVE_FORECAST_OFFSETS.has(offset)) {
    throw httpError("Horizonte de pronóstico no válido.");
  }

  const normalized = points.map(validatePoint);
  const now = Date.now();
  const ttl = env.wavesCacheTtlMs;
  const results = new Array(normalized.length);
  const toFetch = [];
  const toFetchIndices = [];
  let cacheHits = 0;

  for (let i = 0; i < normalized.length; i += 1) {
    const { lat, lon } = normalized[i];
    const key = wavePointCacheKey(lat, lon, offset);
    const hit = cache.get(key);
    if (hit && now - hit.at < ttl) {
      results[i] = { ...hit.data, lat, lon };
      cacheHits += 1;
    } else {
      toFetch.push({ lat, lon });
      toFetchIndices.push(i);
    }
  }

  const cacheMisses = toFetch.length;

  if (toFetch.length > 0) {
    const fetched = await fetchOpenMeteoWavePoints(toFetch, offset);
    for (let j = 0; j < fetched.length; j += 1) {
      const i = toFetchIndices[j];
      const src = fetched[j] ?? {};
      const { lat, lon } = toFetch[j];
      const point = {
        lat: src.lat ?? lat,
        lon: src.lon ?? lon,
        heightM: src.heightM ?? null,
        periodS: src.periodS ?? null,
        directionDeg: src.directionDeg ?? null,
        time: src.time ?? null,
        forecastHoursOffset: offset,
      };
      results[i] = point;
      cache.set(wavePointCacheKey(lat, lon, offset), { at: now, data: point });
    }
    pruneCache(now);
  }

  return {
    points: results,
    cacheHits,
    cacheMisses,
    forecastHoursOffset: offset,
    source: "open-meteo-marine",
  };
}
