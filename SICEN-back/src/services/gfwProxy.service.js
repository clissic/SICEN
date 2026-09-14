import env from "../config/env.config.js";
import { logger } from "../utils/logger.js";

const GFW_BASE = "https://gateway.api.globalfishingwatch.org/v3";
const IDENTITY_DATASET = "public-global-vessel-identity:latest";

/** @type {Map<string, { at: number, data: object }>} */
const identityCache = new Map();
const NEGATIVE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_IDENTITY_CACHE = 4_000;
/** Tras 401/403, no martillar la API (ms). */
const AUTH_COOLDOWN_MS = 30 * 60 * 1000;

/** @type {{ until: number, status: number, detail: string } | null} */
let authCooldown = null;

function identityTtlMs() {
  const n = Number(env.gfwIdentityCacheTtlMs);
  return Number.isFinite(n) && n > 0 ? n : 7 * 24 * 60 * 60 * 1000;
}

function httpError(msg, status = 400) {
  const err = new Error(msg);
  err.status = status;
  return err;
}

export function isGfwConfigured() {
  return Boolean(env.gfwApiToken?.trim());
}

/** Token presente y sin cooldown de auth (401/403 reciente). */
export function isGfwAvailable() {
  if (!isGfwConfigured()) return false;
  if (authCooldown && Date.now() < authCooldown.until) return false;
  return true;
}

export function getGfwStatus() {
  return {
    configured: isGfwConfigured(),
    available: isGfwAvailable(),
    authCooldown: authCooldown
      ? {
          until: new Date(authCooldown.until).toISOString(),
          status: authCooldown.status,
          detail: authCooldown.detail,
        }
      : null,
    source: "gfw",
    license: "non-commercial",
  };
}

/**
 * GFW exige `datasets[0]=…` en query; `datasets=` suelto suele devolver 403.
 * @param {URLSearchParams} qs
 * @param {string|string[]} datasets
 */
function appendDatasetsParam(qs, datasets) {
  const list = Array.isArray(datasets) ? datasets : [datasets];
  list.forEach((ds, i) => {
    if (ds) qs.append(`datasets[${i}]`, ds);
  });
}

async function readGfwErrorDetail(res) {
  try {
    const text = await res.text();
    if (!text) return "";
    try {
      const json = JSON.parse(text);
      const msg =
        json?.message ||
        json?.error ||
        json?.messages?.[0]?.detail ||
        json?.messages?.[0]?.title;
      if (msg) return String(msg);
    } catch {
      /* texto plano */
    }
    return text.slice(0, 180);
  } catch {
    return "";
  }
}

function markAuthFailure(status, detail) {
  const wasActive = authCooldown && Date.now() < authCooldown.until;
  authCooldown = {
    until: Date.now() + AUTH_COOLDOWN_MS,
    status,
    detail: detail || "",
  };
  if (!wasActive) {
    logger.warning(
      `GFW auth ${status}: ${detail || "sin detalle"}. Enriquecimiento pausado ${Math.round(AUTH_COOLDOWN_MS / 60_000)} min.`
    );
  }
}

function clearAuthCooldown() {
  authCooldown = null;
}

function assertGfwReady() {
  if (!isGfwConfigured()) {
    throw httpError(
      "Global Fishing Watch no está configurado. Falta GFW_API_TOKEN.",
      503
    );
  }
  if (authCooldown && Date.now() < authCooldown.until) {
    throw httpError(
      `GFW en pausa por auth (${authCooldown.status}): ${authCooldown.detail || "token/permiso"}`,
      authCooldown.status
    );
  }
}

async function throwIfGfwAuthFailed(res) {
  if (res.status !== 401 && res.status !== 403) return;
  const detail = await readGfwErrorDetail(res);
  markAuthFailure(res.status, detail);
  throw httpError(
    `GFW: ${res.status === 401 ? "token inválido" : "sin permiso"}${detail ? ` (${detail})` : ""}.`,
    res.status
  );
}

function pruneIdentityCache(now) {
  const positiveTtl = identityTtlMs();
  for (const [key, entry] of identityCache) {
    const ttl = entry.data?.found === false ? NEGATIVE_TTL_MS : positiveTtl;
    if (now - entry.at > ttl) identityCache.delete(key);
  }
  while (identityCache.size > MAX_IDENTITY_CACHE) {
    const first = identityCache.keys().next().value;
    identityCache.delete(first);
  }
}

