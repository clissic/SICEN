import { isValidObjectId } from "mongoose";
import { SportMovementMongoose } from "../DAO/models/mongoose/sportMovements.mongoose.js";
import { SportMovementPositionMongoose } from "../DAO/models/mongoose/sportMovementPositions.mongoose.js";
import { SportMovementTrackingAlertMongoose } from "../DAO/models/mongoose/sportMovementTrackingAlerts.mongoose.js";
import { VesselMongoose } from "../DAO/models/mongoose/vessels.mongoose.js";
import { notifyAudience } from "./notifications.service.js";
import { skipperCanManageVessel } from "../utils/skipperVesselOwner.js";
import {
  broadcastPositionUpdate,
  broadcastTrackingAlert,
  broadcastTrackingState,
  userCanViewMovementTracking,
} from "./sportMovementTrackingBridge.service.js";
import { sendSportMovementNoSignal5Emails } from "./sportMovementTrackingEmails.service.js";

const NO_SIGNAL_5_MS = 5 * 60 * 1000;
const MAX_FUTURE_MS = 5 * 60 * 1000;
const POSITION_SOURCES = new Set(["browser", "android", "ios", "other"]);
const DEFAULT_PAGE_LIMIT = 500;

let monitorTimer = null;

function httpError(msg, status = 400) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

function str(v) {
  return String(v ?? "").trim();
}

function userUnit(user) {
  return str(user?.unit).toUpperCase();
}

function userEmail(user) {
  return str(user?.email).toLowerCase();
}

function assertSkipperRole(user) {
  if (str(user?.role) !== "skipper") {
    throw httpError("Solo los usuarios náuta pueden realizar esta acción.", 403);
  }
}

function movementUnits(movement) {
  const origin = str(movement?.originUnit).toUpperCase();
  const dest = str(movement?.destinationUnit).toUpperCase();
  const transit = Array.isArray(movement?.informedUnits)
    ? movement.informedUnits.map((u) => str(u).toUpperCase()).filter(Boolean)
    : [];
  return { origin, dest, transit };
}

function mapMovementForClient(doc, extra = {}) {
  const m = doc?.toObject ? doc.toObject() : { ...doc };
  return {
    _id: m._id,
    vesselId: m.vesselId,
    vesselSnapshot: m.vesselSnapshot,
    skipper: m.skipper,
    originUnit: m.originUnit,
    destinationUnit: m.destinationUnit,
    informedUnits: m.informedUnits,
    departurePort: m.departurePort,
    destinationPort: m.destinationPort,
    eta: m.eta,
    status: m.status,
    tracking: m.tracking,
    ...extra,
  };
}

export async function userCanViewMovement(movement, user) {
  if (!movement || !user) return false;
  const unit = userUnit(user);
  if (unit) {
    const { origin, dest, transit } = movementUnits(movement);
    if (unit === origin || unit === dest || transit.includes(unit)) {
      return true;
    }
  }
  if (str(user?.role) === "skipper" && movement.vesselId) {
    const vessel = await VesselMongoose.findById(movement.vesselId).lean();
    return skipperCanManageVessel(vessel, user);
  }
  return false;
}

async function assertCanViewMovement(movement, user) {
  const ok = await userCanViewMovement(movement, user);
  if (!ok) throw httpError("No tiene acceso a este movimiento.", 403);
}

async function assertCanEmitPosition(movement, user) {
  assertSkipperRole(user);
  if (!movement?.tracking?.active || movement.status !== "inTransit") {
    throw httpError("El seguimiento no está activo para este movimiento.", 409);
  }
  const vessel = await VesselMongoose.findById(movement.vesselId).lean();
  if (!skipperCanManageVessel(vessel, user)) {
    throw httpError(
      "No está autorizado a enviar posiciones de este buque.",
      403
    );
  }
}

function validateCoordinates(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw httpError("Indique latitud y longitud válidas.");
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw httpError("Indique latitud y longitud válidas.");
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw httpError("Las coordenadas están fuera de rango.");
  }
}

