import env from "../config/env.config.js";
import { logger } from "../utils/logger.js";

const GRAPHQL_URL = "https://api.skylight.earth/graphql";

/** Bbox por defecto: Uruguay + Río de la Plata / Atlántico adyacente (latMin, lonMin, latMax, lonMax). */
const DEFAULT_BBOX = [-38.5, -61.0, -30.5, -50.5];

const DETECTION_EVENT_TYPES = new Set([
  "sar_sentinel1",
  "eo_sentinel2",
  "eo_landsat_8_9",
  "viirs",
]);

const AOI_EVENT_TYPES = new Set(["aoi_visit", "speed_range"]);

const BEHAVIOR_EVENT_TYPES = new Set([
  "fishing_activity_history",
  "standard_rendezvous",
  "dark_rendezvous",
]);

const ALLOWED_EVENT_TYPES = new Set([
  ...DETECTION_EVENT_TYPES,
  ...BEHAVIOR_EVENT_TYPES,
  ...AOI_EVENT_TYPES,
]);

const FRAME_EVENT_TYPES = [
  "sar_sentinel1",
  "eo_sentinel2",
  "eo_landsat_8_9",
];

const MAX_LIMIT = 500;
const DEFAULT_LOOKBACK_HOURS = 168; // 7 días
const MAX_LOOKBACK_HOURS = 720; // 30 días (límite práctico; retención Skylight 540 d)
const MAX_CACHE_ENTRIES = 64;

/** @type {Map<string, { at: number, data: object }>} */
const cache = new Map();

function httpError(msg, status = 400) {
  const err = new Error(msg);
  err.status = status;
  return err;
}

export function isSkylightConfigured() {
  return Boolean(env.skylightApiKey?.trim());
}

export function getSkylightStatus() {
  return {
    configured: isSkylightConfigured(),
    source: "skylight",
  };
}

function parseBbox() {
  const raw = (env.skylightBbox || env.aisBbox || "").trim();
  if (!raw) return DEFAULT_BBOX;
  const parts = raw.split(",").map((s) => Number(s.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return DEFAULT_BBOX;
  }
  return parts;
}

/**
 * @param {[number, number, number, number]} bbox latMin,lonMin,latMax,lonMax
 */
function bboxToPolygon(bbox) {
  const [latMin, lonMin, latMax, lonMax] = bbox;
  return {
    type: "Polygon",
    coordinates: [
      [
        [lonMin, latMin],
        [lonMax, latMin],
        [lonMax, latMax],
        [lonMin, latMax],
        [lonMin, latMin],
      ],
    ],
  };
}

const SEARCH_EVENTS_QUERY = `
query SearchEventsV2($input: SearchEventsV2Input!) {
  searchEventsV2(input: $input) {
    records {
      eventId
      eventType
      start {
        time
        point { lat lon }
      }
      end {
        time
        point { lat lon }
      }
      vessels {
        vessel0 {
          vesselId
          name
          displayName
          mmsi
          imo
          length
          vesselType
          displayCountry
          countryCode
        }
        vessel1 {
          vesselId
          name
          displayName
          mmsi
          imo
          length
          vesselType
          displayCountry
          countryCode
        }
      }
      eventDetails {
        ... on ImageryMetadataEventDetails {
          detectionType
          score
          estimatedLength
          estimatedSpeedKts
          estimatedVesselCategory
          heading
          distanceToCoastM
          imageUrl
        }
        ... on ViirsEventDetails {
          detectionType
          estimatedLength
          heading
          radianceNw
          imageUrl
        }
        ... on FishingEventDetails {
          fishingScore
        }
        ... on DarkRendezvousEventDetails {
          osrScore
        }
        ... on AoiVisitEventDetails {
          entryHeading
          endHeading
          entrySpeed
        }
        ... on SpeedRangeEventDetails {
          averageSpeed
          distance
          durationSec
        }
      }
      aoiFeatureConfiguration {
        aoiId
        aoiName
        configId
      }
      createdAt
      updatedAt
    }
    meta {
      total
    }
  }
}
`;

const SEARCH_FRAMES_QUERY = `
query SearchSatelliteFramesV2($input: SearchSatelliteFramesV2Input!) {
  searchSatelliteFramesV2(input: $input) {
    records {
      frameId
      vendorId
      collectedAt
      createdAt
      updatedAt
      eventType
      status
      geometry {
        type
        coordinates
      }
      numDetections {
        totalCount
        correlatedCount
        uncorrelatedCount
      }
    }
    meta {
      total
    }
  }
}
`;

const SEARCH_AOIS_QUERY = `
query SearchAOIs($input: SearchAOIsInput!) {
  searchAOIs(input: $input) {
    records {
      id
      status
      properties {
        aoiId
        name
        aoiType
        areaKm2
        bounds
      }
      geometry {
        type
        coordinates
      }
      createdAt
      updatedAt
    }
    meta {
      total
    }
  }
}
`;

async function skylightGraphql(query, variables) {
  if (!isSkylightConfigured()) {
    throw httpError(
      "Skylight no está configurado. Falta SKYLIGHT_API_KEY.",
      503
    );
  }

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.skylightApiKey.trim()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw httpError(
      `Respuesta inválida de Skylight (HTTP ${res.status}).`,
      502
    );
  }

  if (!res.ok) {
    const msg =
      body?.errors?.[0]?.message ||
      body?.message ||
      `Error Skylight HTTP ${res.status}`;
    throw httpError(msg, res.status >= 500 ? 502 : res.status);
  }

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    const msg = body.errors.map((e) => e.message).join("; ");
    logger.warning(`Skylight GraphQL errors: ${msg}`);
    throw httpError(msg || "Error en la consulta a Skylight.", 502);
  }

  return body.data;
}

