import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

/**
 * Servicio para consultar posiciones AIS desde MongoDB (colección aisPositions).
 * Estas posiciones son escritas por el servicio de ingest Python (SICEN-sim).
 */

/** Esquema Mongoose para aisPositions. */
const aisPositionSchema = new mongoose.Schema(
  {
    mmsi: { type: String, required: true, index: true },
    msg_type: Number,
    timestamp: { type: Date, required: true, index: true },
    lat: Number,
    lon: Number,
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    sog: Number,
    cog: Number,
    heading: Number,
    turn: Number,
    nav_status: Number,
    position_accuracy: Boolean,
    ais_class: String,
    maneuver: Number,
    raim: Boolean,
    name: String,
    callsign: String,
    imo: Number,
    ship_type: Number,
    to_bow: Number,
    to_stern: Number,
    to_port: Number,
    to_starboard: Number,
    draught: Number,
    destination: String,
    eta: mongoose.Schema.Types.Mixed,
    part_number: Number,
    data_type: { type: String, enum: ["position", "static"], default: "position" },
    created_at: Date,
  },
  {
    collection: "aisPositions",
    timestamps: false,
  }
);

// Índice 2dsphere para queries geoespaciales
aisPositionSchema.index({ location: "2dsphere" });
aisPositionSchema.index({ mmsi: 1, timestamp: -1 });

const AisPosition =
  mongoose.models.AisPosition ||
  mongoose.model("AisPosition", aisPositionSchema);

/**
 * Obtiene todas las posiciones AIS recientes (últimas 24h).
 * @param {object} [options]
 * @param {number} [options.maxAgeMinutes=60] - Edad máxima en minutos
 * @param {number} [options.limit=500] - Límite de resultados
 * @returns {Promise<Array>}
 */
export async function getAisPositions({
  maxAgeMinutes = 60,
  limit = 500,
} = {}) {
  try {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

    const positions = await AisPosition.find({
      data_type: "position",
      timestamp: { $gte: cutoff },
      lat: { $exists: true, $ne: null },
      lon: { $exists: true, $ne: null },
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return positions;
  } catch (e) {
    logger.error("Error obteniendo posiciones AIS desde MongoDB:", e);
    throw e;
  }
}

/**
 * Obtiene posiciones AIS dentro de un bbox.
 * @param {object} bbox - { minLat, maxLat, minLon, maxLon }
 * @param {object} [options]
 * @param {number} [options.maxAgeMinutes=60]
 * @param {number} [options.limit=500]
 * @returns {Promise<Array>}
 */
export async function getAisPositionsInBbox(
  { minLat, maxLat, minLon, maxLon },
  { maxAgeMinutes = 60, limit = 500 } = {}
) {
  try {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

    const positions = await AisPosition.find({
      data_type: "position",
      timestamp: { $gte: cutoff },
      location: {
        $geoWithin: {
          $box: [
            [minLon, minLat],
            [maxLon, maxLat],
          ],
        },
      },
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return positions;
  } catch (e) {
    logger.error("Error obteniendo posiciones AIS en bbox:", e);
    throw e;
  }
}

/**
 * Obtiene la última posición conocida de un buque por MMSI.
 * @param {string} mmsi
 * @returns {Promise<object|null>}
 */
export async function getAisPositionByMmsi(mmsi) {
  try {
    const position = await AisPosition.findOne({
      mmsi: String(mmsi),
      data_type: "position",
      lat: { $exists: true, $ne: null },
      lon: { $exists: true, $ne: null },
    })
      .sort({ timestamp: -1 })
      .lean();

    return position;
  } catch (e) {
    logger.error(`Error obteniendo posición AIS para MMSI ${mmsi}:`, e);
    throw e;
  }
}

/**
 * Obtiene estadísticas del servicio de ingest.
 * @returns {Promise<object>}
 */
export async function getAisIngestStats() {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last1h = new Date(now.getTime() - 60 * 60 * 1000);

    const [total, last24hCount, last1hCount, latestTimestamp] =
      await Promise.all([
        AisPosition.countDocuments({ data_type: "position" }),
        AisPosition.countDocuments({
          data_type: "position",
          timestamp: { $gte: last24h },
        }),
        AisPosition.countDocuments({
          data_type: "position",
          timestamp: { $gte: last1h },
        }),
        AisPosition.findOne({ data_type: "position" })
          .sort({ timestamp: -1 })
          .select("timestamp")
          .lean(),
      ]);

    return {
      total,
      last24h: last24hCount,
      last1h: last1hCount,
      latestTimestamp: latestTimestamp?.timestamp || null,
    };
  } catch (e) {
    logger.error("Error obteniendo stats de ingest AIS:", e);
    throw e;
  }
}

/**
 * Transforma una posición de MongoDB al formato usado por aisBridge.
 * @param {object} pos - Posición desde MongoDB
 * @returns {object}
 */
export function transformAisPosition(pos) {
  const ageSeconds = Math.floor(
    (Date.now() - new Date(pos.timestamp).getTime()) / 1000
  );

  return {
    mmsi: pos.mmsi,
    lat: pos.lat,
    lon: pos.lon,
    sog: pos.sog ?? null,
    cog: pos.cog ?? null,
    heading: pos.heading ?? null,
    turn: pos.turn ?? null,
    navStatus: pos.nav_status ?? null,
    aisClass: pos.ais_class || "unknown",
    name: pos.name || undefined,
    callsign: pos.callsign || undefined,
    imo: pos.imo || undefined,
    shipType: pos.ship_type ?? null,
    sentAt: pos.timestamp?.toISOString(),
    ageOfPositionSeconds: ageSeconds,
    positionSource: "nmea-ingest",
    sources: {
      nmeaIngest: true,
    },
    updatedAt: Date.now(),
  };
}