function parseImo(raw) {
  if (raw == null || raw === "" || raw === "0" || raw === 0) return null;
  const n = Number(String(raw).replace(/\D/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  /* OMI válido: 7 dígitos. */
  if (n < 1000000 || n > 9999999) return null;
  return n;
}

function pickLatest(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const preferred = list.find((x) => x?.latestVesselInfo) || list[0];
  return preferred || null;
}

/**
 * Elige el mejor registro del entry GFW que coincida con el MMSI.
 * @param {object} entry
 * @param {string} mmsi
 */
function extractIdentityFromEntry(entry, mmsi) {
  const registry = Array.isArray(entry?.registryInfo) ? entry.registryInfo : [];
  const selfRep = Array.isArray(entry?.selfReportedInfo)
    ? entry.selfReportedInfo
    : [];

  const matchSsvid = (row) => String(row?.ssvid ?? "").trim() === mmsi;
  const regExact = registry.filter(matchSsvid);
  const selfExact = selfRep.filter(matchSsvid);
  const reg = pickLatest(regExact.length ? regExact : registry);
  const self = pickLatest(selfExact.length ? selfExact : selfRep);

  const imo = parseImo(reg?.imo) ?? parseImo(self?.imo);
  const name =
    (reg?.shipname && String(reg.shipname).trim()) ||
    (self?.shipname && String(self.shipname).trim()) ||
    null;
  const callsign =
    (reg?.callsign && String(reg.callsign).trim()) ||
    (self?.callsign && String(self.callsign).trim()) ||
    null;
  const flag =
    (reg?.flag && String(reg.flag).trim()) ||
    (self?.flag && String(self.flag).trim()) ||
    null;

  let shipType = null;
  const types = Array.isArray(entry?.combinedSourcesInfo?.[0]?.shiptypes)
    ? entry.combinedSourcesInfo[0].shiptypes
    : [];
  if (types.length) {
    const names = types
      .map((t) => t?.name)
      .filter(Boolean)
      .map((s) => String(s).trim());
    if (names.length) shipType = names.join(" / ");
  } else if (Array.isArray(reg?.geartypes) && reg.geartypes.length) {
    shipType = reg.geartypes.map(String).join(" / ");
  }

  let length = null;
  if (reg?.lengthM != null) {
    const n = Number(reg.lengthM);
    if (Number.isFinite(n)) length = n;
  }

  return {
    mmsi,
    name,
    imo,
    callsign,
    flag,
    shipType,
    length,
    vesselId:
      self?.id ||
      reg?.vesselInfoReference ||
      null,
    found: Boolean(name || imo || callsign || flag),
    source: "gfw",
  };
}

/**
 * Identidad estática vía Global Fishing Watch (MMSI → OMI/nombre/…).
 * Uso no comercial / analítico según licencia GFW.
 * @param {string|number} mmsi
 */
export async function getGfwVesselIdentity(mmsi) {
  const mmsiStr = String(mmsi ?? "").trim();
  if (!/^\d{5,9}$/.test(mmsiStr)) {
    throw httpError("MMSI inválido.", 400);
  }
  if (!isGfwConfigured()) {
    throw httpError(
      "Global Fishing Watch no está configurado. Falta GFW_API_TOKEN.",
      503
    );
  }
  assertGfwReady();

  const now = Date.now();
  pruneIdentityCache(now);
  const hit = identityCache.get(mmsiStr);
  if (hit) {
    const ttl = hit.data?.found === false ? NEGATIVE_TTL_MS : identityTtlMs();
    if (now - hit.at < ttl) {
      return { ...hit.data, cacheHit: true };
    }
  }

  const url = new URL(`${GFW_BASE}/vessels/search`);
  url.searchParams.set("query", mmsiStr);
  url.searchParams.set("limit", "10");
  appendDatasetsParam(url.searchParams, IDENTITY_DATASET);

  let res;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.gfwApiToken.trim()}`,
        Accept: "application/json",
      },
    });
  } catch (e) {
    throw httpError(`GFW red: ${e?.message || e}`, 502);
  }

  await throwIfGfwAuthFailed(res);
  if (res.status === 429) {
    throw httpError("GFW: rate limit excedido.", 429);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw httpError(
      `GFW HTTP ${res.status}${text ? `: ${text.slice(0, 180)}` : ""}`,
      res.status >= 500 ? 502 : res.status
    );
  }

  clearAuthCooldown();
  const data = await res.json();
  const entries = Array.isArray(data?.entries) ? data.entries : [];

  let best = {
    mmsi: mmsiStr,
    name: null,
    imo: null,
    callsign: null,
    flag: null,
    shipType: null,
    length: null,
    found: false,
    source: "gfw",
  };

  for (const entry of entries) {
    const id = extractIdentityFromEntry(entry, mmsiStr);
    /* Preferir filas que matchean el MMSI y traen OMI. */
    const exactSsvid =
      (Array.isArray(entry?.registryInfo) &&
        entry.registryInfo.some((r) => String(r?.ssvid) === mmsiStr)) ||
      (Array.isArray(entry?.selfReportedInfo) &&
        entry.selfReportedInfo.some((r) => String(r?.ssvid) === mmsiStr));
    if (!id.found && !exactSsvid) continue;
    if (!best.found) best = id;
    if (exactSsvid && id.imo != null) {
      best = id;
      break;
    }
    if (exactSsvid && (!best.imo || id.imo)) best = id;
  }

  identityCache.set(mmsiStr, { at: now, data: best });
  return { ...best, cacheHit: false, vesselId: best.vesselId || null };
}

const EVENT_DATASETS = {
  fishing: "public-global-fishing-events:latest",
  encounter: "public-global-encounters-events:latest",
  gap: "public-global-gaps-events:latest",
};

const ALLOWED_EVENT_TYPES = new Set(Object.keys(EVENT_DATASETS));

/** @type {Map<string, { at: number, data: object }>} */
const eventsCache = new Map();
const MAX_EVENTS_CACHE = 48;

function eventsCacheTtlMs() {
  const n = Number(env.gfwEventsCacheTtlMs);
  return Number.isFinite(n) && n > 0 ? n : 300_000;
}

function pruneEventsCache(now) {
  const ttl = eventsCacheTtlMs();
  for (const [key, entry] of eventsCache) {
    if (now - entry.at > ttl) eventsCache.delete(key);
  }
  while (eventsCache.size > MAX_EVENTS_CACHE) {
    const first = eventsCache.keys().next().value;
    eventsCache.delete(first);
  }
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
  return [-36.0, -58.8, -33.8, -54.5];
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

function normalizeGfwVessel(v) {
  if (!v || typeof v !== "object") return null;
  return {
    id: v.id || null,
    name: v.name ? String(v.name).trim() : null,
    mmsi: v.ssvid != null ? String(v.ssvid) : null,
    flag: v.flag ? String(v.flag).trim() : null,
    type: v.type ? String(v.type).trim() : null,
  };
}

function normalizeGfwEvent(raw, eventType) {
  if (!raw || typeof raw !== "object") return null;
  const lat = Number(raw.position?.lat);
  const lon = Number(raw.position?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const vessel = normalizeGfwVessel(raw.vessel);
  const encounterVessel = normalizeGfwVessel(
    raw.encounter?.vessel || raw.encounter?.counterpart
  );
  return {
    eventId: String(raw.id || `${eventType}:${lat},${lon}:${raw.start}`),
    eventType,
    startTime: raw.start || null,
    endTime: raw.end || null,
    lat,
    lon,
    vessel,
    secondVessel: encounterVessel,
    encounterType: raw.encounter?.type || null,
    distances: raw.distances || null,
    regions: raw.regions || null,
    source: "gfw",
  };
}

async function gfwFetch(path, { method = "GET", body } = {}) {
  assertGfwReady();
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${env.gfwApiToken.trim()}`,
      Accept: "application/json",
    },
  };
  if (body != null) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`${GFW_BASE}${path}`, opts);
  } catch (e) {
    throw httpError(`GFW red: ${e?.message || e}`, 502);
  }
  await throwIfGfwAuthFailed(res);
  if (res.status === 429) {
    throw httpError("GFW: rate limit excedido.", 429);
  }
  /* 201 = OK con cuerpo (events). */
  if (!res.ok && res.status !== 201) {
    const text = await res.text().catch(() => "");
    throw httpError(
      `GFW HTTP ${res.status}${text ? `: ${text.slice(0, 180)}` : ""}`,
      res.status >= 500 ? 502 : res.status
    );
  }
  clearAuthCooldown();
  return res.json();
}