function normalizeVessel(v) {
  if (!v || typeof v !== "object") return null;
  const countryCode = Array.isArray(v.countryCode)
    ? v.countryCode[0] ?? null
    : v.countryCode ?? v.flag_code ?? null;
  return {
    vesselId: v.vesselId ?? null,
    mmsi: v.mmsi ?? null,
    name: v.name ?? v.displayName ?? null,
    flag: v.displayCountry ?? v.flag ?? null,
    flagCode: countryCode,
    vesselType: v.vesselType ?? v.vessel_type ?? null,
    vesselCategory: v.category ?? v.vessel_category ?? null,
    imo: v.imo ?? null,
    length: v.length ?? null,
  };
}

function normalizeEventDetails(details) {
  if (!details || typeof details !== "object") return null;
  return {
    detectionType: details.detectionType ?? null,
    score: details.score ?? null,
    estimatedLength: details.estimatedLength ?? null,
    estimatedSpeedKts: details.estimatedSpeedKts ?? null,
    estimatedVesselCategory: details.estimatedVesselCategory ?? null,
    heading: details.heading ?? null,
    distanceToCoastM: details.distanceToCoastM ?? null,
    imageUrl: details.imageUrl ?? null,
    radianceNw: details.radianceNw ?? null,
    fishingScore: details.fishingScore ?? null,
    osrScore: details.osrScore ?? null,
    entryHeading: details.entryHeading ?? null,
    endHeading: details.endHeading ?? null,
    entrySpeed: details.entrySpeed ?? null,
    averageSpeed: details.averageSpeed ?? null,
    distance: details.distance ?? null,
    durationSec: details.durationSec ?? null,
  };
}

function normalizeEvent(raw) {
  const lat = Number(raw?.start?.point?.lat);
  const lon = Number(raw?.start?.point?.lon);
  const endLat = Number(raw?.end?.point?.lat);
  const endLon = Number(raw?.end?.point?.lon);
  const aoi = raw?.aoiFeatureConfiguration || null;
  return {
    eventId: raw.eventId,
    eventType: raw.eventType,
    startTime: raw?.start?.time ?? null,
    endTime: raw?.end?.time ?? null,
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    endLat: Number.isFinite(endLat) ? endLat : null,
    endLon: Number.isFinite(endLon) ? endLon : null,
    vessels: {
      vessel0: normalizeVessel(raw?.vessels?.vessel0 ?? raw?.vessels?.vessel_0),
      vessel1: normalizeVessel(raw?.vessels?.vessel1 ?? raw?.vessels?.vessel_1),
    },
    details: normalizeEventDetails(raw?.eventDetails),
    aoi: aoi
      ? {
          aoiId: aoi.aoiId ?? null,
          aoiName: aoi.aoiName ?? null,
          configId: aoi.configId ?? null,
        }
      : null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  };
}

