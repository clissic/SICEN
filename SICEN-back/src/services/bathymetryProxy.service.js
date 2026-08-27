import env from "../config/env.config.js";
import {
  bathymetryPointCacheKey,
  fetchGebcoElevationPoints,
} from "../utils/gebcoBathymetry.js";

const MAX_POINTS = 128;
const OPENTOPO_BATCH = 100;
const MAX_CACHE_ENTRIES = 12_000;

/** @type {Map<string, { at: number, data: object }>} */
const cache = new Map();

function httpError(msg, status = 400) {
  const err = new Error(msg);
  err.status = status;
  return err;
}

function pruneCache(now) {
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  const ttl = env.bathymetryCacheTtlMs;
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
 * Profundidades GEBCO (estáticas) con cache largo.
 */
export async function getBathymetryPoints({ points }) {
  if (!Array.isArray(points) || points.length === 0) {
    throw httpError("Se requiere al menos un punto.");
  }
  if (points.length > MAX_POINTS) {
    throw httpError(`Máximo ${MAX_POINTS} puntos por consulta.`);
  }

  const normalized = points.map(validatePoint);
  const now = Date.now();
  const ttl = env.bathymetryCacheTtlMs;
  const results = new Array(normalized.length);
  const toFetch = [];
  const toFetchIndices = [];
  let cacheHits = 0;

  for (let i = 0; i < normalized.length; i += 1) {
    const { lat, lon } = normalized[i];
    const key = bathymetryPointCacheKey(lat, lon);
    const hit = cache.get(key);
    if (hit && now - hit.at < ttl) {
      results[i] = { ...hit.data, lat, lon };
      cacheHits += 1;
    } else {
      toFetch.push({ lat, lon });
      toFetchIndices.push(i);
    }
  }

  let cacheMisses = 0;
  if (toFetch.length) {
    /* OpenTopoData: máx. ~100 locs por request. */
    for (let start = 0; start < toFetch.length; start += OPENTOPO_BATCH) {
      const chunk = toFetch.slice(start, start + OPENTOPO_BATCH);
      const chunkIdx = toFetchIndices.slice(start, start + OPENTOPO_BATCH);
      if (start > 0) {
        await new Promise((r) => setTimeout(r, 1100));
      }
      const fetched = await fetchGebcoElevationPoints(chunk);
      cacheMisses += fetched.length;
      for (let j = 0; j < fetched.length; j += 1) {
        const idx = chunkIdx[j];
        const row = fetched[j];
        const key = bathymetryPointCacheKey(row.lat, row.lon);
        cache.set(key, { at: now, data: row });
        results[idx] = row;
      }
    }
    pruneCache(now);
  }

  return {
    points: results,
    cacheHits,
    cacheMisses,
    source: "gebco2020",
  };
}
