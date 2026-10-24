import { GfwEventsMongoose } from "../DAO/models/mongoose/gfwEvents.mongoose.js";
import env from "../config/env.config.js";

function httpError(msg, status = 400) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

function parseBbox(raw) {
  if (Array.isArray(raw) && raw.length === 4 && raw.every(Number.isFinite)) {
    return raw.map(Number);
  }
  if (typeof raw === "string" && raw.trim()) {
    const parts = raw.split(",").map((s) => Number(s.trim()));
    if (parts.length === 4 && parts.every(Number.isFinite)) return parts;
  }
  const fallback = (env.aisBbox || "").trim();
  if (fallback) {
    const parts = fallback.split(",").map((s) => Number(s.trim()));
    if (parts.length === 4 && parts.every(Number.isFinite)) return parts;
  }
  return [-38.5, -61.0, -30.5, -50.5];
}

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

/**
 * Busca eventos GFW en el área configurada.
 * @param {{
 *   eventTypes?: string[],
 *   bbox?: number[]|string,
 *   limit?: number,
 * }} opts
 */
export async function searchGfwEvents({
  eventTypes = [],
  bbox,
  limit = 200,
} = {}) {
  const types = [...new Set((eventTypes || []).map(String))].filter((t) =>
    ["fishing", "encounter", "gap"].includes(t)
  );

  if (!types.length) {
    return {
      events: [],
      total: 0,
      eventTypes: [],
      source: "gfw",
      fetchedAt: new Date().toISOString(),
    };
  }

  const box = parseBbox(bbox);
  const polygon = bboxToPolygon(box);
  const lim = Math.min(Math.max(1, Number(limit) || 200), 500);

  const filter = {
    eventType: { $in: types },
    location: {
      $geoWithin: {
        $geometry: polygon,
      },
    },
  };

  const events = await GfwEventsMongoose.find(filter)
    .sort({ startTime: -1 })
    .limit(lim)
    .lean();

  const total = await GfwEventsMongoose.countDocuments(filter);

  return {
    events,
    total,
    eventTypes: types,
    bbox: box,
    source: "gfw",
    license: "CC BY-NC 4.0",
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Verifica si GFW está configurado.
 */
export function isGfwConfigured() {
  return Boolean(env.gfwApiToken?.trim());
}

/**
 * Estado de la integración GFW.
 */
export async function getGfwStatus() {
  const configured = isGfwConfigured();

  let lastFetchDate = null;
  let totalEvents = 0;

  if (configured) {
    try {
      const latest = await GfwEventsMongoose.findOne()
        .sort({ fetchedAt: -1 })
        .select("fetchedAt")
        .lean();

      lastFetchDate = latest?.fetchedAt || null;
      totalEvents = await GfwEventsMongoose.countDocuments();
    } catch {
      /* ignorar errores de DB */
    }
  }

  return {
    configured,
    available: configured,
    lastFetchDate,
    totalEvents,
    source: "gfw",
    license: "CC BY-NC 4.0",
  };
}