function parsePositionTimestamp(value) {
  if (!value) throw httpError("Indique positionTimestamp.");
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) {
    throw httpError("positionTimestamp no válido.");
  }
  const now = Date.now();
  if (d.getTime() > now + MAX_FUTURE_MS) {
    throw httpError("positionTimestamp no puede estar en el futuro lejano.");
  }
  return d;
}

async function persistTrackingAlert({
  movementId,
  type,
  priority = "normal",
  payload = {},
  dedupeKey,
}) {
  const key = str(dedupeKey);
  if (!key) return null;
  try {
    return await SportMovementTrackingAlertMongoose.create({
      movementId,
      type,
      priority,
      payload,
      dedupeKey: key,
    });
  } catch (e) {
    if (e?.code === 11000) return null;
    throw e;
  }
}

async function notifyUnitsForMovement(movement, { type, title, body, dedupeKey }) {
  const { origin, dest, transit } = movementUnits(movement);
  const units = [...new Set([origin, dest, ...transit].filter(Boolean))];
  for (const unit of units) {
    try {
      await notifyAudience({
        audienceType: "unit",
        audienceValue: unit,
        type,
        title,
        body,
        href: `/mi-unidad/areas/movimientos-deportivos`,
        meta: { movementId: String(movement._id) },
        dedupeKey: `${dedupeKey}:${unit}`,
      });
    } catch {
      /* no bloquear flujo principal */
    }
  }
}

export async function startTrackingOnConfirm(doc, user) {
  const now = new Date();
  if (!doc.tracking) doc.tracking = {};
  doc.tracking.active = true;
  doc.tracking.startedAt = now;
  doc.tracking.communicationState = "normal";
  doc.tracking.stoppedAt = null;
  doc.tracking.stoppedBy = { userId: null, email: "", reason: "" };
  doc.tracking.etaOverdueAlertAt = null;
  doc.tracking.arrivalAlertAt = null;
  doc.tracking.noSignal5LastBucket = 0;
  doc.tracking.lastNoSignal5AlertAt = null;

  const movementId = doc._id;
  const dedupeKey = `tracking_started:${movementId}`;
  await persistTrackingAlert({
    movementId,
    type: "tracking_started",
    priority: "normal",
    payload: {
      vesselName: str(doc.vesselSnapshot?.name),
      originUnit: doc.originUnit,
      destinationUnit: doc.destinationUnit,
    },
    dedupeKey,
  });

  const movement = mapMovementForClient(doc);
  broadcastTrackingState({ movement, event: "tracking_started" });

  await notifyUnitsForMovement(movement, {
    type: "sport_movement_tracking_started",
    title: "Seguimiento GPS activado",
    body: `Se activó el seguimiento del buque ${str(doc.vesselSnapshot?.name) || "deportivo"}.`,
    dedupeKey,
  });
}

export async function stopMovementTracking(movementId, { reason, user } = {}) {
  if (!isValidObjectId(movementId)) return null;

  const now = new Date();
  const userId = user?._id || null;
  const email = userEmail(user);

  const doc = await SportMovementMongoose.findById(movementId).exec();
  if (!doc) return null;

  const wasActive = Boolean(doc.tracking?.active);
  if (!wasActive && doc.tracking?.stoppedAt) {
    return doc.toObject();
  }

  if (!doc.tracking) doc.tracking = {};
  doc.tracking.active = false;
  if (!doc.tracking.stoppedAt) doc.tracking.stoppedAt = now;
  doc.tracking.stoppedBy = {
    userId,
    email,
    reason: str(reason) || doc.tracking.stoppedBy?.reason || "",
  };
  await doc.save();

  const movement = mapMovementForClient(doc);
  broadcastTrackingState({ movement, event: "tracking_stopped", reason });

  if (wasActive && reason === "arrival") {
    const dedupeKey = `arrival_reported:${movementId}`;
    await persistTrackingAlert({
      movementId,
      type: "arrival_reported",
      priority: "normal",
      payload: { closedAt: now },
      dedupeKey,
    });
    if (!doc.tracking.arrivalAlertAt) {
      doc.tracking.arrivalAlertAt = now;
      await doc.save();
    }
  }

  return doc.toObject();
}

