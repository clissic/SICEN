import { isValidObjectId } from "mongoose";
import { MapZonesMongoose } from "../DAO/models/mongoose/mapZones.mongoose.js";
import {
  MAP_MARKER_COLORS,
  MAP_MARKER_DEFAULT_COLOR,
  MAP_ZONE_MAX_PER_USER,
  MAP_ZONE_MAX_VERTICES,
  MAP_ZONE_MIN_VERTICES,
} from "../constants/mapZoneCatalog.js";

function httpError(msg, status = 400) {
  const err = new Error(msg);
  err.status = status;
  return err;
}

function userIdOf(user) {
  const id = user?._id ?? user?.id;
  if (!id || !isValidObjectId(String(id))) {
    throw httpError("Usuario no autenticado.", 401);
  }
  return String(id);
}

function userEmail(user) {
  return String(user?.email || "").trim();
}

function normalizePositions(raw) {
  if (!Array.isArray(raw)) {
    throw httpError("Indicá al menos 3 vértices.");
  }
  if (raw.length < MAP_ZONE_MIN_VERTICES) {
    throw httpError(
      `La zona necesita al menos ${MAP_ZONE_MIN_VERTICES} puntos.`
    );
  }
  if (raw.length > MAP_ZONE_MAX_VERTICES) {
    throw httpError(
      `Máximo ${MAP_ZONE_MAX_VERTICES} vértices por zona.`
    );
  }
  const positions = [];
  for (const pt of raw) {
    let lat;
    let lng;
    if (Array.isArray(pt) && pt.length >= 2) {
      lat = Number(pt[0]);
      lng = Number(pt[1]);
    } else if (pt && typeof pt === "object") {
      lat = Number(pt.lat);
      lng = Number(pt.lng ?? pt.lon);
    } else {
      throw httpError("Vértice inválido.");
    }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw httpError("Latitud inválida en un vértice.");
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw httpError("Longitud inválida en un vértice.");
    }
    positions.push([
      Number(lat.toFixed(6)),
      Number(lng.toFixed(6)),
    ]);
  }
  return positions;
}

/**
 * @param {object} body
 * @param {{ partial?: boolean }} [opts] — partial: solo campos presentes (p. ej. solo `hidden`)
 */
function normalizePayload(body = {}, { partial = false } = {}) {
  const out = {};

  if (!partial || body.name !== undefined) {
    const name = String(body.name ?? "").trim();
    if (!name || name.length > 80) {
      throw httpError("El nombre es obligatorio (máx. 80 caracteres).");
    }
    out.name = name;
  }

  if (!partial || body.color !== undefined) {
    const colorRaw = String(
      body.color ?? MAP_MARKER_DEFAULT_COLOR
    ).trim();
    const color =
      MAP_MARKER_COLORS.find(
        (c) => c.toLowerCase() === colorRaw.toLowerCase()
      ) || null;
    if (!color) {
      throw httpError("Color no permitido.");
    }
    out.color = color;
  }

  if (!partial || body.positions !== undefined) {
    out.positions = normalizePositions(body.positions);
  }

  if (body.hidden !== undefined) {
    out.hidden = Boolean(body.hidden);
  } else if (!partial) {
    out.hidden = false;
  }

  return out;
}

export async function listMapZonesForUser(user) {
  const userId = userIdOf(user);
  const zones = await MapZonesMongoose.find({ userId })
    .sort({ createdAt: -1 })
    .lean();
  return { zones };
}

export async function createMapZone(user, body) {
  const userId = userIdOf(user);
  const data = normalizePayload(body);
  const count = await MapZonesMongoose.countDocuments({ userId });
  if (count >= MAP_ZONE_MAX_PER_USER) {
    throw httpError(
      `Alcanzaste el máximo de ${MAP_ZONE_MAX_PER_USER} zonas.`,
      409
    );
  }
  const email = userEmail(user);
  const doc = await MapZonesMongoose.create({
    userId,
    ...data,
    metadata: { createdBy: email, lastModifiedBy: email },
  });
  return doc.toObject();
}

export async function updateMapZone(user, id, body) {
  const userId = userIdOf(user);
  if (!isValidObjectId(String(id))) {
    throw httpError("Zona inválida.", 400);
  }
  const raw = body ?? {};
  const hasName = raw.name !== undefined;
  const hasColor = raw.color !== undefined;
  const hasPositions = raw.positions !== undefined;
  const hasHidden = raw.hidden !== undefined;

  if (!hasName && !hasColor && !hasPositions && !hasHidden) {
    throw httpError("No hay cambios para guardar.");
  }

  const onlyHidden =
    hasHidden && !hasName && !hasColor && !hasPositions;

  let data;
  if (onlyHidden) {
    data = { hidden: Boolean(raw.hidden) };
  } else {
    data = normalizePayload(raw, { partial: false });
    if (hasHidden) data.hidden = Boolean(raw.hidden);
  }

  const doc = await MapZonesMongoose.findOneAndUpdate(
    { _id: id, userId },
    {
      $set: {
        ...data,
        "metadata.lastModifiedBy": userEmail(user),
      },
    },
    { new: true }
  ).lean();
  if (!doc) {
    throw httpError("Zona no encontrada.", 404);
  }
  return doc;
}

export async function deleteMapZone(user, id) {
  const userId = userIdOf(user);
  if (!isValidObjectId(String(id))) {
    throw httpError("Zona inválida.", 400);
  }
  const doc = await MapZonesMongoose.findOneAndDelete({
    _id: id,
    userId,
  }).lean();
  if (!doc) {
    throw httpError("Zona no encontrada.", 404);
  }
  return doc;
}