/** GeoJSON lon/lat rings → Leaflet [lat, lon][]. */
function geoJsonPolygonToLatLngs(geometry) {
  if (!geometry || geometry.type !== "Polygon") return null;
  const ring = geometry.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 3) return null;
  return ring
    .map((c) => {
      const lon = Number(c?.[0]);
      const lat = Number(c?.[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return [lat, lon];
    })
    .filter(Boolean);
}

function normalizeFrame(raw) {
  const positions = geoJsonPolygonToLatLngs(raw?.geometry);
  return {
    frameId: raw.frameId,
    vendorId: raw.vendorId ?? null,
    collectedAt: raw.collectedAt ?? null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
    eventType: raw.eventType ?? null,
    status: raw.status ?? null,
    positions,
    detections: {
      total: raw?.numDetections?.totalCount ?? null,
      correlated: raw?.numDetections?.correlatedCount ?? null,
      uncorrelated: raw?.numDetections?.uncorrelatedCount ?? null,
    },
  };
}

function normalizeAoi(raw) {
  const props = raw?.properties || {};
  const aoiId = props.aoiId || raw.id || null;
  return {
    aoiId,
    id: raw.id ?? aoiId,
    name: props.name ?? null,
    aoiType: props.aoiType ?? null,
    areaKm2: props.areaKm2 ?? null,
    status: raw.status ?? null,
    positions: geoJsonPolygonToLatLngs(raw?.geometry),
    bounds: Array.isArray(props.bounds) ? props.bounds : null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  };
}

function pruneCache(now) {
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  const ttl = env.skylightCacheTtlMs;
  for (const [key, entry] of cache) {
    if (now - entry.at > ttl) cache.delete(key);
  }
  while (cache.size > MAX_CACHE_ENTRIES) {
    const first = cache.keys().next().value;
    cache.delete(first);
  }
}

/**
 * Busca eventos Skylight en el bbox operativo.
 * @param {{
 *   eventTypes: string[],
 *   darkOnly?: boolean,
 *   lookbackHours?: number,
 *   limit?: number,
 *   aoiIds?: string[],
 * }} opts
 */
export async function searchSkylightEvents({
  eventTypes,
  darkOnly = false,
  lookbackHours = DEFAULT_LOOKBACK_HOURS,
  limit = 200,
  aoiIds = [],
} = {}) {
  const onlyDarkFlag = Boolean(darkOnly);
  if ((!Array.isArray(eventTypes) || eventTypes.length === 0) && !onlyDarkFlag) {
    throw httpError("Indicá al menos un tipo de evento Skylight.");
  }

  const types = [
    ...new Set(
      (Array.isArray(eventTypes) ? eventTypes : [])
        .map((t) => String(t || "").trim())
        .filter(Boolean)
    ),
  ];
  for (const t of types) {
    if (!ALLOWED_EVENT_TYPES.has(t)) {
      throw httpError(`Tipo de evento no soportado: ${t}`);
    }
  }

  const hours = Number(lookbackHours);
  if (!Number.isFinite(hours) || hours < 1 || hours > MAX_LOOKBACK_HOURS) {
    throw httpError(
      `Horizonte inválido (1–${MAX_LOOKBACK_HOURS} horas).`
    );
  }

  const lim = Math.min(
    Math.max(1, Number(limit) || 200),
    MAX_LIMIT
  );
  const onlyDark = onlyDarkFlag;
  const aoiIdList = [
    ...new Set(
      (Array.isArray(aoiIds) ? aoiIds : [])
        .map((id) => String(id || "").trim())
        .filter(Boolean)
    ),
  ];

  const detectionSelected = types.filter((t) => DETECTION_EVENT_TYPES.has(t));
  const behaviorSelected = types.filter((t) => BEHAVIOR_EVENT_TYPES.has(t));
  const aoiSelected = types.filter((t) => AOI_EVENT_TYPES.has(t));

  let detectionTypes = detectionSelected;
  if (onlyDark && detectionTypes.length === 0) {
    detectionTypes = [...DETECTION_EVENT_TYPES];
  }
  const queryDetectionTypes = onlyDark ? detectionTypes : detectionSelected;
  const queryBehaviorTypes = onlyDark ? behaviorSelected : behaviorSelected;
  const queryAoiTypes = onlyDark ? aoiSelected : aoiSelected;

  if (
    queryDetectionTypes.length === 0 &&
    queryBehaviorTypes.length === 0 &&
    queryAoiTypes.length === 0
  ) {
    throw httpError("Indicá al menos una capa Skylight.");
  }

  const now = Date.now();
  const endIso = new Date(now).toISOString();
  const startIso = new Date(now - hours * 3600_000).toISOString();
  const bbox = parseBbox();
  const polygon = bboxToPolygon(bbox);

  const cacheKey = JSON.stringify({
    detection: [...queryDetectionTypes].sort(),
    behavior: [...queryBehaviorTypes].sort(),
    aoi: [...queryAoiTypes].sort(),
    aoiIds: [...aoiIdList].sort(),
    onlyDark,
    hours,
    lim,
    bbox,
  });

  const hit = cache.get(cacheKey);
  if (hit && now - hit.at < env.skylightCacheTtlMs) {
    return { ...hit.data, cacheHit: true };
  }

  async function fetchTypes(eventTypeList, { applyDarkFilter, useAoiIds }) {
    if (!eventTypeList.length) {
      return { records: [], total: 0 };
    }
    /** @type {Record<string, unknown>} */
    const input = {
      eventType: { inc: eventTypeList },
      startTime: { gte: startIso, lte: endIso },
      limit: lim,
      offset: 0,
      sortBy: "created",
      sortDirection: "desc",
    };
    if (useAoiIds && aoiIdList.length > 0) {
      input.intersectsAreaId = { inc: aoiIdList };
    } else {
      input.intersectsGeometry = polygon;
    }
    if (applyDarkFilter) {
      input.eventDetails = { detectionType: { eq: "dark" } };
    }
    const data = await skylightGraphql(SEARCH_EVENTS_QUERY, { input });
    return {
      records: data?.searchEventsV2?.records || [],
      total: data?.searchEventsV2?.meta?.total ?? 0,
    };
  }

  const [detRes, behRes, aoiRes] = await Promise.all([
    fetchTypes(queryDetectionTypes, {
      applyDarkFilter: onlyDark,
      useAoiIds: false,
    }),
    fetchTypes(queryBehaviorTypes, {
      applyDarkFilter: false,
      useAoiIds: false,
    }),
    fetchTypes(queryAoiTypes, {
      applyDarkFilter: false,
      useAoiIds: true,
    }),
  ]);

  const byId = new Map();
  for (const raw of [
    ...detRes.records,
    ...behRes.records,
    ...aoiRes.records,
  ]) {
    const n = normalizeEvent(raw);
    if (n.lat == null || n.lon == null || !n.eventId) continue;
    byId.set(n.eventId, n);
  }
  const records = [...byId.values()];

  const result = {
    events: records,
    total:
      (detRes.total || 0) + (behRes.total || 0) + (aoiRes.total || 0),
    lookbackHours: hours,
    bbox,
    eventTypes: [
      ...queryDetectionTypes,
      ...queryBehaviorTypes,
      ...queryAoiTypes,
    ],
    aoiIds: aoiIdList,
    darkOnly: onlyDark,
    source: "skylight",
    fetchedAt: new Date(now).toISOString(),
  };

  pruneCache(now);
  cache.set(cacheKey, { at: now, data: result });
  return { ...result, cacheHit: false };
}

/**
 * Pasadas / frames satelitales que intersectan el bbox operativo.
 */
export async function searchSkylightFrames({
  lookbackHours = DEFAULT_LOOKBACK_HOURS,
  limit = 80,
  eventTypes = FRAME_EVENT_TYPES,
} = {}) {
  const hours = Number(lookbackHours);
  if (!Number.isFinite(hours) || hours < 1 || hours > MAX_LOOKBACK_HOURS) {
    throw httpError(
      `Horizonte inválido (1–${MAX_LOOKBACK_HOURS} horas).`
    );
  }
  const lim = Math.min(Math.max(1, Number(limit) || 80), 200);
  const types = [
    ...new Set(
      (Array.isArray(eventTypes) ? eventTypes : FRAME_EVENT_TYPES)
        .map((t) => String(t || "").trim())
        .filter((t) => FRAME_EVENT_TYPES.includes(t) || t === "viirs")
    ),
  ];
  if (types.length === 0) {
    throw httpError("Indicá al menos un tipo de frame satelital.");
  }

  const now = Date.now();
  const endIso = new Date(now).toISOString();
  const startIso = new Date(now - hours * 3600_000).toISOString();
  const bbox = parseBbox();
  const polygon = bboxToPolygon(bbox);

  const cacheKey = JSON.stringify({
    kind: "frames",
    types: [...types].sort(),
    hours,
    lim,
    bbox,
  });
  const hit = cache.get(cacheKey);
  if (hit && now - hit.at < env.skylightCacheTtlMs) {
    return { ...hit.data, cacheHit: true };
  }

  const input = {
    eventType: { inc: types },
    collectedAt: { gte: startIso, lte: endIso },
    intersectsGeometry: polygon,
    status: { eq: "Completed" },
    limit: lim,
    offset: 0,
    sortBy: "collectedAt",
    sortDirection: "desc",
  };

  const data = await skylightGraphql(SEARCH_FRAMES_QUERY, { input });
  const frames = (data?.searchSatelliteFramesV2?.records || [])
    .map(normalizeFrame)
    .filter((f) => f.frameId && Array.isArray(f.positions) && f.positions.length >= 3);

  const result = {
    frames,
    total: data?.searchSatelliteFramesV2?.meta?.total ?? frames.length,
    lookbackHours: hours,
    bbox,
    eventTypes: types,
    source: "skylight",
    fetchedAt: new Date(now).toISOString(),
  };

  pruneCache(now);
  cache.set(cacheKey, { at: now, data: result });
  return { ...result, cacheHit: false };
}

/**
 * AOIs Skylight accesibles que intersectan el bbox operativo.
 */
export async function searchSkylightAois({ limit = 100 } = {}) {
  const lim = Math.min(Math.max(1, Number(limit) || 100), 200);
  const bbox = parseBbox();
  const polygon = bboxToPolygon(bbox);
  const cacheKey = JSON.stringify({ kind: "aois", lim, bbox });
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && now - hit.at < env.skylightCacheTtlMs) {
    return { ...hit.data, cacheHit: true };
  }

  const input = {
    intersectsGeometry: polygon,
    limit: lim,
    offset: 0,
    sortBy: "name",
    sortDirection: "asc",
  };

  const data = await skylightGraphql(SEARCH_AOIS_QUERY, { input });
  const aois = (data?.searchAOIs?.records || [])
    .map(normalizeAoi)
    .filter((a) => a.aoiId);

  const result = {
    aois,
    total: data?.searchAOIs?.meta?.total ?? aois.length,
    bbox,
    source: "skylight",
    fetchedAt: new Date(now).toISOString(),
  };

  pruneCache(now);
  cache.set(cacheKey, { at: now, data: result });
  return { ...result, cacheHit: false };
}