export async function recordPosition(movementId, body, user) {
  if (!isValidObjectId(movementId)) {
    throw httpError("Identificador no válido.", 400);
  }

  const movement = await SportMovementMongoose.findById(movementId).exec();
  if (!movement) throw httpError("Movimiento no encontrado.", 404);

  await assertCanEmitPosition(movement, user);

  const lat = Number(body?.latitude);
  const lng = Number(body?.longitude);
  validateCoordinates(lat, lng);

  const positionTimestamp = parsePositionTimestamp(
    body?.positionTimestamp ?? body?.timestamp
  );
  const receivedAt = new Date();
  const source = POSITION_SOURCES.has(str(body?.source))
    ? str(body.source)
    : "browser";

  const accuracy =
    body?.accuracy != null && Number.isFinite(Number(body.accuracy))
      ? Number(body.accuracy)
      : null;

  const positionDoc = await SportMovementPositionMongoose.create({
    movementId: movement._id,
    vesselId: movement.vesselId,
    userId: user._id,
    latitude: lat,
    longitude: lng,
    accuracy,
    positionTimestamp,
    receivedAt,
    source,
    movementStatusAtReceive: movement.status,
    speed:
      body?.speed != null && Number.isFinite(Number(body.speed))
        ? Number(body.speed)
        : null,
    heading:
      body?.heading != null && Number.isFinite(Number(body.heading))
        ? Number(body.heading)
        : null,
    altitude:
      body?.altitude != null && Number.isFinite(Number(body.altitude))
        ? Number(body.altitude)
        : null,
    batteryLevel:
      body?.batteryLevel != null && Number.isFinite(Number(body.batteryLevel))
        ? Number(body.batteryLevel)
        : null,
  });

  const prevState = movement.tracking?.communicationState || "normal";
  const prevLastPosition = movement.tracking?.lastPosition || null;
  const prevLastReceived = prevLastPosition?.receivedAt || null;
  const prevLastBucket = movement.tracking?.noSignal5LastBucket ?? 0;
  movement.tracking = movement.tracking || {};
  movement.tracking.lastPosition = {
    positionId: positionDoc._id,
    latitude: lat,
    longitude: lng,
    accuracy,
    positionTimestamp,
    receivedAt,
    userId: user._id,
    source,
  };
  movement.tracking.noSignal5LastBucket = 0;
  movement.tracking.lastNoSignal5AlertAt = null;
  if (prevState !== "normal") {
    movement.tracking.communicationState = "normal";
    const dedupeKey = `position_resumed:${movementId}:${receivedAt.getTime()}`;
    await persistTrackingAlert({
      movementId: movement._id,
      type: "position_resumed",
      priority: "normal",
      payload: { previousState: prevState },
      dedupeKey,
    });
  }
  await movement.save();

  if (prevLastReceived) {
    const prevMs =
      prevLastReceived instanceof Date
        ? prevLastReceived.getTime()
        : new Date(prevLastReceived).getTime();
    if (Number.isFinite(prevMs)) {
      const gap = receivedAt.getTime() - prevMs;
      if (gap > NO_SIGNAL_5_MS) {
        const gapBucket = Math.floor(gap / NO_SIGNAL_5_MS);
        const movementForGap = {
          ...movement.toObject(),
          tracking: {
            ...movement.tracking.toObject?.() || movement.tracking,
            lastPosition: prevLastPosition,
          },
        };
        for (let bucket = prevLastBucket + 1; bucket <= gapBucket; bucket += 1) {
          await raiseNoSignalAlert(movementForGap, {
            lastMs: prevMs,
            bucket,
            updateMovementState: false,
          });
        }
      }
    }
  }

  const movementLean = mapMovementForClient(movement);
  broadcastPositionUpdate({
    movement: movementLean,
    position: {
      _id: positionDoc._id,
      latitude: lat,
      longitude: lng,
      accuracy,
      positionTimestamp,
      receivedAt,
      source,
      userId: user._id,
    },
  });

  await evaluateMovementTracking(movementLean);
  return {
    position: positionDoc.toObject(),
    movement: movementLean,
  };
}

