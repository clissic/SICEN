import { isValidObjectId } from "mongoose";
import { SeafarerLinkRequestMongoose } from "../DAO/models/mongoose/seafarerLinkRequests.mongoose.js";
import { UserMongoose } from "../DAO/models/mongoose/users.mongoose.js";
import { SeafarerMongoose } from "../DAO/models/mongoose/seafarers.mongoose.js";
import { LicenceMongoose } from "../DAO/models/mongoose/licences.mongoose.js";
import {
  normalizeSeafarerDni,
  normalizeSeafarerPassport,
} from "../utils/seafarerDocument.js";
import {
  normalizeSportBrevetCategory,
  SPORT_BREVET_KEYS,
} from "../constants/seafarerSportBrevet.js";
import {
  addSeafarerObservation,
  getSeafarerById,
  seafarerAuditLabelFromUser,
} from "./seafarers.service.js";
import { findUnitByAcronym } from "./units.service.js";
import {
  sendSeafarerLinkRequestEmail,
  sendSeafarerUnlinkRequestEmail,
} from "./seafarerLinkEmails.service.js";
import {
  buildSeafarerLinkEmailPayload,
  encodeSeafarerLinkEmailToken,
  verifySeafarerLinkEmailToken,
} from "../utils/seafarerLinkEmailToken.js";
import {
  deleteSeafarerLinkIdentityFile,
  resolveSeafarerLinkIdentityAbsolute,
} from "../utils/seafarerLinkIdentityFiles.js";

const LINK_REQUESTS_PER_WEEK = 3;

/** Cuenta con vínculo activo (o desvinculación en trámite). */
export function isSeafarerLinkActiveStatus(status) {
  return status === "linked" || status === "pending_unlink";
}

/** True si la ficha tiene una cuenta SICEN vinculada (o pending_unlink). */
export async function isSeafarerIdentityLocked(seafarerId) {
  if (!isValidObjectId(seafarerId)) return false;
  const linked = await UserMongoose.findOne({
    "seafarerLink.seafarerId": seafarerId,
    "seafarerLink.status": { $in: ["linked", "pending_unlink"] },
  })
    .select("_id")
    .lean();
  return Boolean(linked);
}

/**
 * Si el nombre de la cuenta no coincide con la ficha PNN, alinea
 * first_name / last_name del usuario al registro oficial.
 * @returns {{ changed: boolean, from?: string, to?: string }}
 */
function syncUserNameFromSeafarer(userDoc, seafarer) {
  const pd = seafarer?.personalData || {};
  const sfFirst = str(pd.firstName);
  const sfLast = str(pd.lastName);
  if (!sfFirst && !sfLast) return { changed: false };

  const curFirst = str(userDoc.first_name);
  const curLast = str(userDoc.last_name);
  const mismatch =
    (sfFirst && normalizeNamePart(curFirst) !== normalizeNamePart(sfFirst)) ||
    (sfLast && normalizeNamePart(curLast) !== normalizeNamePart(sfLast));
  if (!mismatch) return { changed: false };

  const from = `${curFirst} ${curLast}`.trim();
  if (sfFirst) userDoc.first_name = sfFirst;
  if (sfLast) userDoc.last_name = sfLast;
  const to = `${str(userDoc.first_name)} ${str(userDoc.last_name)}`.trim();
  return { changed: true, from, to };
}

function identityDocumentPublicMeta(doc) {
  if (!doc?.storedName) return null;
  return {
    originalName: doc.originalName || "documento-identidad",
    mimeType: doc.mimeType || "",
    size: doc.size || 0,
    available: true,
  };
}

function str(v) {
  return String(v ?? "").trim();
}

function httpError(msg, status = 400) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

function emptyLink() {
  return {
    seafarerId: null,
    status: "none",
    linkedAt: null,
    linkedBy: "",
    linkedByUnit: "",
    activeRequestId: null,
  };
}

