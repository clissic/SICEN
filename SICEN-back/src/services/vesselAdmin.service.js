import { isValidObjectId } from "mongoose";
import { VesselAdminRequestMongoose } from "../DAO/models/mongoose/vesselAdminRequests.mongoose.js";
import { VesselMongoose } from "../DAO/models/mongoose/vessels.mongoose.js";
import { UserMongoose } from "../DAO/models/mongoose/users.mongoose.js";
import { findUnitByAcronym } from "./units.service.js";
import {
  mapDeportivoVesselSummary,
  findVesselDocumentByIdentifier,
} from "./vessels.service.js";
import {
  sendVesselAdminRequestEmail,
  sendVesselAdminRejectedEmail,
} from "./vesselAdminEmails.service.js";
import {
  buildVesselAdminEmailPayload,
  encodeVesselAdminEmailToken,
  verifyVesselAdminEmailToken,
} from "../utils/vesselAdminEmailToken.js";
import {
  deleteVesselAdminProofFile,
  resolveVesselAdminProofAbsolute,
} from "../utils/vesselAdminProofFiles.js";
import {
  ownerLabelFromSkipper,
  ownerStringMatchesSkipper,
  skipperCanManageVessel,
} from "../utils/skipperVesselOwner.js";
import { SportMovementMongoose } from "../DAO/models/mongoose/sportMovements.mongoose.js";

const REQUESTS_PER_WEEK = 5;

function str(v) {
  return String(v ?? "").trim();
}

function httpError(msg, status = 400) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

