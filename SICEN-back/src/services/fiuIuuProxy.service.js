import env from "../config/env.config.js";
import { logger } from "../utils/logger.js";

/** Bbox por defecto: LAC aproximado (latMin, lonMin, latMax, lonMax). */
const DEFAULT_BBOX = [-48.5, -108.0, 28.8, -17.5];

const LAYER_URLS = {
  fishing:
    "https://services8.arcgis.com/pnYK7hEZV7vyJWwQ/arcgis/rest/services/saa_dev_static_view_fishing_start/FeatureServer/0",
  dark: "https://services8.arcgis.com/pnYK7hEZV7vyJWwQ/arcgis/rest/services/saa_dev_static_view_dark_activity_start_2/FeatureServer/0",
  sts: "https://services8.arcgis.com/pnYK7hEZV7vyJWwQ/arcgis/rest/services/saa_dev_static_view_meeting_start/FeatureServer/0",
};

const ALLOWED_LAYER_TYPES = new Set(Object.keys(LAYER_URLS));

/** Campos comunes entre fishing/dark/STS; `*` evita fallar si una capa no tiene alguno. */
const OUT_FIELDS = "*";

const MAX_LIMIT = 500;
const MAX_CACHE_ENTRIES = 64;

/** @type {Map<string, { at: number, data: object }>} */
const cache = new Map();

function httpError(msg, status = 400) {
  const err = new Error(msg);
  err.status = status;
  return err;
}

export function getFiuIuuStatus() {
  return {
    configured: true,
    source: "fiu-lac-iuu",
  };
}

function parseBbox(raw) {
  if (!raw || !String(raw).trim()) return null;
  const parts = String(raw)
    .split(",")
    .map((s) => Number(s.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return null;
  }
  const [latMin, lonMin, latMax, lonMax] = parts;
  if (latMin >= latMax || lonMin >= lonMax) return null;
  if (latMin < -90 || latMax > 90 || lonMin < -180 || lonMax > 180) return null;
  return [latMin, lonMin, latMax, lonMax];
}

function resolveBbox(bodyBbox) {
  if (Array.isArray(bodyBbox) && bodyBbox.length === 4) {
    const nums = bodyBbox.map(Number);
    if (
      nums.every(Number.isFinite) &&
      nums[0] < nums[2] &&
      nums[1] < nums[3]
    ) {
      return nums;
    }
  }
  if (typeof bodyBbox === "string") {
    const parsed = parseBbox(bodyBbox);
    if (parsed) return parsed;
  }
  return (
    parseBbox(env.fiuIuuBbox) ||
    parseBbox(env.aisBbox) ||
    DEFAULT_BBOX
  );
}

function roundBbox(bbox) {
  return bbox.map((n) => Math.round(n * 100) / 100);
}

function pruneCache(now) {
  const ttl = env.fiuIuuCacheTtlMs;
  for (const [key, entry] of cache) {
    if (now - entry.at > ttl) cache.delete(key);
  }
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  const drop = cache.size - MAX_CACHE_ENTRIES;
  let n = 0;
  for (const key of cache.keys()) {
    cache.delete(key);
    n += 1;
    if (n >= drop) break;
  }
}

function toIsoMaybe(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    // ArcGIS epoch ms
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

/**
 * @param {string} layerType
 * @param {object} feature ArcGIS feature
 */
function normalizeFeature(layerType, feature) {
  const a = feature?.attributes || {};
  const g = feature?.geometry || {};

  let lat = numOrNull(a.start_latitude);
  let lon = numOrNull(a.start_longitude);
  if ((!Number.isFinite(lat) || !Number.isFinite(lon)) && g) {
    if (Number.isFinite(g.y) && Number.isFinite(g.x)) {
      lat = g.y;
      lon = g.x;
    }
  }

  const endLat = numOrNull(a.end_latitude);
  const endLon = numOrNull(a.end_longitude);

  const objectId = a.ObjectId ?? a.OBJECTID ?? a.objectid;
  const activityId = strOrNull(a.ww_activity_id) || strOrNull(a.id);
  const eventId = `${layerType}:${activityId || objectId || `${lat},${lon}`}`;

  return {
    eventId,
    layerType,
    activityType: strOrNull(a.activity_type),
    startTime: toIsoMaybe(a.start_date),
    endTime: toIsoMaybe(a.end_date),
    lat,
    lon,
    endLat,
    endLon,
    durationHours: numOrNull(a.activity_duration__hours_),
    inProgress:
      a.in_progress_derived === 1 ||
      a.in_progress_derived === "1" ||
      a.in_progress === 1,
    startLocationName: strOrNull(a.start_location_name),
    endLocationName: strOrNull(a.end_location_name),
    vessel: {
      vesselId: strOrNull(a.vesselid),
      name: strOrNull(a.vessel_name),
      mmsi: a.mmsi != null && a.mmsi !== "" ? String(a.mmsi) : null,
      imo: numOrNull(a.imo),
      callSign: strOrNull(a.call_sign),
      flag: strOrNull(a.flag),
      class: strOrNull(a.class),
      subclass: strOrNull(a.subclass),
      length: numOrNull(a.length),
      iuuRisk: strOrNull(a.iuu_risk),
      forcedLabor:
        a.forced_labor === 1 || a.forced_labor === "1"
          ? true
          : a.forced_labor === 0 || a.forced_labor === "0"
            ? false
            : null,
    },
    secondVessel:
      a.second_vesselid || a.second_vessel_name || a.second_vessel_mmsi
        ? {
            vesselId: strOrNull(a.second_vesselid),
            name: strOrNull(a.second_vessel_name),
            mmsi:
              a.second_vessel_mmsi != null && a.second_vessel_mmsi !== ""
                ? String(a.second_vessel_mmsi)
                : null,
            flag: strOrNull(a.second_vessel_flag),
            subclass: strOrNull(a.second_vessel_subclass),
          }
        : null,
    wwActivityId: strOrNull(a.ww_activity_id),
    source: "fiu-lac-iuu",
  };
}

/**
 * @param {string} layerUrl
 * @param {[number, number, number, number]} bbox
 * @param {number} limit
 */
async function queryLayer(layerUrl, bbox, limit) {
  const [latMin, lonMin, latMax, lonMax] = bbox;
  const geometry = JSON.stringify({
    xmin: lonMin,
    ymin: latMin,
    xmax: lonMax,
    ymax: latMax,
    spatialReference: { wkid: 4326 },
  });

  const params = new URLSearchParams({
    where: "1=1",
    geometry,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: OUT_FIELDS,
    returnGeometry: "true",
    outSR: "4326",
    resultRecordCount: String(limit),
    f: "json",
  });

  const url = `${layerUrl}/query?${params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw httpError(
      `ArcGIS FIU IUU respondió ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
      res.status >= 500 ? 502 : 502
    );
  }

  const data = await res.json();
  if (data?.error) {
    const msg =
      data.error.message ||
      data.error.details?.join?.("; ") ||
      "Error de ArcGIS FeatureServer.";
    throw httpError(msg, 502);
  }

  return Array.isArray(data?.features) ? data.features : [];
}