function normalizeNamePart(s) {
  return str(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function sameCalendarDay(a, b) {
  if (!a || !b) return null;
  const da = a instanceof Date ? a : new Date(a);
  const db = b instanceof Date ? b : new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null;
  return (
    da.getUTCFullYear() === db.getUTCFullYear() &&
    da.getUTCMonth() === db.getUTCMonth() &&
    da.getUTCDate() === db.getUTCDate()
  );
}

function computeCoherenceFlags(user, seafarer) {
  const pd = seafarer?.personalData || {};
  const contact = seafarer?.contact || {};
  const userFirst = normalizeNamePart(user?.first_name);
  const userLast = normalizeNamePart(user?.last_name);
  const sfFirst = normalizeNamePart(pd.firstName);
  const sfLast = normalizeNamePart(pd.lastName);
  const nameMismatch =
    Boolean(userFirst && sfFirst && userFirst !== sfFirst) ||
    Boolean(userLast && sfLast && userLast !== sfLast);

  const birthCmp = sameCalendarDay(user?.FN, pd.birthDate);
  const birthDateMismatch = birthCmp === false;

  const userPhone = str(user?.phone).replace(/\D/g, "");
  const sfPhone = str(contact.phone).replace(/\D/g, "");
  const phoneMismatch = Boolean(
    userPhone && sfPhone && userPhone !== sfPhone
  );

  const userEmail = str(user?.email).toLowerCase();
  const sfEmail = str(contact.email).toLowerCase();
  const emailMismatch = Boolean(
    userEmail && sfEmail && userEmail !== sfEmail
  );

  return {
    nameMismatch,
    birthDateMismatch,
    phoneMismatch,
    emailMismatch,
  };
}

async function loadUyBdLicenseIds() {
  const docs = await LicenceMongoose.find(
    { code: "UY_BD", kind: "license" },
    { _id: 1 }
  ).lean();
  return new Set(docs.map((d) => String(d._id)));
}

function extractSportBrevet(seafarer, uyBdIds) {
  const held = Array.isArray(seafarer?.heldLicenses)
    ? seafarer.heldLicenses
    : [];
  for (const hl of held) {
    const licenseIdRaw = hl?.licenseId;
    const licenseId =
      licenseIdRaw != null && typeof licenseIdRaw === "object"
        ? String(licenseIdRaw._id ?? "")
        : String(licenseIdRaw ?? "");
    if (!licenseId || !uyBdIds.has(licenseId)) continue;
    const cat = normalizeSportBrevetCategory(hl?.category);
    if (cat && SPORT_BREVET_KEYS.has(cat)) return cat;
  }
  return null;
}

function seafarerDisplayName(seafarer) {
  const pd = seafarer?.personalData || {};
  const last = str(pd.lastName);
  const first = str(pd.firstName);
  if (last && first) return `${last}, ${first}`;
  return last || first || "";
}

/**
 * Busca ficha por documentId del usuario (DNI luego pasaporte).
 * @returns {Promise<object|null>}
 */
export async function findSeafarerMatchingUserDocument(documentId) {
  const raw = str(documentId);
  if (!raw) return null;

  const dni = normalizeSeafarerDni(raw);
  if (dni) {
    const byDni = await SeafarerMongoose.findOne({
      $or: [
        { "identificationDocuments.dni": dni },
        { "document.type": "DNI", "document.number": dni },
        { "document.type": "Cédula de identidad", "document.number": dni },
      ],
    })
      .populate({
        path: "heldLicenses.licenseId",
        select: "code name kind category authority active",
      })
      .lean();
    if (byDni) return byDni;
  }

  const passport = normalizeSeafarerPassport(raw);
  if (passport) {
    const byPass = await SeafarerMongoose.findOne({
      $or: [
        { "identificationDocuments.passport": passport },
        { "document.type": "Pasaporte", "document.number": passport },
      ],
    })
      .populate({
        path: "heldLicenses.licenseId",
        select: "code name kind category authority active",
      })
      .lean();
    if (byPass) return byPass;
  }

  return null;
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

async function loadUserDoc(userId) {
  if (!isValidObjectId(userId)) throw httpError("Usuario no válido.", 400);
  const doc = await UserMongoose.findById(userId).exec();
  if (!doc) throw httpError("Usuario no encontrado.", 404);
  return doc;
}

async function loadRequest(id) {
  if (!isValidObjectId(id)) throw httpError("Solicitud no válida.", 400);
  const doc = await SeafarerLinkRequestMongoose.findById(id).exec();
  if (!doc) throw httpError("Solicitud no encontrada.", 404);
  return doc;
}

function previewFromSeafarer(seafarer, uyBdIds) {
  if (!seafarer) return null;
  return {
    _id: String(seafarer._id),
    fullName: seafarerDisplayName(seafarer),
    brevetCategory: extractSportBrevet(seafarer, uyBdIds),
    documentPreview: {
      dni: str(seafarer?.identificationDocuments?.dni),
      passport: str(seafarer?.identificationDocuments?.passport),
    },
  };
}

/**
 * Estado de vinculación para el náuta logueado.
 */
export async function getSkipperLinkStatus(user) {
  assertSkipper(user);
  const userDoc = await loadUserDoc(user._id);
  const link = userDoc.seafarerLink || emptyLink();
  const uyBdIds = await loadUyBdLicenseIds();

  let matchedSeafarer = null;
  let matchError = null;
  if (link.status === "linked" && link.seafarerId) {
    try {
      matchedSeafarer = await getSeafarerById(link.seafarerId);
    } catch {
      matchError = "La ficha vinculada ya no está disponible.";
    }
  } else {
    matchedSeafarer = await findSeafarerMatchingUserDocument(
      userDoc.documentId
    );
  }

  let activeRequest = null;
  if (link.activeRequestId) {
    const req = await SeafarerLinkRequestMongoose.findById(
      link.activeRequestId
    ).lean();
    if (req && req.status === "pending") {
      activeRequest = {
        _id: String(req._id),
        type: req.type,
        unitAcronym: req.unitAcronym,
        reason: req.reason || "",
        requestedAt: req.requestedAt,
      };
    }
  }

  return {
    link: {
      status: link.status || "none",
      seafarerId: link.seafarerId ? String(link.seafarerId) : null,
      linkedAt: link.linkedAt,
      linkedBy: link.linkedBy || "",
      linkedByUnit: link.linkedByUnit || "",
      activeRequestId: link.activeRequestId
        ? String(link.activeRequestId)
        : null,
    },
    documentId: str(userDoc.documentId),
    matchedSeafarer: previewFromSeafarer(matchedSeafarer, uyBdIds),
    matchError,
    activeRequest,
  };
}

/**
 * Perfil completo solo si está linked.
 */
export async function getSkipperLinkedProfile(user) {
  assertSkipper(user);
  const userDoc = await loadUserDoc(user._id);
  const link = userDoc.seafarerLink || emptyLink();
  if (link.status !== "linked" && link.status !== "pending_unlink") {
    throw httpError(
      "Debe tener su cuenta vinculada a una ficha de náuta para ver la documentación.",
      403
    );
  }
  if (!link.seafarerId) {
    throw httpError("No hay ficha vinculada.", 404);
  }
  const seafarer = await getSeafarerById(link.seafarerId);
  return { seafarer, link };
}

/**
 * Solicitud de vinculación por el náuta (requiere adjunto de documento de identidad).
 * @param {object} user
 * @param {{ unitAcronym?: string, identityFile?: object }} opts
 */
export async function requestSkipperLink(
  user,
  { unitAcronym, identityFile } = {}
) {
  assertSkipper(user);
  const acronym = str(unitAcronym).toUpperCase();
  if (!acronym) throw httpError("Seleccione la prefectura donde realizará el trámite.");
  if (!identityFile?.filename) {
    throw httpError(
      "Adjunte una foto o PDF del frente de su cédula o de la hoja de datos del pasaporte."
    );
  }

  const cleanupFile = () => deleteSeafarerLinkIdentityFile(identityFile.filename);

  const unit = await findUnitByAcronym(acronym);
  if (!unit) {
    cleanupFile();
    throw httpError("La prefectura indicada no existe.");
  }
  const mmEmail = str(unit.emailMarinaMercante);
  if (!mmEmail || !mmEmail.includes("@")) {
    cleanupFile();
    throw httpError(
      "Esa prefectura no tiene email de Marina Mercante cargado. Elija otra o contacte a la unidad."
    );
  }

  const userDoc = await loadUserDoc(user._id);
  const link = userDoc.seafarerLink || emptyLink();
  if (link.status === "linked" || link.status === "pending_unlink") {
    cleanupFile();
    throw httpError("Su cuenta ya está vinculada a una ficha de náuta.");
  }
  if (link.status === "pending_link") {
    cleanupFile();
    throw httpError(
      "Ya tiene una solicitud de vinculación pendiente. Cancélela o aguarde la resolución."
    );
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentCount = await SeafarerLinkRequestMongoose.countDocuments({
    userId: userDoc._id,
    type: "link",
    requestedAt: { $gte: weekAgo },
  });
  if (recentCount >= LINK_REQUESTS_PER_WEEK) {
    cleanupFile();
    throw httpError(
      `Alcanzó el máximo de ${LINK_REQUESTS_PER_WEEK} solicitudes de vinculación esta semana.`
    );
  }

  const seafarer = await findSeafarerMatchingUserDocument(userDoc.documentId);
  if (!seafarer) {
    cleanupFile();
    throw httpError(
      "No encontramos un perfil de náuta con su DNI/pasaporte. Acérquese a una prefectura para registrarse en la base."
    );
  }

  const otherLinked = await UserMongoose.findOne({
    "seafarerLink.seafarerId": seafarer._id,
    "seafarerLink.status": { $in: ["linked", "pending_unlink"] },
    _id: { $ne: userDoc._id },
  })
    .select("_id email")
    .lean();
  if (otherLinked) {
    cleanupFile();
    throw httpError(
      "Esa ficha de náuta ya está vinculada a otra cuenta SICEN.",
      409
    );
  }

  const pendingOther = await SeafarerLinkRequestMongoose.findOne({
    seafarerId: seafarer._id,
    type: "link",
    status: "pending",
    userId: { $ne: userDoc._id },
  }).lean();
  if (pendingOther) {
    cleanupFile();
    throw httpError(
      "Ya existe otra solicitud pendiente de vinculación para esa ficha.",
      409
    );
  }

  const coherenceFlags = computeCoherenceFlags(userDoc, seafarer);
  const identityDocument = {
    storedName: identityFile.filename,
    originalName: str(identityFile.originalname) || identityFile.filename,
    mimeType: str(identityFile.mimetype) || "",
    size: Number(identityFile.size) || 0,
  };

  let request;
  try {
    request = await SeafarerLinkRequestMongoose.create({
      type: "link",
      status: "pending",
      userId: userDoc._id,
      seafarerId: seafarer._id,
      unitAcronym: acronym,
      requestedBy: str(userDoc.email),
      coherenceFlags,
      identityDocument,
    });
  } catch (e) {
    cleanupFile();
    throw e;
  }

  const token = encodeSeafarerLinkEmailToken(
    buildSeafarerLinkEmailPayload({
      requestId: request._id,
      seafarerId: seafarer._id,
      type: "link",
    })
  );
  request.emailTokenId = token.slice(0, 24);
  await request.save();

  userDoc.seafarerLink = {
    seafarerId: seafarer._id,
    status: "pending_link",
    linkedAt: null,
    linkedBy: "",
    linkedByUnit: "",
    activeRequestId: request._id,
  };
  userDoc.markModified("seafarerLink");
  await userDoc.save();

  await sendSeafarerLinkRequestEmail({
    unit,
    request,
    user: userDoc,
    seafarer,
    token,
  });

  return {
    msg: `Solicitud enviada a Marina Mercante de ${acronym}. El personal verificará su documento adjunto y podrá vincular su cuenta a distancia.`,
    request: {
      _id: String(request._id),
      unitAcronym: acronym,
      status: "pending",
    },
  };
}

/**
 * Cancela solicitud pending del náuta.
 */
export async function cancelSkipperLinkRequest(user) {
  assertSkipper(user);
  const userDoc = await loadUserDoc(user._id);
  const link = userDoc.seafarerLink || emptyLink();
  if (link.status !== "pending_link" || !link.activeRequestId) {
    throw httpError("No tiene una solicitud de vinculación pendiente.");
  }

  const request = await loadRequest(link.activeRequestId);
  if (String(request.userId) !== String(userDoc._id)) {
    throw httpError("La solicitud no corresponde a su cuenta.", 403);
  }
  if (request.status !== "pending" || request.type !== "link") {
    throw httpError("La solicitud ya no está pendiente.");
  }

  request.status = "cancelled";
  request.resolvedAt = new Date();
  request.resolvedBy = str(userDoc.email);
  if (request.identityDocument?.storedName) {
    deleteSeafarerLinkIdentityFile(request.identityDocument.storedName);
    request.identityDocument = null;
  }
  await request.save();

  userDoc.seafarerLink = emptyLink();
  userDoc.markModified("seafarerLink");
  await userDoc.save();

  return { msg: "Solicitud de vinculación cancelada." };
}

/**
 * Verificaciones + cuenta vinculada para la ficha en consulta PNN.
 */
export async function getPendingActionsForSeafarer(seafarerId, actor) {
  assertPnnStaff(actor);
  if (!isValidObjectId(seafarerId)) {
    throw httpError("Identificador de ficha no válido.");
  }

  const pending = await SeafarerLinkRequestMongoose.find({
    seafarerId,
    status: "pending",
  })
    .sort({ requestedAt: -1 })
    .lean();

  const linkedUser = await UserMongoose.findOne({
    "seafarerLink.seafarerId": seafarerId,
    "seafarerLink.status": { $in: ["linked", "pending_unlink"] },
  })
    .select(
      "first_name last_name email phone documentId FN seafarerLink role"
    )
    .lean();

  const requestUsers = {};
  for (const r of pending) {
    const uid = String(r.userId);
    if (requestUsers[uid]) continue;
    const u = await UserMongoose.findById(r.userId)
      .select("first_name last_name email phone documentId FN role")
      .lean();
    if (u) requestUsers[uid] = u;
  }

  return {
    pendingRequests: pending.map((r) => ({
      _id: String(r._id),
      type: r.type,
      status: r.status,
      unitAcronym: r.unitAcronym,
      reason: r.reason || "",
      requestedAt: r.requestedAt,
      requestedBy: r.requestedBy,
      coherenceFlags: r.coherenceFlags || {},
      identityDocument: identityDocumentPublicMeta(r.identityDocument),
      user: requestUsers[String(r.userId)]
        ? {
            _id: String(requestUsers[String(r.userId)]._id),
            first_name: requestUsers[String(r.userId)].first_name,
            last_name: requestUsers[String(r.userId)].last_name,
            email: requestUsers[String(r.userId)].email,
            phone: requestUsers[String(r.userId)].phone || "",
            documentId: requestUsers[String(r.userId)].documentId || "",
            FN: requestUsers[String(r.userId)].FN || null,
          }
        : null,
    })),
    linkedAccount: linkedUser
      ? {
          _id: String(linkedUser._id),
          first_name: linkedUser.first_name,
          last_name: linkedUser.last_name,
          email: linkedUser.email,
          phone: linkedUser.phone || "",
          documentId: linkedUser.documentId || "",
          link: linkedUser.seafarerLink,
        }
      : null,
    identityFieldsLocked: Boolean(linkedUser),
  };
}

function userDocumentMatchesSeafarer(userDocumentId, seafarer) {
  const raw = str(userDocumentId);
  if (!raw) return false;
  const idDocs = seafarer?.identificationDocuments || {};
  const dni = normalizeSeafarerDni(idDocs.dni);
  const passport = normalizeSeafarerPassport(idDocs.passport);
  const legacyType = str(seafarer?.document?.type);
  const legacyNum = str(seafarer?.document?.number);
  if (dni && normalizeSeafarerDni(raw) === dni) return true;
  if (passport && normalizeSeafarerPassport(raw) === passport) return true;
  if (
    legacyType &&
    legacyNum &&
    (legacyType === "DNI" ||
      legacyType === "Cédula de identidad" ||
      /c[eé]dula/i.test(legacyType)) &&
    normalizeSeafarerDni(raw) === normalizeSeafarerDni(legacyNum)
  ) {
    return true;
  }
  if (
    legacyType === "Pasaporte" &&
    normalizeSeafarerPassport(raw) === normalizeSeafarerPassport(legacyNum)
  ) {
    return true;
  }
  return false;
}

/**
 * Busca cuentas (skipper) cuyo documentId coincide con DNI/pasaporte de la ficha.
 */
export async function findMatchingAccountsForSeafarer(seafarerId, actor) {
  assertPnnStaff(actor);
  if (!isValidObjectId(seafarerId)) {
    throw httpError("Identificador de ficha no válido.");
  }

  const seafarer = await SeafarerMongoose.findById(seafarerId).lean();
  if (!seafarer) throw httpError("Registro de gente de mar no encontrado.", 404);

  const idDocs = seafarer.identificationDocuments || {};
  const dni = normalizeSeafarerDni(idDocs.dni);
  const passport = normalizeSeafarerPassport(idDocs.passport);
  const hasAnyDoc =
    dni ||
    passport ||
    str(seafarer?.document?.number);
  if (!hasAnyDoc) {
    throw httpError(
      "La ficha no tiene DNI ni pasaporte cargado; no se puede buscar cuentas."
    );
  }

  const skippers = await UserMongoose.find({
    role: "skipper",
    documentId: { $exists: true, $nin: [null, ""] },
  })
    .select("first_name last_name email phone documentId FN seafarerLink")
    .lean();

  const matches = [];
  for (const u of skippers) {
    if (!userDocumentMatchesSeafarer(u.documentId, seafarer)) continue;
    const link = u.seafarerLink || {};
    const linkStatus = str(link.status) || "none";
    const linkedToThis =
      link.seafarerId && String(link.seafarerId) === String(seafarerId);
    const linkedToOther =
      (linkStatus === "linked" || linkStatus === "pending_unlink") &&
      link.seafarerId &&
      String(link.seafarerId) !== String(seafarerId);

    const pendingForThis = await SeafarerLinkRequestMongoose.findOne({
      seafarerId,
      userId: u._id,
      type: "link",
      status: "pending",
    })
      .select("_id")
      .lean();

    matches.push({
      _id: String(u._id),
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      phone: u.phone || "",
      documentId: u.documentId || "",
      FN: u.FN || null,
      linkStatus,
      linkedToThis: Boolean(linkedToThis),
      linkedToOther: Boolean(linkedToOther),
      pendingLinkRequestId: pendingForThis
        ? String(pendingForThis._id)
        : null,
      canLink:
        !linkedToThis &&
        !linkedToOther &&
        linkStatus !== "pending_link" &&
        linkStatus !== "pending_unlink" &&
        !pendingForThis,
      coherenceFlags: computeCoherenceFlags(u, seafarer),
    });
  }

  return {
    searchedDocuments: {
      dni: dni || "",
      passport: passport || "",
    },
    accounts: matches,
  };
}

/**
 * Vinculación iniciada por PNN tras buscar cuenta por documento (sin solicitud previa del náuta).
 */
export async function staffLinkUserToSeafarer(
  seafarerId,
  userId,
  actor,
  { identityVerified } = {}
) {
  assertPnnStaff(actor);
  if (!identityVerified) {
    throw httpError(
      "Debe confirmar que verificó la identidad del titular con el documento de identidad."
    );
  }
  if (!isValidObjectId(seafarerId) || !isValidObjectId(userId)) {
    throw httpError("Identificadores no válidos.");
  }

  const seafarer = await SeafarerMongoose.findById(seafarerId).lean();
  if (!seafarer) throw httpError("Registro de gente de mar no encontrado.", 404);

  const userDoc = await loadUserDoc(userId);
  if (str(userDoc.role) !== "skipper") {
    throw httpError("Solo se pueden vincular cuentas de náuta deportivo.");
  }
  if (!userDocumentMatchesSeafarer(userDoc.documentId, seafarer)) {
    throw httpError(
      "El documento de la cuenta no coincide con el DNI/pasaporte de la ficha."
    );
  }

  const link = userDoc.seafarerLink || emptyLink();
  if (link.status === "linked" || link.status === "pending_unlink") {
    if (String(link.seafarerId) === String(seafarerId)) {
      throw httpError("Esa cuenta ya está vinculada a esta ficha.");
    }
    throw httpError("Esa cuenta ya está vinculada a otra ficha de náuta.", 409);
  }
  if (link.status === "pending_link") {
    throw httpError(
      "Esa cuenta ya tiene una solicitud de vinculación pendiente. Resuélvala desde Verificaciones."
    );
  }

  const otherLinked = await UserMongoose.findOne({
    "seafarerLink.seafarerId": seafarerId,
    "seafarerLink.status": { $in: ["linked", "pending_unlink"] },
  }).lean();
  if (otherLinked) {
    throw httpError(
      "Esta ficha ya está vinculada a otra cuenta SICEN.",
      409
    );
  }

  const pendingOther = await SeafarerLinkRequestMongoose.findOne({
    seafarerId,
    type: "link",
    status: "pending",
  }).lean();
  if (pendingOther) {
    throw httpError(
      "Hay una solicitud de vinculación pendiente para esta ficha. Apruébela o rechácela primero."
    );
  }

  const actorEmail = str(actor.email);
  const actorLabel = seafarerAuditLabelFromUser(actor);
  const unit = str(actor.unit).toUpperCase();
  const coherenceFlags = computeCoherenceFlags(userDoc, seafarer);

  const request = await SeafarerLinkRequestMongoose.create({
    type: "link",
    status: "approved",
    userId: userDoc._id,
    seafarerId,
    unitAcronym: unit,
    requestedBy: actorEmail,
    requestedAt: new Date(),
    resolvedAt: new Date(),
    resolvedBy: actorEmail,
    coherenceFlags,
    reason: "Vinculación iniciada por personal PNN tras búsqueda por documento.",
  });

  userDoc.seafarerLink = {
    seafarerId,
    status: "linked",
    linkedAt: new Date(),
    linkedBy: actorEmail,
    linkedByUnit: unit,
    activeRequestId: null,
  };
  userDoc.markModified("seafarerLink");
  const nameSync = syncUserNameFromSeafarer(userDoc, seafarer);
  await userDoc.save();

  const nameNote = nameSync.changed
    ? ` Nombre de la cuenta alineado a la ficha PNN: «${nameSync.from}» → «${nameSync.to}».`
    : "";
  await addSeafarerObservation(
    String(seafarerId),
    {
      text: `Vinculación formal con cuenta SICEN (${userDoc.email}, documento ${userDoc.documentId || "—"}). Iniciada por PNN tras búsqueda por documento. Identidad verificada${unit ? ` en ${unit}` : ""}. Aprobado por ${actorLabel}.${nameNote}`,
      registeredBy: actorLabel,
    },
    actor
  );

  return {
    msg: nameSync.changed
      ? `Usuario vinculado. El nombre de la cuenta se actualizó a «${nameSync.to}» según la ficha PNN.`
      : "Usuario vinculado con el perfil de náuta correctamente.",
    link: userDoc.seafarerLink,
    requestId: String(request._id),
    nameSynced: nameSync.changed,
  };
}

/**
 * Preview token del email (PNN logueado).
 */
export async function previewLinkEmailToken(token, actor) {
  assertPnnStaff(actor);
  const payload = verifySeafarerLinkEmailToken(token);
  if (!payload) {
    throw httpError("El enlace no es válido o expiró.", 400);
  }
  const request = await SeafarerLinkRequestMongoose.findById(
    payload.requestId
  ).lean();
  if (!request) throw httpError("Solicitud no encontrada.", 404);
  return {
    requestId: String(request._id),
    seafarerId: String(request.seafarerId),
    type: request.type,
    status: request.status,
    unitAcronym: request.unitAcronym,
  };
}

export async function approveLinkRequest(requestId, actor, { identityVerified } = {}) {
  assertPnnStaff(actor);
  if (!identityVerified) {
    throw httpError(
      "Debe confirmar que verificó la identidad del solicitante con el documento adjunto o presentado."
    );
  }

  const request = await loadRequest(requestId);
  if (request.type !== "link" || request.status !== "pending") {
    throw httpError("La solicitud de vinculación no está pendiente.");
  }

  const userDoc = await loadUserDoc(request.userId);
  const otherLinked = await UserMongoose.findOne({
    "seafarerLink.seafarerId": request.seafarerId,
    "seafarerLink.status": { $in: ["linked", "pending_unlink"] },
    _id: { $ne: userDoc._id },
  }).lean();
  if (otherLinked) {
    throw httpError(
      "Esa ficha ya está vinculada a otra cuenta. Rechace esta solicitud.",
      409
    );
  }

  const seafarer = await SeafarerMongoose.findById(request.seafarerId).lean();
  if (!seafarer) throw httpError("Registro de gente de mar no encontrado.", 404);

  const actorEmail = str(actor.email);
  const actorLabel = seafarerAuditLabelFromUser(actor);
  const unit = str(request.unitAcronym).toUpperCase();

  request.status = "approved";
  request.resolvedAt = new Date();
  request.resolvedBy = actorEmail;
  await request.save();

  userDoc.seafarerLink = {
    seafarerId: request.seafarerId,
    status: "linked",
    linkedAt: new Date(),
    linkedBy: actorEmail,
    linkedByUnit: unit,
    activeRequestId: null,
  };
  userDoc.markModified("seafarerLink");
  const nameSync = syncUserNameFromSeafarer(userDoc, seafarer);
  await userDoc.save();

  const nameNote = nameSync.changed
    ? ` Nombre de la cuenta alineado a la ficha PNN: «${nameSync.from}» → «${nameSync.to}».`
    : "";
  await addSeafarerObservation(
    String(request.seafarerId),
    {
      text: `Vinculación formal con cuenta SICEN (${userDoc.email}, documento ${userDoc.documentId || "—"}). Identidad verificada a distancia (documento adjunto) en ${unit || "—"}. Aprobado por ${actorLabel}.${nameNote}`,
      registeredBy: actorLabel,
    },
    actor
  );

  return {
    msg: nameSync.changed
      ? `Usuario vinculado. El nombre de la cuenta se actualizó a «${nameSync.to}» según la ficha PNN.`
      : "Usuario vinculado con el perfil de náuta correctamente.",
    link: userDoc.seafarerLink,
    nameSynced: nameSync.changed,
  };
}

export async function rejectLinkRequest(requestId, actor, { reason } = {}) {
  assertPnnStaff(actor);
  const rejectReason = str(reason);
  if (!rejectReason) throw httpError("Indique el motivo del rechazo.");

  const request = await loadRequest(requestId);
  if (request.type !== "link" || request.status !== "pending") {
    throw httpError("La solicitud de vinculación no está pendiente.");
  }

  const actorEmail = str(actor.email);
  request.status = "rejected";
  request.reason = rejectReason;
  request.resolvedAt = new Date();
  request.resolvedBy = actorEmail;
  await request.save();

  const userDoc = await loadUserDoc(request.userId);
  if (
    userDoc.seafarerLink?.status === "pending_link" &&
    String(userDoc.seafarerLink?.activeRequestId) === String(request._id)
  ) {
    userDoc.seafarerLink = emptyLink();
    userDoc.markModified("seafarerLink");
    await userDoc.save();
  }

  const actorLabel = seafarerAuditLabelFromUser(actor);
  await addSeafarerObservation(
    String(request.seafarerId),
    {
      text: `Solicitud de vinculación rechazada (${userDoc.email}). Motivo: ${rejectReason}. Por ${actorLabel}.`,
      registeredBy: actorLabel,
    },
    actor
  );

  return { msg: "Solicitud de vinculación rechazada." };
}

/**
 * Inicia desvinculación (PNN) → email a Marina Mercante de linkedByUnit.
 */
export async function requestUnlink(seafarerId, actor, { reason } = {}) {
  const isSkipperActor = str(actor?.role) === "skipper";
  if (!isSkipperActor) assertPnnStaff(actor);
  const unlinkReason = str(reason);
  if (!unlinkReason) throw httpError("Indique el motivo de la desvinculación.");
  if (!isValidObjectId(seafarerId)) {
    throw httpError("Identificador de ficha no válido.");
  }

  const userDoc = await UserMongoose.findOne({
    "seafarerLink.seafarerId": seafarerId,
    "seafarerLink.status": "linked",
  }).exec();
  if (!userDoc) {
    throw httpError("No hay una cuenta vinculada activa a esta ficha.");
  }
  if (isSkipperActor && String(userDoc._id) !== String(actor._id)) {
    throw httpError("Solo puede solicitar la desvinculación de su propia cuenta.", 403);
  }

  const pending = await SeafarerLinkRequestMongoose.findOne({
    seafarerId,
    type: "unlink",
    status: "pending",
  }).lean();
  if (pending) {
    throw httpError("Ya hay una desvinculación pendiente para esta ficha.");
  }

  const linkedByUnit = str(userDoc.seafarerLink?.linkedByUnit).toUpperCase();
  if (!linkedByUnit) {
    throw httpError(
      "No se registró la unidad que realizó la vinculación. Contacte a un administrador."
    );
  }

  const unit = await findUnitByAcronym(linkedByUnit);
  if (!unit) throw httpError(`No se encontró la unidad ${linkedByUnit}.`);
  const mmEmail = str(unit.emailMarinaMercante);
  if (!mmEmail || !mmEmail.includes("@")) {
    throw httpError(
      `La unidad ${linkedByUnit} no tiene email de Marina Mercante cargado.`
    );
  }

  const request = await SeafarerLinkRequestMongoose.create({
    type: "unlink",
    status: "pending",
    userId: userDoc._id,
    seafarerId,
    unitAcronym: linkedByUnit,
    reason: unlinkReason,
    requestedBy: str(actor.email),
  });

  const token = encodeSeafarerLinkEmailToken(
    buildSeafarerLinkEmailPayload({
      requestId: request._id,
      seafarerId,
      type: "unlink",
    })
  );
  request.emailTokenId = token.slice(0, 24);
  await request.save();

  userDoc.seafarerLink.status = "pending_unlink";
  userDoc.seafarerLink.activeRequestId = request._id;
  userDoc.markModified("seafarerLink");
  await userDoc.save();

  const seafarer = await getSeafarerById(seafarerId);
  await sendSeafarerUnlinkRequestEmail({
    unit,
    request,
    user: userDoc,
    seafarer,
    token,
    reason: unlinkReason,
  });

  return {
    msg: `Solicitud de desvinculación enviada a Marina Mercante de ${linkedByUnit}.`,
    request: { _id: String(request._id), unitAcronym: linkedByUnit },
  };
}

export async function approveUnlinkRequest(requestId, actor) {
  assertPnnStaff(actor);
  const request = await loadRequest(requestId);
  if (request.type !== "unlink" || request.status !== "pending") {
    throw httpError("La solicitud de desvinculación no está pendiente.");
  }

  const actorEmail = str(actor.email);
  const actorLabel = seafarerAuditLabelFromUser(actor);
  const userDoc = await loadUserDoc(request.userId);

  request.status = "approved";
  request.resolvedAt = new Date();
  request.resolvedBy = actorEmail;
  await request.save();

  const reason = str(request.reason);
  userDoc.seafarerLink = emptyLink();
  userDoc.markModified("seafarerLink");
  await userDoc.save();

  await addSeafarerObservation(
    String(request.seafarerId),
    {
      text: `Desvinculación de cuenta SICEN (${userDoc.email}). Motivo: ${reason || "—"}. Confirmado por ${actorLabel}.`,
      registeredBy: actorLabel,
    },
    actor
  );

  return { msg: "Cuenta desvinculada del perfil de náuta." };
}

export async function rejectUnlinkRequest(requestId, actor, { reason } = {}) {
  assertPnnStaff(actor);
  const rejectReason = str(reason);
  if (!rejectReason) throw httpError("Indique el motivo del rechazo.");

  const request = await loadRequest(requestId);
  if (request.type !== "unlink" || request.status !== "pending") {
    throw httpError("La solicitud de desvinculación no está pendiente.");
  }

  const actorEmail = str(actor.email);
  request.status = "rejected";
  request.resolvedAt = new Date();
  request.resolvedBy = actorEmail;
  await request.save();

  const userDoc = await loadUserDoc(request.userId);
  if (
    userDoc.seafarerLink?.status === "pending_unlink" &&
    String(userDoc.seafarerLink?.activeRequestId) === String(request._id)
  ) {
    userDoc.seafarerLink.status = "linked";
    userDoc.seafarerLink.activeRequestId = null;
    userDoc.markModified("seafarerLink");
    await userDoc.save();
  }

  return { msg: "Desvinculación rechazada; la vinculación permanece activa." };
}

/**
 * Bloquea cambio de documentId si hay vinculación activa o pendiente.
 */
export function assertDocumentIdChangeAllowed(userDoc, nextDocumentId) {
  const link = userDoc?.seafarerLink;
  const status = str(link?.status) || "none";
  if (status === "none") return;
  const current = str(userDoc.documentId);
  const next = str(nextDocumentId);
  if (next && next !== current) {
    throw httpError(
      "No puede cambiar el DNI/pasaporte mientras tenga una vinculación activa o pendiente con una ficha de náuta."
    );
  }
}

/**
 * Descarga autenticada del documento de identidad adjunto a una solicitud.
 */
export async function getLinkRequestIdentityDocument(requestId, actor) {
  assertPnnStaff(actor);
  const request = await loadRequest(requestId);
  const meta = request.identityDocument;
  if (!meta?.storedName) {
    throw httpError("Esta solicitud no tiene documento de identidad adjunto.", 404);
  }
  const absolute = resolveSeafarerLinkIdentityAbsolute(meta.storedName);
  if (!absolute) {
    throw httpError("No se encontró el archivo del documento de identidad.", 404);
  }
  return {
    absolutePath: absolute,
    originalName: meta.originalName || meta.storedName,
    mimeType: meta.mimeType || "application/octet-stream",
  };
}

/**
 * El náuta solicita desvinculación de su propia cuenta (email a MM de linkedByUnit).
 */
export async function requestSkipperUnlink(user, { reason } = {}) {
  assertSkipper(user);
  const userDoc = await loadUserDoc(user._id);
  const link = userDoc.seafarerLink || emptyLink();
  if (link.status !== "linked" || !link.seafarerId) {
    throw httpError("Su cuenta no está vinculada a una ficha de náuta.");
  }
  return requestUnlink(String(link.seafarerId), user, { reason });
}

