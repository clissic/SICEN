import WebSocket from "ws";
import env from "../config/env.config.js";
import { logger } from "../utils/logger.js";
import {
  getGfwVesselIdentity,
  isGfwAvailable,
  isGfwConfigured,
} from "./gfwProxy.service.js";
import {
  getSkylightVesselIdentity,
  isSkylightConfigured,
  searchSkylightLastKnownPositions,
} from "./skylightProxy.service.js";

/** TTL de posiciones sin actualizar (ms). */
const VESSEL_TTL_MS = 30 * 60 * 1000;
/** Reintento de conexión upstream (ms). */
const RECONNECT_MS = 8_000;
/** Poll Skylight last-known (ms). */
const SKYLIGHT_POLL_MS = 90_000;
/** Poll enriquecimiento identidad (Skylight + GFW). */
const IDENTITY_POLL_MS = 90_000;
/** Si AISStream actualizó hace menos que esto, no pisar posición con Skylight. */
const AISSTREAM_FRESH_MS = 5 * 60 * 1000;
/** Identidades a enriquecer por ciclo de poll. */
const IDENTITY_ENRICH_PER_POLL = 16;
const IDENTITY_CONCURRENCY = 3;

const POSITION_TYPES = new Set([
  "PositionReport",
  "StandardClassBPositionReport",
  "ExtendedClassBPositionReport",
]);

/**
 * Fuente AIS abstracta: AISStream + Skylight last-known + identidad GFW.
 * Posiciones alimentan el mismo store / fan-out SSE; GFW solo rellena OMI/nombre.
 */
const vessels = new Map();
/** @type {Set<import("express").Response>} */
const sseClients = new Set();

/** @type {import("ws").WebSocket | null} */
let upstream = null;
let reconnectTimer = null;
let pruneTimer = null;
let skylightPollTimer = null;
let identityPollTimer = null;
let skylightPollInFlight = false;
let identityPollInFlight = false;
let intentionalClose = false;
let msgCount = 0;
let lastStatsLogAt = 0;
let skylightLastOkAt = 0;
let skylightLastError = null;
let skylightVesselCount = 0;
let gfwEnrichOk = 0;
let gfwEnrichMiss = 0;
let gfwLastError = null;

function parseBbox() {
  const raw = (env.aisBbox || "").trim();
  if (raw) {
    const parts = raw.split(",").map((s) => Number(s.trim()));
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [latMin, lonMin, latMax, lonMax] = parts;
      return [
        [
          [latMin, lonMin],
          [latMax, lonMax],
        ],
      ];
    }
    logger.warning(
      "AIS_BBOX inválido (esperado latMin,lonMin,latMax,lonMax). Usando bbox por defecto."
    );
  }
  /* Río de la Plata (incluye BA: AISStream casi no cubre solo Montevideo). */
  return [
    [
      [-36.0, -58.8],
      [-33.8, -54.5],
    ],
  ];
}

function isAisStreamConfigured() {
  return Boolean(env.aisStreamApiKey?.trim());
}

function isConfigured() {
  return isAisStreamConfigured() || isSkylightConfigured();
}