const GET_VESSEL_HISTORY_QUERY = `
query GetVesselHistory($input: GetVesselHistoryInput!) {
  getVesselHistory(input: $input) {
    records {
      mmsi
      history {
        source
        entries {
          id
          imo
          callSign
          vesselName
          vesselType
          flag
          lengthMeters
          widthMeters
          effectiveFrom
          effectiveTo
          isMostRecent
        }
      }
    }
  }
}
`;

const SEARCH_TRACK_SUBPATHS_QUERY = `
query SearchTrackSubpaths($input: SearchTrackSubpathsInput!) {
  searchTrackSubpaths(input: $input) {
    records {
      subpathId
      trackId
      mmsi
      meanSog
      cog
      numPositions
      startTime
      endTime
      startLocation { lat lon }
      endLocation { lat lon }
      pathGeometry {
        type
        coordinates
        geometries {
          type
          coordinates
        }
      }
      activityClassification
    }
    meta { total }
  }
}
`;

const PREDICT_VESSEL_LOCATIONS_QUERY = `
query PredictVesselLocations($input: VesselLocationPredictionInput!) {
  predictVesselLocations(input: $input) {
    records {
      trackId
      origin {
        trackId
        mmsi
        speedOverGround
        courseOverGround
        heading
        sentAt
        location { lat lon }
      }
      prediction {
        type
        coordinates
        geometries {
          type
          coordinates
        }
      }
    }
    meta { total }
  }
}
`;

