import WebSocket from "ws";
import env from "../config/env.config.js";
import { logger } from "../utils/logger.js";

/** TTL de posiciones sin actualizar (ms). */
const VESSEL_TTL_MS = 30 * 60 * 1000;
/** Reintento de conexión upstream (ms). */
const RECONNECT_MS = 8_000;

const POSITION_TYPES = new Set([
  "PositionReport",
  "StandardClassBPositionReport",
  "ExtendedClassBPositionReport",
]);

/**
 * Fuente AIS abstracta: hoy AISStream; mañana receptor NMEA propio
 * puede alimentar el mismo `upsertVessel` / fan-out SSE.
 */
const vessels = new Map();
/** @type {Set<import("express").Response>} */
const sseClients = new Set();

/** @type {import("ws").WebSocket | null} */
let upstream = null;
let reconnectTimer = null;
let pruneTimer = null;
let intentionalClose = false;
let msgCount = 0;
let lastStatsLogAt = 0;

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
    logger.warn(
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

function isConfigured() {
  return Boolean(env.aisStreamApiKey?.trim());
}

function metaCoord(meta, keyCap, keyLow) {
  const v = meta?.[keyCap] ?? meta?.[keyLow];
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function upsertVessel(partial) {
  const mmsi = String(partial.mmsi || "").trim();
  if (!mmsi) return null;
  const prev = vessels.get(mmsi) || { mmsi };
  const cleaned = {};
  for (const [k, v] of Object.entries(partial)) {
    if (v !== undefined) cleaned[k] = v;
  }
  const next = {
    ...prev,
    ...cleaned,
    mmsi,
    updatedAt: Date.now(),
  };
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

  const vessel = upsertVessel({
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
  });
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
    const vessel = upsertVessel(patch);
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
  if (!isConfigured()) return;
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
    logger.warn(
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

export function getAisStatus() {
  const readyState = upstream?.readyState;
  return {
    configured: isConfigured(),
    connected: readyState === WebSocket.OPEN,
    connecting: readyState === WebSocket.CONNECTING,
    vesselCount: listVessels().length,
    cachedTotal: vessels.size,
    clientCount: sseClients.size,
    messagesReceived: msgCount,
    source: "aisstream",
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
  if (isConfigured()) connectUpstream();

  res.write(`event: status\ndata: ${JSON.stringify(getAisStatus())}\n\n`);
  res.write(`event: snapshot\ndata: ${JSON.stringify(listVessels())}\n\n`);

  return () => {
    sseClients.delete(res);
  };
}

/** Mantiene el upstream caliente para que el snapshot ya traiga buques. */
export function warmAisBridge() {
  if (!isConfigured()) {
    logger.info("AISStream: sin AIS_STREAM_API_KEY — capa AIS inactiva");
    return;
  }
  connectUpstream();
}
