import dgram from "node:dgram";
import env from "../config/env.config.js";
import { logger } from "../utils/logger.js";

/**
 * Receptor UDP para mensajes NMEA AIS (!AIVDM / !AIVDO).
 * Decodifica mensajes NMEA y alimenta el aisBridge con buques detectados.
 * Feature-flag: AIS_NMEA_UDP_ENABLED (default false).
 */

/** Socket UDP (null si está deshabilitado). */
let udpSocket = null;
/** Buffer para mensajes multipartes. */
const multipartBuffer = new Map();
/** TTL del buffer multipartes (60 segundos). */
const MULTIPART_TTL_MS = 60_000;

/** Métricas básicas del receptor (se exponen en /api/ais/nmea/status). */
const metrics = {
  datagrams: 0,
  rejectedSource: 0,
  received: 0,
  valid: 0,
  invalidChecksum: 0,
  malformed: 0,
  decoded: 0,
  lastValidAt: null,
  lastSource: null,
  startedAt: null,
};

/**
 * Normaliza una IP (quita prefijo IPv4-mapped "::ffff:").
 * @param {string} ip
 */
function normalizeIp(ip) {
  return String(ip || "").trim().replace(/^::ffff:/i, "");
}

/**
 * ¿La IP origen está permitida? Lista vacía = se permite todo.
 * @param {string} ip
 * @param {string[]} allowed
 */
export function isSourceAllowed(ip, allowed = []) {
  if (!Array.isArray(allowed) || allowed.length === 0) return true;
  const n = normalizeIp(ip);
  return allowed.some((a) => normalizeIp(a) === n);
}

/**
 * Valida el checksum NMEA 0183 (XOR de los caracteres entre '!'/'$' y '*').
 * @param {string} line
 * @returns {boolean}
 */
export function hasValidNmeaChecksum(line) {
  const t = String(line || "").trim();
  const m = /^[!$]([^*]+)\*([0-9A-Fa-f]{2})$/.exec(t);
  if (!m) return false;
  let x = 0;
  for (let i = 0; i < m[1].length; i++) x ^= m[1].charCodeAt(i);
  return x === parseInt(m[2], 16);
}

/**
 * Decodifica un payload AIS de 6 bits a binario.
 * Cada carácter NMEA representa 6 bits (armored ASCII).
 * @param {string} payload
 * @returns {string} Cadena binaria
 */
function decodeAisPayload(payload) {
  let binary = "";
  for (let i = 0; i < payload.length; i++) {
    let charCode = payload.charCodeAt(i) - 48;
    if (charCode > 40) charCode -= 8;
    binary += charCode.toString(2).padStart(6, "0");
  }
  return binary;
}

/**
 * Extrae un entero del payload binario.
 * @param {string} binary
 * @param {number} start
 * @param {number} length
 * @returns {number}
 */
function extractInt(binary, start, length) {
  return parseInt(binary.substr(start, length), 2);
}

/**
 * Extrae un entero con signo del payload binario.
 * @param {string} binary
 * @param {number} start
 * @param {number} length
 * @returns {number}
 */
function extractSignedInt(binary, start, length) {
  const value = extractInt(binary, start, length);
  const max = Math.pow(2, length - 1);
  return value >= max ? value - Math.pow(2, length) : value;
}

/**
 * Extrae una cadena del payload binario (6 bits por carácter).
 * @param {string} binary
 * @param {number} start
 * @param {number} length
 * @returns {string}
 */
function extractString(binary, start, length) {
  let result = "";
  for (let i = 0; i < length; i += 6) {
    const char = extractInt(binary, start + i, 6);
    if (char === 0) break;
    if (char < 32) {
      result += String.fromCharCode(char + 64);
    } else {
      result += String.fromCharCode(char);
    }
  }
  return result.trim().replace(/@/g, "");
}

/**
 * Decodifica un mensaje AIS de tipo 1, 2 o 3 (Position Report).
 * @param {string} binary
 * @returns {object|null}
 */
function decodePositionReport(binary) {
  try {
    const mmsi = extractInt(binary, 8, 30);
    const navStatus = extractInt(binary, 38, 4);
    const rot = extractSignedInt(binary, 42, 8);
    const sog = extractInt(binary, 50, 10) / 10;
    const lon = extractSignedInt(binary, 61, 28) / 600000;
    const lat = extractSignedInt(binary, 89, 27) / 600000;
    const cog = extractInt(binary, 116, 12) / 10;
    const heading = extractInt(binary, 128, 9);

    // Validar coordenadas
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    if (lat === 91 || lon === 181) return null; // Posición no disponible

    return {
      mmsi,
      lat,
      lon,
      sog: sog === 102.3 ? null : sog,
      cog: cog === 360 ? null : cog,
      heading: heading === 511 ? null : heading,
      navStatus: navStatus === 15 ? null : navStatus,
      rot: rot === -128 || rot === 127 ? null : rot,
    };
  } catch (err) {
    logger.debug(`Error decodificando position report: ${err.message}`);
    return null;
  }
}