function metaCoord(meta, keyCap, keyLow) {
  const v = meta?.[keyCap] ?? meta?.[keyLow];
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * @param {object} partial
 * @param {{ from?: "aisstream"|"skylight"|"identity" }} [opts]
 */
function upsertVessel(partial, { from } = {}) {
  const mmsi = String(partial.mmsi || "").trim();
  if (!mmsi) return null;
  const prev = vessels.get(mmsi) || { mmsi };
  const now = Date.now();
  const cleaned = {};
  for (const [k, v] of Object.entries(partial)) {
    if (v !== undefined) cleaned[k] = v;
  }

  const sources = {
    ...(prev.sources || {}),
    ...(cleaned.sources || {}),
  };
  if (from === "aisstream") sources.aisstream = true;
  if (from === "skylight") sources.skylight = true;

  let next = {
    ...prev,
    ...cleaned,
    mmsi,
    sources,
  };

  if (from === "aisstream") {
    next.aisstreamAt = now;
    next.positionSource = "aisstream";
  }

  if (from === "skylight") {
    const aisFresh =
      prev.aisstreamAt && now - prev.aisstreamAt < AISSTREAM_FRESH_MS;
    if (aisFresh && prev.positionSource === "aisstream") {
      // Conservar cinemática fresca de AISStream; solo rellenar huecos de identidad.
      next = {
        ...prev,
        sources,
        name: prev.name || cleaned.name || undefined,
        imo: prev.imo != null ? prev.imo : cleaned.imo,
        callsign: prev.callsign || cleaned.callsign || undefined,
        flag: prev.flag || cleaned.flag || undefined,
        shipType: prev.shipType ?? cleaned.shipType ?? null,
        aisClass: prev.aisClass || cleaned.aisClass || undefined,
        sentAt: cleaned.sentAt ?? prev.sentAt,
        ageOfPositionSeconds:
          cleaned.ageOfPositionSeconds ?? prev.ageOfPositionSeconds,
        skylightAt: now,
      };
    } else {
      next.skylightAt = now;
      next.positionSource = "skylight";
    }
  }

  if (from === "identity") {
    next = {
      ...prev,
      sources,
      name: cleaned.name || prev.name || undefined,
      imo:
        cleaned.imo != null && Number(cleaned.imo) > 0
          ? cleaned.imo
          : prev.imo,
      callsign: cleaned.callsign || prev.callsign || undefined,
      flag: cleaned.flag || prev.flag || undefined,
      shipType: cleaned.shipType ?? prev.shipType ?? null,
    };
  }

  next.updatedAt = now;

  if (
    typeof next.lat !== "number" ||
    typeof next.lon !== "number" ||
    !Number.isFinite(next.lat) ||
    !Number.isFinite(next.lon)
  ) {
    vessels.set(mmsi, next);
    return null;
  }
  vessels.set(mmsi, next);
  return next;
}

function applyPosition(type, msg, meta, mmsi) {
  const body = msg?.Message?.[type] || {};
  const lat =
    typeof body.Latitude === "number"
      ? body.Latitude
      : metaCoord(meta, "Latitude", "latitude");
  const lon =
    typeof body.Longitude === "number"
      ? body.Longitude
      : metaCoord(meta, "Longitude", "longitude");
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

  const vessel = upsertVessel(
    {
      mmsi,
      lat,
      lon,
      cog: typeof body.Cog === "number" ? body.Cog : null,
      sog: typeof body.Sog === "number" ? body.Sog : null,
      heading:
        typeof body.TrueHeading === "number" && body.TrueHeading !== 511
          ? body.TrueHeading
          : null,
      navStatus:
        typeof body.NavigationalStatus === "number"
          ? body.NavigationalStatus
          : null,
      name: (meta.ShipName || meta.shipName || "").trim() || undefined,
      aisClass: type === "PositionReport" ? "A" : "B",
    },
    { from: "aisstream" }
  );
  if (vessel) broadcast("update", vessel);
}

function handleUpstreamMessage(raw) {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    return;
  }

  const type = msg?.MessageType;
  if (type === "SubscriptionConfirmation") {
    logger.info(
      `AISStream: suscripción OK (deflate=${Boolean(
        msg?.Message?.CompressionEnabled
      )}) bbox=${JSON.stringify(parseBbox())}`
    );
    broadcast("status", getAisStatus());
    return;
  }

  msgCount += 1;
  const now = Date.now();
  if (now - lastStatsLogAt > 30_000) {
    lastStatsLogAt = now;
    logger.info(
      `AISStream: ${msgCount} msgs recibidos · ${vessels.size} buques en cache · ${sseClients.size} clientes SSE`
    );
  }

  const meta = msg?.MetaData || {};
  const mmsi = meta.MMSI ?? meta.mmsi;
  if (mmsi == null) return;

  if (POSITION_TYPES.has(type)) {
    applyPosition(type, msg, meta, mmsi);
    return;
  }

  if (type === "ShipStaticData") {
    const sd = msg?.Message?.ShipStaticData || {};
    const name = (sd.Name || meta.ShipName || "").trim();
    const patch = {
      mmsi,
      name: name || undefined,
      shipType: typeof sd.Type === "number" ? sd.Type : null,
      callsign: (sd.CallSign || "").trim() || undefined,
      imo: sd.ImoNumber ?? null,
    };
    const metaLat = metaCoord(meta, "Latitude", "latitude");
    const metaLon = metaCoord(meta, "Longitude", "longitude");
    if (Number.isFinite(metaLat) && Number.isFinite(metaLon)) {
      patch.lat = metaLat;
      patch.lon = metaLon;
    }
    const vessel = upsertVessel(patch, { from: "aisstream" });
    if (vessel) broadcast("update", vessel);
  }
}

