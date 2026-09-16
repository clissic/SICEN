import { isValidObjectId } from "mongoose";
import { MapMeasurementsMongoose } from "../DAO/models/mongoose/mapMeasurements.mongoose.js";
import {
  MAP_MEASUREMENT_DEFAULT_UNIT,
  MAP_MEASUREMENT_MAX_CIRCLES,
  MAP_MEASUREMENT_MAX_PER_USER,
  MAP_MEASUREMENT_MAX_POINTS,
  MAP_MEASUREMENT_UNITS,
} from "../constants/mapMeasurementCatalog.js";

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

function normalizeLatLng(raw, label = "punto") {
  let lat;
  let lng;
  if (Array.isArray(raw) && raw.length >= 2) {
    lat = Number(raw[0]);
    lng = Number(raw[1]);
  } else if (raw && typeof raw === "object") {
    lat = Number(raw.lat);
    lng = Number(raw.lng ?? raw.lon);
  } else {
    throw httpError(`${label} inválido.`);
  }
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw httpError(`Latitud inválida en ${label}.`);
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw httpError(`Longitud inválida en ${label}.`);
  }
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

function normalizePoints(raw) {
  if (!Array.isArray(raw)) return [];
  if (raw.length > MAP_MEASUREMENT_MAX_POINTS) {
    throw httpError(
      `Máximo ${MAP_MEASUREMENT_MAX_POINTS} puntos por medición.`
    );
  }
  return raw.map((pt, i) => normalizeLatLng(pt, `punto ${i + 1}`));
}

function normalizeCircles(raw) {
  if (!Array.isArray(raw)) return [];
  if (raw.length > MAP_MEASUREMENT_MAX_CIRCLES) {
    throw httpError(
      `Máximo ${MAP_MEASUREMENT_MAX_CIRCLES} radios por medición.`
    );
  }
  return raw.map((c, i) => {
    const center = normalizeLatLng(c?.center, `centro del radio ${i + 1}`);
    const edge = normalizeLatLng(c?.edge, `borde del radio ${i + 1}`);
    const radiusM = Number(c?.radiusM);
    if (!Number.isFinite(radiusM) || radiusM <= 0) {
      throw httpError(`Radio inválido (${i + 1}).`);
    }
    const centerIdx = Number(c?.centerIdx);
    return {
      center,
      edge,
      radiusM,
      centerIdx: Number.isFinite(centerIdx) ? centerIdx : -1,
    };
  });
}

function normalizeNumberArray(raw, expectedLen, label) {
  if (!Array.isArray(raw)) {
    return Array.from({ length: expectedLen }, () => 0);
  }
  const out = raw.slice(0, expectedLen).map((n) => {
    const v = Number(n);
    return Number.isFinite(v) ? v : 0;
  });
  while (out.length < expectedLen) out.push(0);
  return out;
}

/**
 * @param {object} body
 * @param {{ partial?: boolean }} [opts]
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

  if (!partial || body.unit !== undefined) {
    const unit = String(body.unit ?? MAP_MEASUREMENT_DEFAULT_UNIT).trim();
    if (!MAP_MEASUREMENT_UNITS.includes(unit)) {
      throw httpError("Unidad inválida.");
    }
    out.unit = unit;
  }

  if (
    !partial ||
    body.points !== undefined ||
    body.circles !== undefined ||
    body.deducts !== undefined ||
    body.deductSource !== undefined
  ) {
    const points =
      body.points !== undefined
        ? normalizePoints(body.points)
        : partial
          ? undefined
          : [];
    const circles =
      body.circles !== undefined
        ? normalizeCircles(body.circles)
        : partial
          ? undefined
          : [];

    if (points !== undefined) out.points = points;
    if (circles !== undefined) out.circles = circles;

    const ptsLen = (out.points ?? []).length;
    const segmentCount = Math.max(0, ptsLen - 1);

    if (body.deducts !== undefined || !partial) {
      out.deducts = normalizeNumberArray(
        body.deducts,
        segmentCount,
        "deducts"
      );
    }
    if (body.deductSource !== undefined || !partial) {
      out.deductSource = normalizeNumberArray(
        body.deductSource,
        segmentCount,
        "deductSource"
      ).map((n) => Math.trunc(n));
    }

    const finalPoints = out.points;
    const finalCircles = out.circles;
    if (finalPoints !== undefined && finalCircles !== undefined) {
      const hasPath = finalPoints.length >= 2;
      const hasCircle = finalCircles.length >= 1;
      if (!hasPath && !hasCircle) {
        throw httpError(
          "La medición necesita al menos un tramo o un radio."
        );
      }
    }
  }

  if (!partial || body.totalMeters !== undefined) {
    const total = Number(body.totalMeters);
    out.totalMeters = Number.isFinite(total) && total >= 0 ? total : 0;
  }

  if (body.hidden !== undefined) {
    out.hidden = Boolean(body.hidden);
  } else if (!partial) {
    out.hidden = false;
  }

  return out;
}

export async function listMapMeasurementsForUser(user) {
  const userId = userIdOf(user);
  const measurements = await MapMeasurementsMongoose.find({ userId })
    .sort({ createdAt: -1 })
    .lean();
  return { measurements };
}

export async function createMapMeasurement(user, body) {
  const userId = userIdOf(user);
  const data = normalizePayload(body);
  const count = await MapMeasurementsMongoose.countDocuments({ userId });
  if (count >= MAP_MEASUREMENT_MAX_PER_USER) {
    throw httpError(
      `Alcanzaste el máximo de ${MAP_MEASUREMENT_MAX_PER_USER} mediciones.`,
      409
    );
  }
  const email = userEmail(user);
  const doc = await MapMeasurementsMongoose.create({
    userId,
    ...data,
    metadata: { createdBy: email, lastModifiedBy: email },
  });
  return doc.toObject();
}

export async function updateMapMeasurement(user, id, body) {
  const userId = userIdOf(user);
  if (!isValidObjectId(String(id))) {
    throw httpError("Medición inválida.", 400);
  }
  const raw = body ?? {};
  const hasName = raw.name !== undefined;
  const hasUnit = raw.unit !== undefined;
  const hasGeom =
    raw.points !== undefined ||
    raw.circles !== undefined ||
    raw.deducts !== undefined ||
    raw.deductSource !== undefined;
  const hasTotal = raw.totalMeters !== undefined;
  const hasHidden = raw.hidden !== undefined;

  if (!hasName && !hasUnit && !hasGeom && !hasTotal && !hasHidden) {
    throw httpError("No hay cambios para guardar.");
  }

  const onlyHidden =
    hasHidden && !hasName && !hasUnit && !hasGeom && !hasTotal;

  let data;
  if (onlyHidden) {
    data = { hidden: Boolean(raw.hidden) };
  } else if (hasGeom) {
    data = normalizePayload(raw, { partial: false });
    if (hasHidden) data.hidden = Boolean(raw.hidden);
  } else {
    data = normalizePayload(raw, { partial: true });
  }

  const doc = await MapMeasurementsMongoose.findOneAndUpdate(
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
    throw httpError("Medición no encontrada.", 404);
  }
  return doc;
}

export async function deleteMapMeasurement(user, id) {
  const userId = userIdOf(user);
  if (!isValidObjectId(String(id))) {
    throw httpError("Medición inválida.", 400);
  }
  const doc = await MapMeasurementsMongoose.findOneAndDelete({
    _id: id,
    userId,
  }).lean();
  if (!doc) {
    throw httpError("Medición no encontrada.", 404);
  }
  return doc;
}