/**
 * Decodifica un mensaje AIS de tipo 5 (Static and Voyage Related Data).
 * @param {string} binary
 * @returns {object|null}
 */
function decodeStaticData(binary) {
  try {
    const mmsi = extractInt(binary, 8, 30);
    const callsign = extractString(binary, 70, 42);
    const name = extractString(binary, 112, 120);
    const shipType = extractInt(binary, 232, 8);
    const imo = extractInt(binary, 40, 30);

    return {
      mmsi,
      name: name || undefined,
      callsign: callsign || undefined,
      imo: imo > 0 ? imo : undefined,
      shipType: shipType || undefined,
    };
  } catch (err) {
    logger.debug(`Error decodificando static data: ${err.message}`);
    return null;
  }
}

/**
 * Decodifica un mensaje AIS de tipo 18 (Standard Class B Position Report).
 * @param {string} binary
 * @returns {object|null}
 */
function decodeClassBPositionReport(binary) {
  try {
    const mmsi = extractInt(binary, 8, 30);
    const sog = extractInt(binary, 46, 10) / 10;
    const lon = extractSignedInt(binary, 57, 28) / 600000;
    const lat = extractSignedInt(binary, 85, 27) / 600000;
    const cog = extractInt(binary, 112, 12) / 10;
    const heading = extractInt(binary, 124, 9);

    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    if (lat === 91 || lon === 181) return null;

    return {
      mmsi,
      lat,
      lon,
      sog: sog === 102.3 ? null : sog,
      cog: cog === 360 ? null : cog,
      heading: heading === 511 ? null : heading,
      aisClass: "B",
    };
  } catch (err) {
    logger.debug(`Error decodificando Class B position report: ${err.message}`);
    return null;
  }
}

/**
 * Decodifica un mensaje AIS de tipo 24 (Static Data Report, Class B).
 * @param {string} binary
 * @returns {object|null}
 */
function decodeClassBStaticData(binary) {
  try {
    const mmsi = extractInt(binary, 8, 30);
    const partNumber = extractInt(binary, 38, 2);

    if (partNumber === 0) {
      // Part A: Name
      const name = extractString(binary, 40, 120);
      return { mmsi, name: name || undefined, aisClass: "B" };
    } else if (partNumber === 1) {
      // Part B: Ship type and callsign
      const shipType = extractInt(binary, 40, 8);
      const callsign = extractString(binary, 90, 42);
      return {
        mmsi,
        callsign: callsign || undefined,
        shipType: shipType || undefined,
        aisClass: "B",
      };
    }
    return null;
  } catch (err) {
    logger.debug(`Error decodificando Class B static data: ${err.message}`);
    return null;
  }
}

/**
 * Procesa un mensaje NMEA AIS completo (single-part o multipart ensamblado).
 * @param {string} payload Payload armored ASCII
 * @param {number} fillBits Bits de relleno
 * @returns {object|null} Buque decodificado o null
 */
function processAisMessage(payload, fillBits) {
  const out = processAisMessageInner(payload, fillBits);
  if (out && out.mmsi) metrics.decoded++;
  return out;
}

function processAisMessageInner(payload, fillBits) {
  try {
    const binary = decodeAisPayload(payload);
    const messageType = extractInt(binary, 0, 6);

    switch (messageType) {
      case 1:
      case 2:
      case 3:
        return { ...decodePositionReport(binary), aisClass: "A" };
      case 5:
        return { ...decodeStaticData(binary), aisClass: "A" };
      case 18:
        return decodeClassBPositionReport(binary);
      case 24:
        return decodeClassBStaticData(binary);
      default:
        logger.debug(`Mensaje AIS tipo ${messageType} no soportado (NMEA UDP)`);
        return null;
    }
  } catch (err) {
    logger.debug(`Error procesando mensaje AIS (NMEA UDP): ${err.message}`);
    return null;
  }
}

/**
 * Parsea una línea NMEA !AIVDM o !AIVDO.
 * @param {string} line
 * @returns {object|null}
 */
