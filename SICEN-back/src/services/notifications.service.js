import { isValidObjectId } from "mongoose";
import { NotificationMongoose } from "../DAO/models/mongoose/notifications.mongoose.js";
import { UserMongoose } from "../DAO/models/mongoose/users.mongoose.js";

function httpError(msg, status = 400) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

function str(v) {
  return String(v ?? "").trim();
}

function userIdOf(user) {
  const id = user?._id ?? user?.id;
  return id ? String(id) : "";
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Resuelve destinatarios según audienceType.
 * @returns {Promise<import("mongoose").Types.ObjectId[]>}
 */
async function resolveRecipientUserIds(audienceType, audienceValue) {
  const type = str(audienceType).toLowerCase();
  const value = str(audienceValue);

  if (type === "user") {
    if (!isValidObjectId(value)) {
      throw httpError("audienceValue de usuario no válido.");
    }
    const exists = await UserMongoose.exists({ _id: value });
    if (!exists) {
      throw httpError("El usuario destinatario no existe.", 404);
    }
    return [value];
  }

  if (type === "unit") {
    const acronym = value.toUpperCase();
    if (!acronym) {
      throw httpError("Indique la unidad destinataria.");
    }
    const users = await UserMongoose.find({
      unit: { $regex: new RegExp(`^${escapeRegex(acronym)}$`, "i") },
    })
      .select("_id")
      .lean();
    return users.map((u) => u._id);
  }

  throw httpError('audienceType debe ser "user" o "unit".');
}

/**
 * Fan-out idempotente: crea una notificación por destinatario.
 * Duplicados (mismo userId + dedupeKey) se ignoran.
 *
 * @returns {{ created: number, recipientCount: number }}
 */
export async function notifyAudience({
  audienceType,
  audienceValue,
  type,
  title,
  body = "",
  href = "",
  meta = {},
  dedupeKey,
}) {
  const t = str(type);
  const tit = str(title);
  const key = str(dedupeKey);
  if (!t) throw httpError("Indique el type de la notificación.");
  if (!tit) throw httpError("Indique el título de la notificación.");
  if (!key) throw httpError("Indique dedupeKey.");

  const audienceTypeNorm = str(audienceType).toLowerCase();
  const audienceValueNorm =
    audienceTypeNorm === "unit"
      ? str(audienceValue).toUpperCase()
      : str(audienceValue);

  const recipientIds = await resolveRecipientUserIds(
    audienceTypeNorm,
    audienceValueNorm
  );
  if (!recipientIds.length) {
    return { created: 0, recipientCount: 0 };
  }

  const docs = recipientIds.map((uid) => ({
    userId: uid,
    audienceType: audienceTypeNorm,
    audienceValue: audienceValueNorm,
    type: t,
    title: tit.slice(0, 200),
    body: str(body).slice(0, 1000),
    href: str(href).slice(0, 300),
    meta: meta && typeof meta === "object" ? meta : {},
    dedupeKey: key.slice(0, 200),
    readAt: null,
  }));

  try {
    const inserted = await NotificationMongoose.insertMany(docs, {
      ordered: false,
    });
    return { created: inserted.length, recipientCount: recipientIds.length };
  } catch (e) {
    /* Código 11000 = duplicate key (idempotencia). */
    if (e?.code === 11000 || e?.name === "MongoBulkWriteError") {
      const n = Array.isArray(e?.insertedDocs)
        ? e.insertedDocs.length
        : Number(e?.result?.nInserted) || 0;
      return { created: n, recipientCount: recipientIds.length };
    }
    throw e;
  }
}

export async function listNotificationsForUser(user, { page, limit } = {}) {
  const uid = userIdOf(user);
  if (!uid || !isValidObjectId(uid)) {
    throw httpError("Usuario no autenticado.", 401);
  }
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));

  return NotificationMongoose.paginate(
    { userId: uid },
    {
      page: safePage,
      limit: safeLimit,
      sort: { createdAt: -1 },
    }
  );
}

export async function unreadCountForUser(user) {
  const uid = userIdOf(user);
  if (!uid || !isValidObjectId(uid)) {
    return { count: 0 };
  }
  const count = await NotificationMongoose.countDocuments({
    userId: uid,
    readAt: null,
  });
  return { count };
}

export async function markNotificationRead(id, user) {
  const uid = userIdOf(user);
  if (!uid || !isValidObjectId(uid)) {
    throw httpError("Usuario no autenticado.", 401);
  }
  if (!isValidObjectId(id)) {
    throw httpError("Identificador de notificación no válido.");
  }
  const doc = await NotificationMongoose.findOne({ _id: id, userId: uid });
  if (!doc) {
    throw httpError("Notificación no encontrada.", 404);
  }
  if (!doc.readAt) {
    doc.readAt = new Date();
    await doc.save();
  }
  return doc.toObject();
}

export async function markAllNotificationsRead(user) {
  const uid = userIdOf(user);
  if (!uid || !isValidObjectId(uid)) {
    throw httpError("Usuario no autenticado.", 401);
  }
  const result = await NotificationMongoose.updateMany(
    { userId: uid, readAt: null },
    { $set: { readAt: new Date() } }
  );
  return { modified: result.modifiedCount || 0 };
}