const SEARCH_EVENTS_BY_VESSEL_QUERY = `
query SearchEventsByVessel($input: SearchEventsV2Input!) {
  searchEventsV2(input: $input) {
    records {
      eventId
      eventType
      start {
        time
        point { lat lon }
      }
      end {
        time
        point { lat lon }
      }
      vessels {
        vessel0 {
          vesselId
          name
          displayName
          mmsi
          imo
          length
          vesselType
          displayCountry
          countryCode
        }
        vessel1 {
          vesselId
          name
          displayName
          mmsi
          imo
          length
          vesselType
          displayCountry
          countryCode
        }
      }
      eventDetails {
        ... on ImageryMetadataEventDetails {
          detectionType
          score
          estimatedLength
          estimatedSpeedKts
          estimatedVesselCategory
          heading
          distanceToCoastM
          imageUrl
        }
        ... on ViirsEventDetails {
          detectionType
          estimatedLength
          heading
          radianceNw
          imageUrl
        }
        ... on FishingEventDetails {
          fishingScore
        }
        ... on DarkRendezvousEventDetails {
          osrScore
        }
        ... on AoiVisitEventDetails {
          entryHeading
          endHeading
          entrySpeed
        }
        ... on SpeedRangeEventDetails {
          averageSpeed
          distance
          durationSec
        }
      }
      aoiFeatureConfiguration {
        aoiId
        aoiName
        configId
      }
      createdAt
      updatedAt
    }
    meta { total }
  }
}
`;