export function parseNmeaLine(line, { source = "" } = {}) {
  const trimmed = String(line || "").trim();
  if (!trimmed.startsWith("!AIVDM") && !trimmed.startsWith("!AIVDO")) {
    metrics.malformed++;
    return null;
  }
  if (!hasValidNmeaChecksum(trimmed)) {
    metrics.invalidChecksum++;
    return null;
  }
  metrics.valid++;
  metrics.lastValidAt = Date.now();

  // Formato: !AIVDM,fragmentCount,fragmentNumber,messageId,channel,payload,fillBits*checksum
  const parts = trimmed.split(",");
  if (parts.length < 7) {
    metrics.malformed++;
    return null;
  }

  try {
    const fragmentCount = parseInt(parts[1], 10);
    const fragmentNumber = parseInt(parts[2], 10);
    const messageId = parts[3] || "";
    const payload = parts[5];
    const fillBits = parseInt(parts[6]?.split("*")[0], 10) || 0;

    if (fragmentCount === 1) {
      // Mensaje de un solo fragmento
      return processAisMessage(payload, fillBits);
    } else {
      // Mensaje multiparte
      // Clave estable: id secuencial + canal + origen (el id puede venir vacío).
      const key = `${source}|${messageId}|${parts[4] || ""}|${fragmentCount}`;
      if (!multipartBuffer.has(key)) {
        multipartBuffer.set(key, { fragments: [], createdAt: Date.now() });
      }
      const entry = multipartBuffer.get(key);
      entry.fragments[fragmentNumber - 1] = payload;

      // Verificar si tenemos todos los fragmentos
      if (entry.fragments.filter((f) => f).length === fragmentCount) {
        const fullPayload = entry.fragments.slice(0, fragmentCount).join("");
        multipartBuffer.delete(key);
        return processAisMessage(fullPayload, fillBits);
      }
      return null;
    }
  } catch (err) {
    logger.debug(`Error parseando línea NMEA: ${err.message}`);
    return null;
  }
}

/**
 * Limpia mensajes multipartes expirados.
 */
function pruneMultipartBuffer() {
  const now = Date.now();
  for (const [key, entry] of multipartBuffer.entries()) {
    if (now - entry.createdAt > MULTIPART_TTL_MS) {
      multipartBuffer.delete(key);
    }
  }
}

/**
 * Inicia el receptor UDP NMEA.
 * Requiere que aisBridge esté cargado dinámicamente para evitar ciclos.
 */
export function startNmeaReceiver() {
  if (!env.aisNmeaUdpEnabled) {
    logger.info(
      "Receptor NMEA UDP deshabilitado (AIS_NMEA_UDP_ENABLED=false o no configurado)"
    );
    return;
  }

  const host = env.aisNmeaUdpHost || "127.0.0.1";
  const allowed = env.aisNmeaUdpAllowedIps || [];
  metrics.startedAt = Date.now();
  const port = env.aisNmeaUdpPort || 10110;

  udpSocket = dgram.createSocket("udp4");

  udpSocket.on("error", (err) => {
    logger.error(`Error en socket UDP NMEA: ${err.message}`);
    udpSocket?.close();
  });

  udpSocket.on("message", async (msg, rinfo) => {
    metrics.datagrams++;
    const src = normalizeIp(rinfo?.address);
    if (!isSourceAllowed(src, allowed)) {
      metrics.rejectedSource++;
      return;
    }
    metrics.lastSource = src;
    const lines = msg.toString("utf8").split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      metrics.received++;
      const vessel = parseNmeaLine(line, { source: src });
      if (vessel && vessel.mmsi) {
        // Importar dinámicamente para evitar ciclos
        const { upsertVesselFromNmea } = await import(
          "./aisBridge.service.js"
        );
        upsertVesselFromNmea(vessel);
      }
    }
  });

  udpSocket.on("listening", () => {
    const addr = udpSocket.address();
    logger.info(
      `Receptor NMEA UDP escuchando en ${addr.address}:${addr.port}`
    );
  });

  udpSocket.bind(port, host);
  if (allowed.length) {
    logger.info(`Receptor NMEA UDP: allowlist de origen = ${allowed.join(", ")}`);
  } else if (host !== "127.0.0.1" && host !== "localhost") {
    logger.warning(
      `Receptor NMEA UDP en ${host} sin AIS_NMEA_UDP_ALLOWED_IPS: cualquier origen puede inyectar blancos.`
    );
  }

  // Limpiar buffer multipartes periódicamente
  setInterval(pruneMultipartBuffer, MULTIPART_TTL_MS).unref?.();
}

/**
 * Detiene el receptor UDP NMEA.
 */
export function stopNmeaReceiver() {
  if (udpSocket) {
    udpSocket.close();
    udpSocket = null;
    logger.info("Receptor NMEA UDP detenido");
  }
}

/** Ventana para considerar que el receptor "está recibiendo". */
const RECEIVING_WINDOW_MS = 5 * 60_000;

/**
 * Estado + métricas del receptor NMEA.
 */
export function getNmeaReceiverStatus() {
  const now = Date.now();
  return {
    enabled: Boolean(env.aisNmeaUdpEnabled),
    listening: Boolean(udpSocket),
    host: env.aisNmeaUdpHost,
    port: env.aisNmeaUdpPort,
    allowlist: (env.aisNmeaUdpAllowedIps || []).length > 0,
    receiving: Boolean(
      metrics.lastValidAt && now - metrics.lastValidAt < RECEIVING_WINDOW_MS
    ),
    metrics: {
      ...metrics,
      discarded: metrics.rejectedSource + metrics.invalidChecksum + metrics.malformed,
    },
  };
}

/** Solo para tests. */
export function _resetNmeaReceiverForTests() {
  for (const k of Object.keys(metrics)) {
    metrics[k] = typeof metrics[k] === "number" ? 0 : null;
  }
  multipartBuffer.clear();
}