/**
 * Eventos GFW en un bbox (pesca / encounters / gaps).
 * @param {{ eventTypes?: string[], bbox?: number[]|string, lookbackDays?: number, limit?: number }} opts
 */
export async function searchGfwEvents({
  eventTypes = [],
  bbox,
  lookbackDays = 14,
  limit = 200,
} = {}) {
  const types = [...new Set((eventTypes || []).map(String))].filter((t) =>
    ALLOWED_EVENT_TYPES.has(t)
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
  const days = Math.min(Math.max(1, Number(lookbackDays) || 14), 90);
  const lim = Math.min(Math.max(1, Number(limit) || 200), 500);
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  const geometry = bboxToPolygon(box);

  const cacheKey = `ev|${types.sort().join(",")}|${box.join(",")}|${startDate}|${endDate}|${lim}`;
  const now = Date.now();
  pruneEventsCache(now);
  const hit = eventsCache.get(cacheKey);
  if (hit && now - hit.at < eventsCacheTtlMs()) {
    return { ...hit.data, cacheHit: true };
  }

  const perType = Math.max(5, Math.ceil(lim / types.length));
  const all = [];
  for (const type of types) {
    const dataset = EVENT_DATASETS[type];
    const data = await gfwFetch(`/events?offset=0&limit=${perType}`, {
      method: "POST",
      body: {
        datasets: [dataset],
        startDate,
        endDate,
        geometry,
      },
    });
    const entries = Array.isArray(data?.entries) ? data.entries : [];
    for (const raw of entries) {
      const ev = normalizeGfwEvent(raw, type);
      if (ev) all.push(ev);
    }
  }

  const result = {
    events: all.slice(0, lim),
    total: all.length,
    eventTypes: types,
    bbox: box,
    dateRange: { from: startDate, to: endDate },
    datasetVersions: types.map((t) => EVENT_DATASETS[t]),
    source: "gfw",
    license: "CC BY-NC 4.0",
    fetchedAt: new Date(now).toISOString(),
  };
  eventsCache.set(cacheKey, { at: now, data: result });
  return { ...result, cacheHit: false };
}

/**
 * Resuelve vesselId GFW + insights de riesgo (gaps / autorizaciones).
 * @param {string|number} mmsi
 */
export async function getGfwVesselInsights(mmsi) {
  const mmsiStr = String(mmsi ?? "").trim();
  if (!/^\d{5,9}$/.test(mmsiStr)) {
    throw httpError("MMSI inválido.", 400);
  }

  const qs = new URLSearchParams();
  qs.set("query", mmsiStr);
  qs.set("limit", "5");
  appendDatasetsParam(qs, IDENTITY_DATASET);
  const search = await gfwFetch(`/vessels/search?${qs.toString()}`);
  const entry = (search?.entries || []).find((e) => {
    const regs = e?.registryInfo || [];
    const selfs = e?.selfReportedInfo || [];
    return (
      regs.some((r) => String(r?.ssvid) === mmsiStr) ||
      selfs.some((r) => String(r?.ssvid) === mmsiStr)
    );
  }) || search?.entries?.[0];

  const vesselId =
    entry?.selfReportedInfo?.find((s) => String(s?.ssvid) === mmsiStr)?.id ||
    entry?.selfReportedInfo?.[0]?.id ||
    entry?.registryInfo?.[0]?.vesselInfoReference ||
    null;

  const identity = entry
    ? extractIdentityFromEntry(entry, mmsiStr)
    : {
        mmsi: mmsiStr,
        name: null,
        imo: null,
        callsign: null,
        flag: null,
        shipType: null,
        found: false,
      };

  if (!vesselId) {
    return {
      mmsi: mmsiStr,
      vesselId: null,
      identity,
      insights: null,
      source: "gfw",
    };
  }

  const end = new Date();
  const start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
  let insights = null;
  try {
    insights = await gfwFetch("/insights/vessels", {
      method: "POST",
      body: {
        includes: ["GAP"],
        confidences: [],
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        vessels: [
          {
            datasetId: IDENTITY_DATASET,
            vesselId,
          },
        ],
      },
    });
  } catch {
    insights = null;
  }

  return {
    mmsi: mmsiStr,
    vesselId,
    identity,
    insights,
    source: "gfw",
    license: "CC BY-NC 4.0",
  };
}