/**
 * @param {{ layerTypes: string[], bbox?: number[]|string, limit?: number }} opts
 */
export async function searchFiuIuuEvents({ layerTypes, bbox, limit } = {}) {
  const types = Array.isArray(layerTypes)
    ? [...new Set(layerTypes.map((t) => String(t).trim()).filter(Boolean))]
    : [];
  if (!types.length) {
    throw httpError("Se requiere al menos un layerType (fishing, dark, sts).");
  }
  for (const t of types) {
    if (!ALLOWED_LAYER_TYPES.has(t)) {
      throw httpError(`layerType no permitido: ${t}`);
    }
  }

  const resolvedBbox = resolveBbox(bbox);
  const cappedLimit = Math.min(
    Math.max(Number(limit) || MAX_LIMIT, 1),
    MAX_LIMIT
  );
  const rounded = roundBbox(resolvedBbox);
  const cacheKey = `${types.sort().join(",")}|${rounded.join(",")}|${cappedLimit}`;
  const now = Date.now();
  pruneCache(now);

  const hit = cache.get(cacheKey);
  if (hit && now - hit.at < env.fiuIuuCacheTtlMs) {
    return { ...hit.data, cacheHit: true };
  }

  const perLayer = Math.max(1, Math.ceil(cappedLimit / types.length));
  const events = [];

  await Promise.all(
    types.map(async (layerType) => {
      try {
        const features = await queryLayer(
          LAYER_URLS[layerType],
          resolvedBbox,
          perLayer
        );
        for (const f of features) {
          const ev = normalizeFeature(layerType, f);
          if (Number.isFinite(ev.lat) && Number.isFinite(ev.lon)) {
            events.push(ev);
          }
        }
      } catch (e) {
        logger.warning(
          `FIU IUU capa ${layerType}: ${e?.message || e}`
        );
        throw e;
      }
    })
  );

  events.sort((a, b) => {
    const ta = a.startTime ? Date.parse(a.startTime) : 0;
    const tb = b.startTime ? Date.parse(b.startTime) : 0;
    return tb - ta;
  });

  const sliced = events.slice(0, cappedLimit);
  const payload = {
    events: sliced,
    total: sliced.length,
    bbox: resolvedBbox,
    layerTypes: types,
    source: "fiu-lac-iuu",
    fetchedAt: new Date().toISOString(),
    cacheHit: false,
  };

  cache.set(cacheKey, { at: now, data: payload });
  return payload;
}