function pathGeometryToLatLngs(geometry) {
  if (!geometry) return [];
  if (geometry.type === "LineString" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates
      .map((c) => {
        const lon = Number(c?.[0]);
        const lat = Number(c?.[1]);
        return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null;
      })
      .filter(Boolean);
  }
  if (
    geometry.type === "GeometryCollection" &&
    Array.isArray(geometry.geometries)
  ) {
    const pts = [];
    for (const g of geometry.geometries) {
      if (g?.type === "LineString") pts.push(...pathGeometryToLatLngs(g));
      if (g?.type === "Point" && Array.isArray(g.coordinates)) {
        const lon = Number(g.coordinates[0]);
        const lat = Number(g.coordinates[1]);
        if (Number.isFinite(lat) && Number.isFinite(lon)) pts.push([lat, lon]);
      }
    }
    return pts;
  }
  if (geometry.type === "Point" && Array.isArray(geometry.coordinates)) {
    const lon = Number(geometry.coordinates[0]);
    const lat = Number(geometry.coordinates[1]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return [[lat, lon]];
  }
  return [];
}

function normalizeTrackSubpath(raw) {
  const positions = pathGeometryToLatLngs(raw?.pathGeometry);
  if (positions.length < 2) {
    const sLat = Number(raw?.startLocation?.lat);
    const sLon = Number(raw?.startLocation?.lon);
    const eLat = Number(raw?.endLocation?.lat);
    const eLon = Number(raw?.endLocation?.lon);
    if (
      Number.isFinite(sLat) &&
      Number.isFinite(sLon) &&
      Number.isFinite(eLat) &&
      Number.isFinite(eLon)
    ) {
      positions.push([sLat, sLon], [eLat, eLon]);
    }
  }
  return {
    subpathId: raw.subpathId,
    trackId: raw.trackId ?? null,
    mmsi: raw.mmsi ?? null,
    meanSog: raw.meanSog ?? null,
    cog: raw.cog ?? null,
    numPositions: raw.numPositions ?? null,
    startTime: raw.startTime ?? null,
    endTime: raw.endTime ?? null,
    activityClassification: raw.activityClassification ?? null,
    positions,
  };
}

function predictionToLatLon(geometry) {
  if (!geometry) return null;
  if (geometry.type === "Point" && Array.isArray(geometry.coordinates)) {
    const lon = Number(geometry.coordinates[0]);
    const lat = Number(geometry.coordinates[1]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
  }
  const line = pathGeometryToLatLngs(geometry);
  if (line.length > 0) {
    const last = line[line.length - 1];
    return { lat: last[0], lon: last[1] };
  }
  return null;
}

/**
 * Dossier de buque: identidad + track + predicción + eventos Skylight relacionados.
 * @param {{
 *   mmsi: string|number,
 *   lat?: number,
 *   lon?: number,
 *   speedKts?: number,
 *   heading?: number,
 *   lookbackHours?: number,
 * }} opts
 */
export async function getSkylightVesselDossier({
  mmsi,
  lat,
  lon,
  speedKts,
  heading,
  lookbackHours = DEFAULT_LOOKBACK_HOURS,
} = {}) {
  const mmsiStr = String(mmsi ?? "").trim();
  if (!/^\d{5,9}$/.test(mmsiStr)) {
    throw httpError("MMSI inválido.");
  }
  const hours = Number(lookbackHours);
  if (!Number.isFinite(hours) || hours < 1 || hours > MAX_LOOKBACK_HOURS) {
    throw httpError(
      `Horizonte inválido (1–${MAX_LOOKBACK_HOURS} horas).`
    );
  }

  const now = Date.now();
  const endIso = new Date(now).toISOString();
  const startIso = new Date(now - hours * 3600_000).toISOString();
  const cacheKey = JSON.stringify({
    kind: "dossier",
    mmsi: mmsiStr,
    hours,
    lat: lat != null ? Number(lat).toFixed(3) : null,
    lon: lon != null ? Number(lon).toFixed(3) : null,
  });
  const hit = cache.get(cacheKey);
  if (hit && now - hit.at < env.skylightCacheTtlMs) {
    return { ...hit.data, cacheHit: true };
  }

  const warnings = [];

  let identity = null;
  try {
    const histData = await skylightGraphql(GET_VESSEL_HISTORY_QUERY, {
      input: { mmsi: { eq: mmsiStr } },
    });
    const rec = histData?.getVesselHistory?.records?.[0] || null;
    if (rec) {
      identity = {
        mmsi: String(rec.mmsi ?? mmsiStr),
        sources: (rec.history || []).map((h) => ({
          source: h.source ?? null,
          entries: (h.entries || []).map((e) => ({
            id: e.id ?? null,
            imo: e.imo ?? null,
            callSign: e.callSign ?? null,
            vesselName: e.vesselName ?? null,
            vesselType: e.vesselType ?? null,
            flag: e.flag ?? null,
            lengthMeters: e.lengthMeters ?? null,
            widthMeters: e.widthMeters ?? null,
            effectiveFrom: e.effectiveFrom ?? null,
            effectiveTo: e.effectiveTo ?? null,
            isMostRecent: Boolean(e.isMostRecent),
          })),
        })),
      };
    }
  } catch (e) {
    warnings.push(`Historial de identidad: ${e.message}`);
  }

  let tracks = [];
  try {
    const trackData = await skylightGraphql(SEARCH_TRACK_SUBPATHS_QUERY, {
      input: {
        mmsi: { eq: mmsiStr },
        startTime: { gte: startIso },
        endTime: { lte: endIso },
        limit: 40,
        sortBy: "start_time",
        sortDirection: "desc",
      },
    });
    tracks = (trackData?.searchTrackSubpaths?.records || [])
      .map(normalizeTrackSubpath)
      .filter((t) => t.positions.length >= 2);
  } catch (e) {
    warnings.push(`Track: ${e.message}`);
  }

  let prediction = null;
  try {
    /** @type {Record<string, unknown>} */
    const predInput = { method: "deadReckoning" };
    const obsLat = Number(lat);
    const obsLon = Number(lon);
    if (Number.isFinite(obsLat) && Number.isFinite(obsLon)) {
      predInput.latLon = { lat: obsLat, lon: obsLon };
      predInput.observationTime = endIso;
      if (Number.isFinite(Number(speedKts))) {
        predInput.speedKts = Number(speedKts);
      }
      if (Number.isFinite(Number(heading))) {
        predInput.directionOfTravelDegrees = Number(heading);
      }
    } else if (tracks[0]?.trackId) {
      predInput.trackId = { eq: tracks[0].trackId };
    } else {
      throw httpError("Sin posición ni track para predecir.", 400);
    }
    const predData = await skylightGraphql(PREDICT_VESSEL_LOCATIONS_QUERY, {
      input: predInput,
    });
    const rec = predData?.predictVesselLocations?.records?.[0] || null;
    if (rec) {
      const point = predictionToLatLon(rec.prediction);
      const predPath = pathGeometryToLatLngs(rec.prediction);
      prediction = {
        trackId: rec.trackId ?? null,
        lat: point?.lat ?? null,
        lon: point?.lon ?? null,
        path: predPath.length >= 2 ? predPath : null,
        origin: rec.origin
          ? {
              lat: rec.origin.location?.lat ?? null,
              lon: rec.origin.location?.lon ?? null,
              sentAt: rec.origin.sentAt ?? null,
              speedOverGround: rec.origin.speedOverGround ?? null,
              courseOverGround: rec.origin.courseOverGround ?? null,
              heading: rec.origin.heading ?? null,
            }
          : null,
      };
    }
  } catch (e) {
    warnings.push(`Predicción: ${e.message}`);
  }

  let relatedEvents = [];
  try {
    const eventTypes = [
      ...DETECTION_EVENT_TYPES,
      ...BEHAVIOR_EVENT_TYPES,
      ...AOI_EVENT_TYPES,
    ];
    const evData = await skylightGraphql(SEARCH_EVENTS_BY_VESSEL_QUERY, {
      input: {
        eventType: { inc: [...eventTypes] },
        startTime: { gte: startIso, lte: endIso },
        vesselMain: { mmsi: { eq: mmsiStr } },
        limit: 50,
        offset: 0,
        sortBy: "created",
        sortDirection: "desc",
      },
    });
    relatedEvents = (evData?.searchEventsV2?.records || [])
      .map(normalizeEvent)
      .filter((e) => e.lat != null && e.lon != null);
  } catch (e) {
    warnings.push(`Eventos relacionados: ${e.message}`);
  }

  const recentName =
    identity?.sources
      ?.flatMap((s) => s.entries || [])
      .find((e) => e.isMostRecent)?.vesselName ||
    identity?.sources?.[0]?.entries?.[0]?.vesselName ||
    null;

  const result = {
    mmsi: mmsiStr,
    name: recentName,
    lookbackHours: hours,
    identity,
    tracks,
    prediction,
    relatedEvents,
    warnings,
    source: "skylight",
    fetchedAt: new Date(now).toISOString(),
  };

  pruneCache(now);
  cache.set(cacheKey, { at: now, data: result });
  return { ...result, cacheHit: false };
}

const SEARCH_LAST_KNOWN_POSITIONS_QUERY = `
query SearchLastKnownPositions($input: SearchLastKnownPositionsInput) {
  searchLastKnownPositions(input: $input) {
    records {
      trackId
      mmsi
      speedOverGround
      courseOverGround
      location {
        lat
        lon
      }
      sentAt
      receivedAt
      heading
      navigationStatus
      aisClass
      ageOfPositionSeconds
      updatedAt
    }
    meta {
      total
      snapshotId
    }
  }
}
`;

/** @type {Map<string, { at: number, data: object }>} */
const identityCache = new Map();
const IDENTITY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_IDENTITY_CACHE = 2_000;

function pointLatLon(loc) {
  if (!loc || typeof loc !== "object") return { lat: NaN, lon: NaN };
  let lat = Number(loc.lat);
  let lon = Number(loc.lon);
  if (
    (!Number.isFinite(lat) || !Number.isFinite(lon)) &&
    Array.isArray(loc.coordinates) &&
    loc.coordinates.length >= 2
  ) {
    lon = Number(loc.coordinates[0]);
    lat = Number(loc.coordinates[1]);
  }
  return { lat, lon };
}

function normalizeLastKnownPosition(raw) {
  if (!raw || typeof raw !== "object") return null;
  const mmsi = String(raw.mmsi ?? "").trim();
  if (!/^\d{5,9}$/.test(mmsi)) return null;
  const { lat, lon } = pointLatLon(raw.location);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const heading = Number(raw.heading);
  const sog = Number(raw.speedOverGround);
  const cog = Number(raw.courseOverGround);
  const navStatus = Number(raw.navigationStatus);
  const ageSec = Number(raw.ageOfPositionSeconds);

  let aisClass = null;
  if (raw.aisClass === "A" || raw.aisClass === "a" || raw.aisClass === "CLASS_A") {
    aisClass = "A";
  } else if (
    raw.aisClass === "B" ||
    raw.aisClass === "b" ||
    raw.aisClass === "CLASS_B"
  ) {
    aisClass = "B";
  }

  return {
    mmsi,
    lat,
    lon,
    sog: Number.isFinite(sog) ? sog : null,
    cog: Number.isFinite(cog) ? cog : null,
    heading:
      Number.isFinite(heading) && heading !== 511 ? heading : null,
    navStatus: Number.isFinite(navStatus) ? navStatus : null,
    aisClass,
    sentAt: raw.sentAt || null,
    receivedAt: raw.receivedAt || null,
    ageOfPositionSeconds: Number.isFinite(ageSec) ? ageSec : null,
    trackId: raw.trackId || null,
    source: "skylight",
  };
}

/**
 * Últimas posiciones AIS conocidas en el bbox Skylight (para reforzar capa AIS).
 * @param {{ limit?: number }} [opts]
 */
export async function searchSkylightLastKnownPositions({ limit = 400 } = {}) {
  if (!isSkylightConfigured()) {
    throw httpError(
      "Skylight no está configurado. Falta SKYLIGHT_API_KEY.",
      503
    );
  }

  const lim = Math.min(Math.max(1, Number(limit) || 400), MAX_LIMIT);
  const bbox = parseBbox();
  const polygon = bboxToPolygon(bbox);
  const cacheKey = `lastKnown|${bbox.join(",")}|${lim}`;
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && now - hit.at < env.skylightCacheTtlMs) {
    return { ...hit.data, cacheHit: true };
  }

  const input = {
    intersectsGeometry: polygon,
    limit: lim,
    offset: 0,
    sortBy: "sentAt",
    sortDirection: "desc",
  };

  const data = await skylightGraphql(SEARCH_LAST_KNOWN_POSITIONS_QUERY, {
    input,
  });
  const vessels = (data?.searchLastKnownPositions?.records || [])
    .map(normalizeLastKnownPosition)
    .filter(Boolean);

  const result = {
    vessels,
    total: data?.searchLastKnownPositions?.meta?.total ?? vessels.length,
    bbox,
    source: "skylight",
    fetchedAt: new Date(now).toISOString(),
  };

  pruneCache(now);
  cache.set(cacheKey, { at: now, data: result });
  return { ...result, cacheHit: false };
}

function pruneIdentityCache(now) {
  for (const [key, entry] of identityCache) {
    if (now - entry.at > IDENTITY_TTL_MS) identityCache.delete(key);
  }
  while (identityCache.size > MAX_IDENTITY_CACHE) {
    const first = identityCache.keys().next().value;
    identityCache.delete(first);
  }
}

const GET_VESSEL_BY_MMSI_QUERY = `
query VesselByMmsi($mmsi: Int) {
  vessel(mmsi: $mmsi) {
    mmsi
    name
    imo
    call_sign
    flag
    vessel_type
    length
  }
}
`;

/**
 * Identidad estática de un buque (nombre, OMI, indicativo, bandera) vía query vessel(mmsi).
 * Preferimos esto a getVesselHistory: más liviano y evita errores de schema en authorizations.
 * @param {string|number} mmsi
 */
export async function getSkylightVesselIdentity(mmsi) {
  const mmsiStr = String(mmsi ?? "").trim();
  if (!/^\d{5,9}$/.test(mmsiStr)) {
    throw httpError("MMSI inválido.", 400);
  }

  const now = Date.now();
  pruneIdentityCache(now);
  const hit = identityCache.get(mmsiStr);
  if (hit && now - hit.at < IDENTITY_TTL_MS) {
    return { ...hit.data, cacheHit: true };
  }

  const mmsiNum = Number(mmsiStr);
  const data = await skylightGraphql(GET_VESSEL_BY_MMSI_QUERY, {
    mmsi: mmsiNum,
  });
  const rec = data?.vessel || null;

  let name = rec?.name ? String(rec.name).trim() : null;
  let imo = null;
  if (rec?.imo != null) {
    const n = Number(rec.imo);
    if (Number.isFinite(n) && n > 0) imo = n;
  }
  let callsign = rec?.call_sign ? String(rec.call_sign).trim() : null;
  let flag = rec?.flag ? String(rec.flag).trim() : null;
  let shipType = rec?.vessel_type ? String(rec.vessel_type).trim() : null;
  let length = null;
  if (rec?.length != null) {
    const n = Number(rec.length);
    if (Number.isFinite(n)) length = n;
  }

  /* Fallback: historial si vessel() no devolvió identidad útil. */
  if (!name && imo == null) {
    try {
      const histData = await skylightGraphql(GET_VESSEL_HISTORY_QUERY, {
        input: { mmsi: { eq: mmsiStr } },
      });
      const histRec = histData?.getVesselHistory?.records?.[0] || null;
      const sources = Array.isArray(histRec?.history) ? histRec.history : [];
      for (const src of sources) {
        const entries = Array.isArray(src?.entries) ? src.entries : [];
        const recent =
          entries.find((e) => e?.isMostRecent) || entries[0] || null;
        if (!recent) continue;
        if (!name && recent.vesselName) name = String(recent.vesselName).trim();
        if (imo == null && recent.imo != null) {
          const n = Number(recent.imo);
          if (Number.isFinite(n) && n > 0) imo = n;
        }
        if (!callsign && recent.callSign) {
          callsign = String(recent.callSign).trim();
        }
        if (!flag && recent.flag) flag = String(recent.flag).trim();
        if (!shipType && recent.vesselType) {
          shipType = String(recent.vesselType).trim();
        }
        if (length == null && recent.lengthMeters != null) {
          const n = Number(recent.lengthMeters);
          if (Number.isFinite(n)) length = n;
        }
      }
    } catch {
      /* getVesselHistory a veces falla por authorizations corruptos en Skylight */
    }
  }

  const identity = {
    mmsi: mmsiStr,
    name: name || null,
    imo,
    callsign: callsign || null,
    flag: flag || null,
    shipType: shipType || null,
    length,
    source: "skylight",
  };

  identityCache.set(mmsiStr, { at: now, data: identity });
  return { ...identity, cacheHit: false };
}