function normalizeName(s) {
  return str(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeMatricula(s) {
  return str(s).toUpperCase().replace(/\s+/g, "");
}

function normalizePort(s) {
  return str(s).toUpperCase();
}

function assertSkipper(user) {
  if (str(user?.role) !== "skipper") {
    throw httpError("Solo disponible para náutas deportivos.", 403);
  }
}

function assertPnnStaff(user) {
  const role = str(user?.role);
  if (role === "skipper" || role === "seaman" || role === "agency") {
    throw httpError("Solo personal de la PNN puede realizar esta acción.", 403);
  }
}

function proofPublicMeta(doc) {
  if (!doc?.storedName) return null;
  return {
    originalName: doc.originalName || "documento-prueba",
    mimeType: doc.mimeType || "",
    size: doc.size || 0,
    available: true,
  };
}

function vesselFieldSnapshot(d) {
  return {
    name: str(d.generalInfo?.name),
    recreationalDocType: str(d.recreationalDocType),
    nationalRegistryNumber: str(d.identification?.nationalRegistryNumber),
    portOfRegistry: str(d.generalInfo?.portOfRegistry),
  };
}

function matchFields(query, vesselSnap) {
  const matched = [];
  if (
    normalizeName(query.name) &&
    normalizeName(query.name) === normalizeName(vesselSnap.name)
  ) {
    matched.push("name");
  }
  if (
    str(query.recreationalDocType) &&
    str(query.recreationalDocType) === vesselSnap.recreationalDocType
  ) {
    matched.push("recreationalDocType");
  }
  if (
    normalizeMatricula(query.nationalRegistryNumber) &&
    normalizeMatricula(query.nationalRegistryNumber) ===
      normalizeMatricula(vesselSnap.nationalRegistryNumber)
  ) {
    matched.push("nationalRegistryNumber");
  }
  if (
    normalizePort(query.portOfRegistry) &&
    normalizePort(query.portOfRegistry) ===
      normalizePort(vesselSnap.portOfRegistry)
  ) {
    matched.push("portOfRegistry");
  }
  return matched;
}

/**
 * Búsqueda para reclamar buque: exacto (4 campos) o sugerencias parciales.
 */
export async function searchDeportivoForClaim(user, body = {}) {
  assertSkipper(user);
  const name = str(body.name);
  const recreationalDocType = str(body.recreationalDocType);
  const nationalRegistryNumber = str(body.nationalRegistryNumber);
  const portOfRegistry = str(body.portOfRegistry);

  if (!name) throw httpError("Indique el nombre del buque.");
  if (!recreationalDocType) {
    throw httpError("Seleccione la documentación deportiva.");
  }
  if (!nationalRegistryNumber) throw httpError("Indique la matrícula nacional.");
  if (!portOfRegistry) throw httpError("Indique el puerto de matrícula.");

  const query = {
    name,
    recreationalDocType,
    nationalRegistryNumber,
    portOfRegistry,
  };

  const docs = await VesselMongoose.find({ vesselType: "Deportivo" })
    .select(
      "id vesselType recreationalDocType recreationalCategory generalInfo identification ownership propulsion"
    )
    .lean();

  const exact = [];
  const partial = [];

  for (const d of docs) {
    const snap = vesselFieldSnapshot(d);
    const matched = matchFields(query, snap);
    if (matched.length === 4) {
      exact.push({ vessel: mapDeportivoVesselSummary(d), matchedFields: matched });
    } else if (matched.length >= 1) {
      partial.push({
        vessel: mapDeportivoVesselSummary(d),
        matchedFields: matched,
      });
    }
  }

  if (exact.length === 1) {
    return {
      exact: exact[0].vessel,
      suggestions: [],
      msg: "Buque encontrado con coincidencia exacta.",
    };
  }
  if (exact.length > 1) {
    return {
      exact: null,
      suggestions: exact,
      msg: "Hay más de un buque con esos datos exactos. Revise o contacte a la prefectura.",
    };
  }

  if (partial.length) {
    partial.sort((a, b) => b.matchedFields.length - a.matchedFields.length);
    return {
      exact: null,
      suggestions: partial.slice(0, 15),
      msg: "No se encontró un resultado con los parámetros ingresados. ¿Podría referirse a alguno de estos?",
    };
  }

  return {
    exact: null,
    suggestions: [],
    msg: "No se encontró ningún buque deportivo con esos datos.",
  };
}

export async function getSkipperVesselAdminStatus(user) {
  assertSkipper(user);
  const pending = await VesselAdminRequestMongoose.find({
    userId: user._id,
    status: "pending",
  })
    .sort({ requestedAt: -1 })
    .lean();

  const vesselIds = pending.map((r) => r.vesselId);
  const vessels = vesselIds.length
    ? await VesselMongoose.find({ _id: { $in: vesselIds } })
        .select(
          "id vesselType recreationalDocType generalInfo identification ownership"
        )
        .lean()
    : [];
  const byId = Object.fromEntries(vessels.map((v) => [String(v._id), v]));

  return {
    pendingRequests: pending.map((r) => ({
      _id: String(r._id),
      claimType: r.claimType,
      unitAcronym: r.unitAcronym,
      requestedAt: r.requestedAt,
      vessel: byId[String(r.vesselId)]
        ? mapDeportivoVesselSummary(byId[String(r.vesselId)])
        : null,
    })),
  };
}

export async function requestVesselAdmin(
  user,
  {
    vesselId,
    unitAcronym,
    claimType,
    proofFile,
  } = {}
) {
  assertSkipper(user);
  const cleanup = () => {
    if (proofFile?.filename) deleteVesselAdminProofFile(proofFile.filename);
  };

  if (!proofFile?.filename) {
    throw httpError(
      "Adjunte el documento de propiedad, matrícula a su nombre o carta poder."
    );
  }

  const claim = str(claimType);
  if (claim !== "owner" && claim !== "admin") {
    cleanup();
    throw httpError("Indique si solicita como propietario o como administrador.");
  }

  const acronym = str(unitAcronym).toUpperCase();
  if (!acronym) {
    cleanup();
    throw httpError("Seleccione la prefectura.");
  }

  if (!isValidObjectId(vesselId) && !str(vesselId)) {
    cleanup();
    throw httpError("Identificador de buque no válido.");
  }

  const unit = await findUnitByAcronym(acronym);
  if (!unit) {
    cleanup();
    throw httpError("La prefectura indicada no existe.");
  }
  const mmEmail = str(unit.emailMarinaMercante);
  if (!mmEmail || !mmEmail.includes("@")) {
    cleanup();
    throw httpError(
      "Esa prefectura no tiene email de Marina Mercante cargado."
    );
  }

  const vesselDoc = await findVesselDocumentByIdentifier(vesselId);
  if (!vesselDoc || str(vesselDoc.vesselType) !== "Deportivo") {
    cleanup();
    throw httpError("Buque deportivo no encontrado.", 404);
  }

  const admins = vesselDoc.ownership?.administrators || [];
  if (admins.some((a) => String(a.userId) === String(user._id))) {
    cleanup();
    throw httpError("Ya está vinculado a este buque.");
  }

  const pendingSame = await VesselAdminRequestMongoose.findOne({
    userId: user._id,
    vesselId: vesselDoc._id,
    status: "pending",
  }).lean();
  if (pendingSame) {
    cleanup();
    throw httpError(
      "Ya tiene una solicitud pendiente para este buque. Cancélela o aguarde."
    );
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentCount = await VesselAdminRequestMongoose.countDocuments({
    userId: user._id,
    requestedAt: { $gte: weekAgo },
  });
  if (recentCount >= REQUESTS_PER_WEEK) {
    cleanup();
    throw httpError(
      `Alcanzó el máximo de ${REQUESTS_PER_WEEK} solicitudes esta semana.`
    );
  }

  const proofDocument = {
    storedName: proofFile.filename,
    originalName: str(proofFile.originalname) || proofFile.filename,
    mimeType: str(proofFile.mimetype) || "",
    size: Number(proofFile.size) || 0,
  };

  let request;
  try {
    request = await VesselAdminRequestMongoose.create({
      status: "pending",
      claimType: claim,
      userId: user._id,
      vesselId: vesselDoc._id,
      unitAcronym: acronym,
      requestedBy: str(user.email),
      proofDocument,
    });
  } catch (e) {
    cleanup();
    throw e;
  }

  const token = encodeVesselAdminEmailToken(
    buildVesselAdminEmailPayload({
      requestId: request._id,
      vesselId: vesselDoc._id,
      vesselBusinessId: vesselDoc.id || vesselDoc._id,
    })
  );
  request.emailTokenId = token.slice(0, 24);
  await request.save();

  await sendVesselAdminRequestEmail({
    unit,
    request,
    user,
    vessel: vesselDoc.toObject ? vesselDoc.toObject() : vesselDoc,
    token,
  });

  return {
    msg: `Solicitud enviada a Marina Mercante de ${acronym}.`,
    request: {
      _id: String(request._id),
      claimType: claim,
      unitAcronym: acronym,
      status: "pending",
    },
  };
}

export async function cancelVesselAdminRequest(user, { requestId } = {}) {
  assertSkipper(user);
  if (!isValidObjectId(requestId)) {
    throw httpError("Identificador de solicitud no válido.");
  }
  const request = await VesselAdminRequestMongoose.findById(requestId).exec();
  if (!request) throw httpError("Solicitud no encontrada.", 404);
  if (String(request.userId) !== String(user._id)) {
    throw httpError("La solicitud no corresponde a su cuenta.", 403);
  }
  if (request.status !== "pending") {
    throw httpError("La solicitud ya no está pendiente.");
  }

  request.status = "cancelled";
  request.resolvedAt = new Date();
  request.resolvedBy = str(user.email);
  if (request.proofDocument?.storedName) {
    deleteVesselAdminProofFile(request.proofDocument.storedName);
    request.proofDocument = null;
  }
  await request.save();
  return { msg: "Solicitud cancelada." };
}

export async function listVesselAdminRequests(vesselIdParam, actor) {
  assertPnnStaff(actor);
  const vesselDoc = await findVesselDocumentByIdentifier(vesselIdParam);
  if (!vesselDoc) throw httpError("Buque no encontrado.", 404);

  const pending = await VesselAdminRequestMongoose.find({
    vesselId: vesselDoc._id,
    status: "pending",
  })
    .sort({ requestedAt: -1 })
    .lean();

  const users = {};
  for (const r of pending) {
    const uid = String(r.userId);
    if (users[uid]) continue;
    const u = await UserMongoose.findById(r.userId)
      .select("first_name last_name email documentId phone role")
      .lean();
    if (u) users[uid] = u;
  }

  const admins = vesselDoc.ownership?.administrators || [];
  const adminUsers = {};
  for (const a of admins) {
    const uid = String(a.userId);
    if (adminUsers[uid]) continue;
    const u = await UserMongoose.findById(a.userId)
      .select("first_name last_name email documentId role")
      .lean();
    if (u) adminUsers[uid] = u;
  }

  return {
    vesselId: String(vesselDoc._id),
    vesselBusinessId: vesselDoc.id || String(vesselDoc._id),
    pendingRequests: pending.map((r) => ({
      _id: String(r._id),
      claimType: r.claimType,
      unitAcronym: r.unitAcronym,
      requestedAt: r.requestedAt,
      requestedBy: r.requestedBy,
      proofDocument: proofPublicMeta(r.proofDocument),
      user: users[String(r.userId)]
        ? {
            _id: String(users[String(r.userId)]._id),
            first_name: users[String(r.userId)].first_name,
            last_name: users[String(r.userId)].last_name,
            email: users[String(r.userId)].email,
            documentId: users[String(r.userId)].documentId || "",
          }
        : null,
    })),
    administrators: admins.map((a) => ({
      userId: String(a.userId),
      claimType: a.claimType,
      linkedAt: a.linkedAt,
      linkedBy: a.linkedBy || "",
      linkedByUnit: a.linkedByUnit || "",
      user: adminUsers[String(a.userId)]
        ? {
            _id: String(adminUsers[String(a.userId)]._id),
            first_name: adminUsers[String(a.userId)].first_name,
            last_name: adminUsers[String(a.userId)].last_name,
            email: adminUsers[String(a.userId)].email,
            documentId: adminUsers[String(a.userId)].documentId || "",
          }
        : null,
    })),
  };
}

async function loadRequest(requestId) {
  if (!isValidObjectId(requestId)) {
    throw httpError("Identificador de solicitud no válido.");
  }
  const request = await VesselAdminRequestMongoose.findById(requestId).exec();
  if (!request) throw httpError("Solicitud no encontrada.", 404);
  return request;
}

function upsertAdministrator(vesselDoc, { userId, claimType, actor }) {
  if (!vesselDoc.ownership) vesselDoc.ownership = {};
  if (!Array.isArray(vesselDoc.ownership.administrators)) {
    vesselDoc.ownership.administrators = [];
  }
  const list = vesselDoc.ownership.administrators;
  const idx = list.findIndex((a) => String(a.userId) === String(userId));
  const entry = {
    userId,
    claimType,
    linkedAt: new Date(),
    linkedBy: str(actor.email),
    linkedByUnit: str(actor.unit).toUpperCase(),
  };
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  vesselDoc.markModified("ownership");
}

export async function approveVesselAdminRequest(
  requestId,
  actor,
  { identityVerified } = {}
) {
  assertPnnStaff(actor);
  if (!identityVerified) {
    throw httpError(
      "Debe confirmar que verificó la documentación del solicitante."
    );
  }

  const request = await loadRequest(requestId);
  if (request.status !== "pending") {
    throw httpError("La solicitud no está pendiente.");
  }

  const userDoc = await UserMongoose.findById(request.userId).exec();
  if (!userDoc || str(userDoc.role) !== "skipper") {
    throw httpError("El solicitante ya no es un náuta válido.");
  }

  const vesselDoc = await VesselMongoose.findById(request.vesselId).exec();
  if (!vesselDoc) throw httpError("Buque no encontrado.", 404);

  upsertAdministrator(vesselDoc, {
    userId: userDoc._id,
    claimType: request.claimType,
    actor,
  });

  if (request.claimType === "owner") {
    vesselDoc.ownership.owner = ownerLabelFromSkipper(userDoc);
  }
  await vesselDoc.save();

  request.status = "approved";
  request.resolvedAt = new Date();
  request.resolvedBy = str(actor.email);
  await request.save();

  return {
    msg:
      request.claimType === "owner"
        ? "Solicitante vinculado como propietario del buque."
        : "Solicitante vinculado como administrador del buque.",
  };
}

export async function rejectVesselAdminRequest(
  requestId,
  actor,
  { reason } = {}
) {
  assertPnnStaff(actor);
  const rejectReason = str(reason);
  if (!rejectReason) throw httpError("Indique el motivo del rechazo.");

  const request = await loadRequest(requestId);
  if (request.status !== "pending") {
    throw httpError("La solicitud no está pendiente.");
  }

  request.status = "rejected";
  request.reason = rejectReason;
  request.resolvedAt = new Date();
  request.resolvedBy = str(actor.email);
  await request.save();

  const userDoc = await UserMongoose.findById(request.userId).lean();
  const vesselDoc = await VesselMongoose.findById(request.vesselId).lean();
  if (userDoc && vesselDoc) {
    try {
      await sendVesselAdminRejectedEmail({
        user: userDoc,
        vessel: vesselDoc,
        reason: rejectReason,
        claimType: request.claimType,
      });
    } catch (e) {
      /* no bloquear el rechazo si falla el mail */
    }
  }

  return { msg: "Solicitud rechazada. Se avisó al solicitante por email." };
}

export async function addVesselAdministrator(
  vesselIdParam,
  actor,
  { userId, claimType } = {}
) {
  assertPnnStaff(actor);
  const claim = str(claimType) || "admin";
  if (claim !== "owner" && claim !== "admin") {
    throw httpError("Tipo de vínculo no válido.");
  }
  if (!isValidObjectId(userId)) {
    throw httpError("Identificador de usuario no válido.");
  }

  const vesselDoc = await findVesselDocumentByIdentifier(vesselIdParam);
  if (!vesselDoc) throw httpError("Buque no encontrado.", 404);
  if (str(vesselDoc.vesselType) !== "Deportivo") {
    throw httpError("Solo aplica a buques deportivos.");
  }

  const userDoc = await UserMongoose.findById(userId).exec();
  if (!userDoc || str(userDoc.role) !== "skipper") {
    throw httpError("Solo se pueden vincular cuentas de náuta deportivo.");
  }

  if (claim === "owner") {
    const existingOwner = (vesselDoc.ownership?.administrators || []).find(
      (a) => a.claimType === "owner" && String(a.userId) !== String(userId)
    );
    if (existingOwner) {
      throw httpError("Este buque ya tiene un propietario vinculado.");
    }
  }

  upsertAdministrator(vesselDoc, {
    userId: userDoc._id,
    claimType: claim,
    actor,
  });
  if (claim === "owner") {
    vesselDoc.ownership.owner = ownerLabelFromSkipper(userDoc);
  }
  await vesselDoc.save();

  return {
    msg: "Administrador agregado.",
    administrators: (vesselDoc.ownership.administrators || []).map((a) => ({
      userId: String(a.userId),
      claimType: a.claimType,
    })),
  };
}

export async function removeVesselAdministrator(
  vesselIdParam,
  adminUserId,
  actor
) {
  assertPnnStaff(actor);
  if (!isValidObjectId(adminUserId)) {
    throw httpError("Identificador de usuario no válido.");
  }
  const vesselDoc = await findVesselDocumentByIdentifier(vesselIdParam);
  if (!vesselDoc) throw httpError("Buque no encontrado.", 404);

  const list = vesselDoc.ownership?.administrators || [];
  const next = list.filter((a) => String(a.userId) !== String(adminUserId));
  if (next.length === list.length) {
    throw httpError("Ese usuario no figura como administrador de este buque.");
  }
  vesselDoc.ownership.administrators = next;
  vesselDoc.markModified("ownership");
  await vesselDoc.save();
  return { msg: "Administrador quitado del buque." };
}

async function assertNoActiveMovementOnVessel(vesselMongoId, user) {
  const docNumber = str(user?.documentId);
  if (!docNumber || !vesselMongoId) return;
  const active = await SportMovementMongoose.findOne({
    status: "inTransit",
    vesselId: vesselMongoId,
    "skipper.documentNumber": docNumber,
  }).lean();
  if (active) {
    throw httpError(
      "No puede desvincular el buque mientras tiene un despacho en curso.",
      400
    );
  }
}

/**
 * El náuta se desvincula de un buque deportivo (quita su entrada en administrators
 * y, si era propietario vinculado, limpia ownership.owner cuando corresponde).
 */
export async function skipperUnlinkFromVessel(user, { vesselId } = {}) {
  assertSkipper(user);
  const vesselDoc = await findVesselDocumentByIdentifier(vesselId);
  if (!vesselDoc) throw httpError("Buque no encontrado.", 404);
  if (str(vesselDoc.vesselType) !== "Deportivo") {
    throw httpError("Solo aplica a buques deportivos.");
  }

  if (!skipperCanManageVessel(vesselDoc.toObject?.() || vesselDoc, user)) {
    throw httpError("No está vinculado a este buque.", 403);
  }

  await assertNoActiveMovementOnVessel(vesselDoc._id, user);

  const uid = String(user._id);
  const admins = vesselDoc.ownership?.administrators || [];
  const adminEntry = admins.find((a) => String(a.userId) === uid);

  if (adminEntry) {
    vesselDoc.ownership.administrators = admins.filter(
      (a) => String(a.userId) !== uid
    );
    if (
      adminEntry.claimType === "owner" ||
      ownerStringMatchesSkipper(vesselDoc.ownership?.owner, user)
    ) {
      vesselDoc.ownership.owner = "";
    }
    vesselDoc.markModified("ownership");
    await vesselDoc.save();
    return { msg: "Buque desvinculado de su cuenta." };
  }

  if (ownerStringMatchesSkipper(vesselDoc.ownership?.owner, user)) {
    vesselDoc.ownership.owner = "";
    vesselDoc.markModified("ownership");
    await vesselDoc.save();
    return { msg: "Buque desvinculado de su cuenta." };
  }

  throw httpError("No está vinculado a este buque.", 403);
}

export async function getVesselAdminProofDocument(requestId, actor) {
  assertPnnStaff(actor);
  const request = await loadRequest(requestId);
  const meta = request.proofDocument;
  if (!meta?.storedName) {
    throw httpError("Esta solicitud no tiene documento adjunto.", 404);
  }
  const absolute = resolveVesselAdminProofAbsolute(meta.storedName);
  if (!absolute) {
    throw httpError("No se encontró el archivo.", 404);
  }
  return {
    absolutePath: absolute,
    originalName: meta.originalName || meta.storedName,
    mimeType: meta.mimeType || "application/octet-stream",
  };
}

export async function previewVesselAdminEmailToken(token, actor) {
  assertPnnStaff(actor);
  const payload = verifyVesselAdminEmailToken(token);
  if (!payload) throw httpError("El enlace no es válido o expiró.", 400);
  return payload;
}

/**
 * ¿El usuario skipper está vinculado al buque (owner string o administrators)?
 */
export function userIsVesselAdministrator(vesselLean, userId) {
  const admins = vesselLean?.ownership?.administrators || [];
  return admins.some((a) => String(a.userId) === String(userId));
}
