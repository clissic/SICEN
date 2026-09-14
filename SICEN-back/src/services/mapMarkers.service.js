import { isValidObjectId } from "mongoose";
import { MapMarkersMongoose } from "../DAO/models/mongoose/mapMarkers.mongoose.js";
import {
  MAP_MARKER_COLORS,
  MAP_MARKER_DEFAULT_COLOR,
  MAP_MARKER_DEFAULT_ICON,
  MAP_MARKER_MAX_PER_USER,
  isAllowedMapMarkerIcon,
} from "../constants/mapMarkerCatalog.js";

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

function normalizePayload(body = {}, { partial = false } = {}) {
  const out = {};

  if (!partial || body.name !== undefined) {
    const name = String(body.name ?? "").trim();
    if (!name || name.length > 80) {
      throw httpError("El nombre es obligatorio (máx. 80 caracteres).");
    }
    out.name = name;
  }

  if (!partial || body.lat !== undefined || body.lng !== undefined) {
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw httpError("Latitud inválida.");
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw httpError("Longitud inválida.");
    }
    out.lat = Number(lat.toFixed(6));
    out.lng = Number(lng.toFixed(6));
  }

  if (!partial || body.icon !== undefined) {
    const icon = String(body.icon ?? MAP_MARKER_DEFAULT_ICON).trim();
    if (!isAllowedMapMarkerIcon(icon)) {
      throw httpError("Ícono no permitido.");
    }
    out.icon = icon;
  }

  if (!partial || body.color !== undefined) {
    const colorRaw = String(body.color ?? MAP_MARKER_DEFAULT_COLOR).trim();
    const color =
      MAP_MARKER_COLORS.find(
        (c) => c.toLowerCase() === colorRaw.toLowerCase()
      ) || null;
    if (!color) {
      throw httpError("Color no permitido.");
    }
    out.color = color;
  }

  if (body.hidden !== undefined) {
    out.hidden = Boolean(body.hidden);
  } else if (!partial) {
    out.hidden = false;
  }

  return out;
}

export async function listMapMarkersForUser(user) {
  const userId = userIdOf(user);
  const markers = await MapMarkersMongoose.find({ userId })
    .sort({ createdAt: -1 })
    .lean();
  return { markers };
}

export async function createMapMarker(user, body) {
  const userId = userIdOf(user);
  const data = normalizePayload(body);
  const count = await MapMarkersMongoose.countDocuments({ userId });
  if (count >= MAP_MARKER_MAX_PER_USER) {
    throw httpError(
      `Alcanzaste el máximo de ${MAP_MARKER_MAX_PER_USER} marcadores.`,
      409
    );
  }
  const email = userEmail(user);
  const doc = await MapMarkersMongoose.create({
    userId,
    ...data,
    metadata: { createdBy: email, lastModifiedBy: email },
  });
  return doc.toObject();
}

export async function updateMapMarker(user, id, body) {
  const userId = userIdOf(user);
  if (!isValidObjectId(String(id))) {
    throw httpError("Marcador inválido.", 400);
  }
  const raw = body ?? {};
  const hasName = raw.name !== undefined;
  const hasLat = raw.lat !== undefined;
  const hasLng = raw.lng !== undefined;
  const hasIcon = raw.icon !== undefined;
  const hasColor = raw.color !== undefined;
  const hasHidden = raw.hidden !== undefined;

  if (
    !hasName &&
    !hasLat &&
    !hasLng &&
    !hasIcon &&
    !hasColor &&
    !hasHidden
  ) {
    throw httpError("No hay cambios para guardar.");
  }

  const onlyHidden =
    hasHidden &&
    !hasName &&
    !hasLat &&
    !hasLng &&
    !hasIcon &&
    !hasColor;

  let data;
  if (onlyHidden) {
    data = { hidden: Boolean(raw.hidden) };
  } else {
    data = normalizePayload(raw, { partial: false });
    if (hasHidden) data.hidden = Boolean(raw.hidden);
  }

  const doc = await MapMarkersMongoose.findOneAndUpdate(
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
    throw httpError("Marcador no encontrado.", 404);
  }
  return doc;
}

export async function deleteMapMarker(user, id) {
  const userId = userIdOf(user);
  if (!isValidObjectId(String(id))) {
    throw httpError("Marcador inválido.", 400);
  }
  const doc = await MapMarkersMongoose.findOneAndDelete({
    _id: id,
    userId,
  }).lean();
  if (!doc) {
    throw httpError("Marcador no encontrado.", 404);
  }
  return doc;
}