function broadcast(event, data) {
  if (!sseClients.size) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of [...sseClients]) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

function pruneStale() {
  const cutoff = Date.now() - VESSEL_TTL_MS;
  for (const [mmsi, v] of vessels) {
    if ((v.updatedAt || 0) < cutoff) {
      vessels.delete(mmsi);
      broadcast("remove", { mmsi });
    }
  }
}

function scheduleReconnect() {
  if (reconnectTimer || intentionalClose) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectUpstream();
  }, RECONNECT_MS);
}

function connectUpstream() {
  if (!isAisStreamConfigured()) return;
  if (
    upstream &&
    (upstream.readyState === WebSocket.OPEN ||
      upstream.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  intentionalClose = false;
  const url = "wss://stream.aisstream.io/v0/stream";
  logger.info("AISStream: conectando…");
  const ws = new WebSocket(url, { perMessageDeflate: true });
  upstream = ws;

  ws.on("open", () => {
    logger.info("AISStream: conectado");
    const subscription = {
      APIKey: env.aisStreamApiKey.trim(),
      BoundingBoxes: parseBbox(),
      FilterMessageTypes: [
        "PositionReport",
        "StandardClassBPositionReport",
        "ExtendedClassBPositionReport",
        "ShipStaticData",
      ],
    };
    ws.send(JSON.stringify(subscription));
    broadcast("status", getAisStatus());
  });

  ws.on("message", handleUpstreamMessage);

  ws.on("close", (code, reason) => {
    logger.warning(
      `AISStream: cerrado (${code}) ${reason?.toString?.() || ""}`.trim()
    );
    if (upstream === ws) upstream = null;
    broadcast("status", getAisStatus());
    if (!intentionalClose) scheduleReconnect();
  });

  ws.on("error", (err) => {
    logger.error("AISStream error: " + (err?.message || err));
  });

  if (!pruneTimer) {
    pruneTimer = setInterval(pruneStale, 60_000);
  }
}

function needsIdentity(v) {
  if (!v) return false;
  const hasName = Boolean(v.name?.trim());
  const hasImo = v.imo != null && Number(v.imo) > 0;
  return !hasName || !hasImo;
}

function applyIdentityPatch(mmsi, id, sourceKey) {
  if (!id) return null;
  const patch = {
    mmsi,
    sources: { [sourceKey]: true },
  };
  if (id.name) patch.name = id.name;
  if (id.imo != null && Number(id.imo) > 0) patch.imo = id.imo;
  if (id.callsign) patch.callsign = id.callsign;
  if (id.flag) patch.flag = id.flag;
  if (id.shipType) patch.shipType = id.shipType;
  const vessel = upsertVessel(patch, { from: "identity" });
  if (vessel) broadcast("update", vessel);
  return vessel;
}

async function enrichOneIdentity(mmsi) {
  let current = vessels.get(mmsi);
  if (!current || !needsIdentity(current)) return;

  if (isSkylightConfigured() && needsIdentity(current)) {
    try {
      const id = await getSkylightVesselIdentity(mmsi);
      applyIdentityPatch(mmsi, id, "skylightIdentity");
      current = vessels.get(mmsi);
    } catch (e) {
      logger.warning(`AIS Skylight identidad ${mmsi}: ${e?.message || e}`);
    }
  }

  if (isGfwAvailable() && needsIdentity(current || vessels.get(mmsi))) {
    try {
      const id = await getGfwVesselIdentity(mmsi);
      gfwLastError = null;
      if (id?.found) {
        gfwEnrichOk += 1;
        applyIdentityPatch(mmsi, id, "gfw");
      } else {
        gfwEnrichMiss += 1;
      }
    } catch (e) {
      gfwLastError = e?.message || String(e);
      /* 401/403: gfwProxy ya loguea una vez y entra en cooldown. */
      if (e?.status !== 401 && e?.status !== 403) {
        logger.warning(`AIS GFW identidad ${mmsi}: ${gfwLastError}`);
      }
    }
  }
}

async function enrichMissingIdentities(candidates) {
  if (!isSkylightConfigured() && !isGfwConfigured()) return;

  const need = [];
  for (const mmsi of candidates) {
    const v = vessels.get(mmsi);
    if (!v || !needsIdentity(v)) continue;
    need.push(mmsi);
    if (need.length >= IDENTITY_ENRICH_PER_POLL) break;
  }

  for (let i = 0; i < need.length; i += IDENTITY_CONCURRENCY) {
    const batch = need.slice(i, i + IDENTITY_CONCURRENCY);
    await Promise.all(batch.map((mmsi) => enrichOneIdentity(mmsi)));
  }
}

async function pollIdentityEnrichment() {
  if (identityPollInFlight) return;
  if (!isSkylightConfigured() && !isGfwConfigured()) return;
  identityPollInFlight = true;
  try {
    const candidates = [];
    for (const [mmsi, v] of vessels) {
      if (
        typeof v.lat === "number" &&
        typeof v.lon === "number" &&
        needsIdentity(v)
      ) {
        candidates.push(mmsi);
      }
    }
    if (candidates.length) {
      await enrichMissingIdentities(candidates);
      broadcast("status", getAisStatus());
    }
  } finally {
    identityPollInFlight = false;
  }
}

function startIdentityEnrichPoll() {
  if (!isSkylightConfigured() && !isGfwConfigured()) return;
  if (identityPollTimer) return;
  logger.info(
    `AIS identidad: poll activo (Skylight=${isSkylightConfigured()} GFW=${isGfwConfigured()})`
  );
  pollIdentityEnrichment();
  identityPollTimer = setInterval(pollIdentityEnrichment, IDENTITY_POLL_MS);
  if (!pruneTimer) {
    pruneTimer = setInterval(pruneStale, 60_000);
  }
}

async function pollSkylightAis() {
  if (!isSkylightConfigured() || skylightPollInFlight) return;
  skylightPollInFlight = true;
  try {
    const data = await searchSkylightLastKnownPositions({ limit: 400 });
    const list = Array.isArray(data?.vessels) ? data.vessels : [];
    skylightVesselCount = list.length;
    skylightLastOkAt = Date.now();
    skylightLastError = null;

    const touchMmsis = [];
    for (const row of list) {
      const vessel = upsertVessel(
        {
          mmsi: row.mmsi,
          lat: row.lat,
          lon: row.lon,
          sog: row.sog,
          cog: row.cog,
          heading: row.heading,
          navStatus: row.navStatus,
          aisClass: row.aisClass || undefined,
          sentAt: row.sentAt,
          ageOfPositionSeconds: row.ageOfPositionSeconds,
        },
        { from: "skylight" }
      );
      if (vessel) {
        broadcast("update", vessel);
        touchMmsis.push(String(vessel.mmsi));
      }
    }

    await enrichMissingIdentities(touchMmsis);
    broadcast("status", getAisStatus());
    logger.info(
      `AIS Skylight: ${list.length} last-known · ${vessels.size} en cache`
    );
  } catch (e) {
    skylightLastError = e?.message || String(e);
    logger.warning(`AIS Skylight poll: ${skylightLastError}`);
    broadcast("status", getAisStatus());
  } finally {
    skylightPollInFlight = false;
  }
}

function startSkylightAisPoll() {
  if (!isSkylightConfigured()) return;
  if (skylightPollTimer) return;
  logger.info("AIS Skylight: poll de last-known activo");
  pollSkylightAis();
  skylightPollTimer = setInterval(pollSkylightAis, SKYLIGHT_POLL_MS);
  if (!pruneTimer) {
    pruneTimer = setInterval(pruneStale, 60_000);
  }
}

export function getAisStatus() {
  const readyState = upstream?.readyState;
  const aisstreamConnected = readyState === WebSocket.OPEN;
  const skylightOk =
    isSkylightConfigured() &&
    skylightLastOkAt > 0 &&
    !skylightLastError;
  return {
    configured: isConfigured(),
    connected: aisstreamConnected || skylightOk,
    connecting: readyState === WebSocket.CONNECTING,
    vesselCount: listVessels().length,
    cachedTotal: vessels.size,
    clientCount: sseClients.size,
    messagesReceived: msgCount,
    source: "ais",
    sources: {
      aisstream: isAisStreamConfigured(),
      aisstreamConnected,
      skylight: isSkylightConfigured(),
      skylightOk,
      skylightVesselCount,
      skylightLastError,
      skylightLastOkAt: skylightLastOkAt || null,
      gfw: isGfwConfigured(),
      gfwAvailable: isGfwAvailable(),
      gfwEnrichOk,
      gfwEnrichMiss,
      gfwLastError,
    },
  };
}

export function listVessels() {
  const cutoff = Date.now() - VESSEL_TTL_MS;
  const out = [];
  for (const v of vessels.values()) {
    if (
      typeof v.lat === "number" &&
      typeof v.lon === "number" &&
      (v.updatedAt || 0) >= cutoff
    ) {
      out.push(v);
    }
  }
  return out;
}

/**
 * Registra un cliente SSE. Envía snapshot inicial y status.
 * @returns {() => void} unsubscribe
 */
export function subscribeSse(res) {
  sseClients.add(res);
  if (isAisStreamConfigured()) connectUpstream();
  startSkylightAisPoll();
  startIdentityEnrichPoll();

  res.write(`event: status\ndata: ${JSON.stringify(getAisStatus())}\n\n`);
  res.write(`event: snapshot\ndata: ${JSON.stringify(listVessels())}\n\n`);

  return () => {
    sseClients.delete(res);
  };
}

/** Mantiene el upstream caliente para que el snapshot ya traiga buques. */
export function warmAisBridge() {
  if (isAisStreamConfigured()) {
    connectUpstream();
  } else {
    logger.info("AISStream: sin AIS_STREAM_API_KEY — stream AISStream inactivo");
  }
  if (isSkylightConfigured()) {
    startSkylightAisPoll();
  } else {
    logger.info(
      "AIS Skylight: sin SKYLIGHT_API_KEY — refuerzo last-known inactivo"
    );
  }
  if (isSkylightConfigured() || isGfwConfigured()) {
    startIdentityEnrichPoll();
  } else {
    logger.info(
      "AIS identidad: sin Skylight ni GFW_API_TOKEN — enriquecimiento OMI inactivo"
    );
  }
  if (!isConfigured()) {
    logger.info(
      "AIS: ninguna fuente de posición configurada (AISStream ni Skylight)"
    );
  }
}