export async function listPositions(movementId, query, user) {
  if (!isValidObjectId(movementId)) {
    throw httpError("Identificador no válido.", 400);
  }
  const movement = await SportMovementMongoose.findById(movementId).lean();
  if (!movement) throw httpError("Movimiento no encontrado.", 404);
  await assertCanViewMovement(movement, user);

  const page = Math.max(1, parseInt(query?.page, 10) || 1);
  const limit = Math.min(
    2000,
    Math.max(1, parseInt(query?.limit, 10) || DEFAULT_PAGE_LIMIT)
  );
  const filter = { movementId };
  if (query?.from) {
    const from = new Date(query.from);
    if (Number.isFinite(from.getTime())) {
      filter.positionTimestamp = { ...(filter.positionTimestamp || {}), $gte: from };
    }
  }
  if (query?.to) {
    const to = new Date(query.to);
    if (Number.isFinite(to.getTime())) {
      filter.positionTimestamp = { ...(filter.positionTimestamp || {}), $lte: to };
    }
  }

  const [docs, total] = await Promise.all([
    SportMovementPositionMongoose.find(filter)
      .sort({ positionTimestamp: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SportMovementPositionMongoose.countDocuments(filter),
  ]);

  return {
    positions: docs,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getLastPosition(movementId, user) {
  if (!isValidObjectId(movementId)) {
    throw httpError("Identificador no válido.", 400);
  }
  const movement = await SportMovementMongoose.findById(movementId).lean();
  if (!movement) throw httpError("Movimiento no encontrado.", 404);
  await assertCanViewMovement(movement, user);

  await evaluateMovementTracking(movement);

  const lp = movement.tracking?.lastPosition;
  if (lp?.latitude != null && lp?.longitude != null) {
    return { lastPosition: lp, movement };
  }

  const last = await SportMovementPositionMongoose.findOne({ movementId })
    .sort({ receivedAt: -1 })
    .lean();
  return { lastPosition: last, movement };
}

export async function getTrackSummary(movementId, user) {
  if (!isValidObjectId(movementId)) {
    throw httpError("Identificador no válido.", 400);
  }
  const movement = await SportMovementMongoose.findById(movementId).lean();
  if (!movement) throw httpError("Movimiento no encontrado.", 404);
  await assertCanViewMovement(movement, user);

  const [first, last, count, points] = await Promise.all([
    SportMovementPositionMongoose.findOne({ movementId })
      .sort({ positionTimestamp: 1 })
      .select("latitude longitude positionTimestamp receivedAt")
      .lean(),
    SportMovementPositionMongoose.findOne({ movementId })
      .sort({ positionTimestamp: -1 })
      .select("latitude longitude positionTimestamp receivedAt")
      .lean(),
    SportMovementPositionMongoose.countDocuments({ movementId }),
    SportMovementPositionMongoose.find({ movementId })
      .sort({ positionTimestamp: 1 })
      .select("latitude longitude positionTimestamp receivedAt accuracy")
      .limit(5000)
      .lean(),
  ]);

  let minLat = null;
  let maxLat = null;
  let minLng = null;
  let maxLng = null;
  for (const p of points) {
    if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) continue;
    minLat = minLat == null ? p.latitude : Math.min(minLat, p.latitude);
    maxLat = maxLat == null ? p.latitude : Math.max(maxLat, p.latitude);
    minLng = minLng == null ? p.longitude : Math.min(minLng, p.longitude);
    maxLng = maxLng == null ? p.longitude : Math.max(maxLng, p.longitude);
  }

  return {
    movement,
    summary: {
      count,
      firstTimestamp: first?.positionTimestamp || null,
      lastTimestamp: last?.positionTimestamp || null,
      bounds:
        minLat != null
          ? { minLat, maxLat, minLng, maxLng }
          : null,
    },
    points,
  };
}

async function enrichMovementForMap(movement, user) {
  const lean = { ...movement };
  if (str(user?.role) === "skipper") {
    const vessel = await VesselMongoose.findById(movement.vesselId).lean();
    lean._skipperCanView = skipperCanManageVessel(vessel, user);
  }
  return lean;
}

export async function listActiveMapForUser(user) {
  const docs = await SportMovementMongoose.find({
    status: "inTransit",
    standBy: false,
    "tracking.active": true,
  })
    .sort({ "tracking.lastPosition.receivedAt": -1 })
    .lean();

  const out = [];
  for (const doc of docs) {
    const enriched = await enrichMovementForMap(doc, user);
    if (!(await userCanViewMovement(enriched, user))) continue;
    out.push({
      movementId: doc._id,
      vesselId: doc.vesselId,
      vesselName: str(doc.vesselSnapshot?.name),
      vesselReg: str(doc.vesselSnapshot?.nationalRegistryNumber),
      skipperName: str(doc.skipper?.fullName),
      skipper: doc.skipper || {},
      originUnit: doc.originUnit,
      destinationUnit: doc.destinationUnit,
      departurePort: doc.departurePort,
      destinationPort: doc.destinationPort,
      eta: doc.eta,
      delayedNotifiedAt: doc.delayedNotifiedAt,
      tracking: doc.tracking,
      lastPosition: doc.tracking?.lastPosition || null,
    });
  }

  evaluateActiveMovementTracking().catch(() => {});

  return out;
}

export async function getSkipperTrackingStatus(user) {
  assertSkipperRole(user);

  const docs = await SportMovementMongoose.find({
    status: "inTransit",
    standBy: false,
    "tracking.active": true,
  }).lean();

  for (const doc of docs) {
    const vessel = await VesselMongoose.findById(doc.vesselId).lean();
    if (!skipperCanManageVessel(vessel, user)) continue;
    return {
      shouldEmit: true,
      movement: doc,
      movementId: doc._id,
      tracking: doc.tracking,
    };
  }

  return {
    shouldEmit: false,
    movement: null,
    movementId: null,
    tracking: null,
  };
}

async function raiseNoSignalAlert(
  movement,
  { lastMs, bucket, updateMovementState = true }
) {
  const movementId = movement._id;
  const type = "no_signal_5";
  const priority = "critical";
  const dedupeKey = `${type}:${movementId}:${lastMs}:${bucket}`;

  const alert = await persistTrackingAlert({
    movementId,
    type,
    priority,
    payload: {
      lastPosition: movement.tracking?.lastPosition || null,
      vesselName: str(movement.vesselSnapshot?.name),
      bucket,
      silentMinutes: bucket * 5,
    },
    dedupeKey,
  });
  if (!alert) return false;

  const now = new Date();
  if (updateMovementState) {
    await SportMovementMongoose.updateOne(
      { _id: movementId, "tracking.active": true },
      {
        $set: {
          "tracking.communicationState": "no_signal_5",
          "tracking.noSignal5LastBucket": bucket,
          "tracking.lastNoSignal5AlertAt": now,
        },
      }
    );
  }

  const updated = updateMovementState
    ? await SportMovementMongoose.findById(movementId).lean()
    : movement;
  const movementClient = mapMovementForClient(updated);
  broadcastTrackingAlert({
    movement: movementClient,
    alert: { type, priority, bucket },
  });
  broadcastTrackingState({
    movement: movementClient,
    event: type,
  });

  const vesselName = str(movement.vesselSnapshot?.name) || "buque deportivo";
  const silentMinutes = bucket * 5;
  await notifyUnitsForMovement(movementClient, {
    type: "sport_movement_no_signal_5",
    title: "Sin señal GPS (5 min)",
    body: `No se recibieron posiciones del ${vesselName} en los últimos ${silentMinutes} minutos.`,
    dedupeKey,
  });

  await sendSportMovementNoSignal5Emails(updated || movement, { bucket });
  return true;
}

/**
 * Materializa alerta e inbox de ETA vencida (origen + destino + tránsito).
 * Idempotente vía delayedNotifiedAt.
 * @returns {Promise<boolean>} true si se procesó
 */
export async function processEtaOverdueForMovement(movement) {
  if (!movement?._id) return false;
  if (movement.delayedNotifiedAt) return false;
  if (!movement.eta) return false;

  const eta =
    movement.eta instanceof Date ? movement.eta : new Date(movement.eta);
  if (!Number.isFinite(eta.getTime()) || Date.now() <= eta.getTime()) {
    return false;
  }

  const movementId = movement._id;
  const dedupeKey = `eta_overdue:${movementId}`;
  const vesselName = str(movement.vesselSnapshot?.name) || "buque deportivo";
  const reg = str(movement.vesselSnapshot?.nationalRegistryNumber);
  const regSuffix = reg ? ` (${reg})` : "";

  await persistTrackingAlert({
    movementId,
    type: "eta_overdue",
    priority: "warning",
    payload: { eta, vesselName },
    dedupeKey,
  });

  const movementClient = mapMovementForClient(movement);
  await notifyUnitsForMovement(movementClient, {
    type: "sport_movement_eta_overdue",
    title: "ETA vencida",
    body: `El movimiento del buque ${vesselName}${regSuffix} superó la ETA estimada.`,
    dedupeKey,
  });

  if (movement.tracking?.active) {
    broadcastTrackingAlert({
      movement: movementClient,
      alert: { type: "eta_overdue", priority: "warning" },
    });
  }

  const now = new Date();
  await SportMovementMongoose.updateOne(
    { _id: movementId },
    {
      $set: {
        delayedNotifiedAt: now,
        "tracking.etaOverdueAlertAt": now,
      },
    }
  );
  return true;
}

/**
 * Procesa movimientos inTransit con ETA vencida (reemplaza demoras duplicadas).
 */
export async function materializeEtaOverdueAlerts({ limit = 40 } = {}) {
  const now = new Date();
  const batch = await SportMovementMongoose.find({
    status: "inTransit",
    standBy: false,
    eta: { $lt: now },
    $or: [{ delayedNotifiedAt: null }, { delayedNotifiedAt: { $exists: false } }],
  })
    .sort({ eta: 1 })
    .limit(Math.min(100, Math.max(1, Number(limit) || 40)))
    .lean();

  let processed = 0;
  for (const m of batch) {
    if (await processEtaOverdueForMovement(m)) processed += 1;
  }
  return { processed };
}

export async function evaluateMovementTracking(movement) {
  if (!movement?.tracking?.active || movement.status !== "inTransit") {
    if (movement?.status === "inTransit" && !movement.delayedNotifiedAt) {
      await processEtaOverdueForMovement(movement);
    }
    return;
  }

  await processEtaOverdueForMovement(movement);

  const lastReceived = movement.tracking?.lastPosition?.receivedAt;
  if (!lastReceived) return;

  const lastMs =
    lastReceived instanceof Date
      ? lastReceived.getTime()
      : new Date(lastReceived).getTime();
  if (!Number.isFinite(lastMs)) return;

  const elapsed = Date.now() - lastMs;
  const bucket = Math.floor(elapsed / NO_SIGNAL_5_MS);
  if (bucket < 1) return;

  const lastBucket = movement.tracking?.noSignal5LastBucket ?? 0;
  if (bucket <= lastBucket) return;

  await raiseNoSignalAlert(movement, { lastMs, bucket });
}

export async function evaluateActiveMovementTracking() {
  const docs = await SportMovementMongoose.find({
    status: "inTransit",
    standBy: false,
  }).lean();

  for (const doc of docs) {
    await evaluateMovementTracking(doc);
  }
}

export function startTrackingMonitor() {
  if (monitorTimer) return;
  monitorTimer = setInterval(() => {
    evaluateActiveMovementTracking().catch(() => {});
  }, 60_000);
}

export { userCanViewMovementTracking };
