import {
  ensureSeafarerHeldLicensesShape,
  ensureSeafarerTitlesShape,
  normalizeSeafarerHeldLicenseEntry,
  normalizeSeafarerHeldTitleEntry,
  SEAFARER_LICENSE_BUCKETS,
  SeafarerMongoose,
} from "../DAO/models/mongoose/seafarers.mongoose.js";
import { LicenceMongoose } from "../DAO/models/mongoose/licences.mongoose.js";
import { TitleMongoose } from "../DAO/models/mongoose/titles.mongoose.js";
import mongoose from "mongoose";
import { normalizeSeafarerDocumentNumber } from "../utils/seafarerDocument.js";

function str(v) {
  return v == null ? "" : String(v).trim();
}

function dateOrNull(v) {
  if (v == null || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Texto para `metadata.createdBy` / `lastModifiedBy` (raíz del marinero). */
export function seafarerAuditLabelFromUser(user) {
  if (!user || typeof user !== "object") return "Sistema";
  const rank = str(user.rank);
  const fn = str(user.first_name);
  const ln = str(user.last_name);
  const email = str(user.email);
  const parts = [rank, fn, ln].filter(Boolean);
  if (parts.length) return parts.join(" ").trim();
  return email || "Sistema";
}

/**
 * Normaliza el cuerpo HTTP del alta (solo campos que puede enviar el cliente).
 * @param {object} raw
 */
export function normalizeSeafarerCreateBody(raw) {
  const b = raw && typeof raw === "object" ? raw : {};
  const doc = b.document && typeof b.document === "object" ? b.document : {};
  const pd =
    b.personalData && typeof b.personalData === "object" ? b.personalData : {};
  const mf =
    b.maritimeFitness && typeof b.maritimeFitness === "object"
      ? b.maritimeFitness
      : {};
  const sb =
    mf.seamanBook && typeof mf.seamanBook === "object" ? mf.seamanBook : {};
  const mc =
    mf.medicalCertificate && typeof mf.medicalCertificate === "object"
      ? mf.medicalCertificate
      : {};
  const vc =
    mf.vaccinationCard && typeof mf.vaccinationCard === "object"
      ? mf.vaccinationCard
      : {};
  const ct = b.contact && typeof b.contact === "object" ? b.contact : {};

  const docType = str(doc.type);
  const docNumber = normalizeSeafarerDocumentNumber(docType, str(doc.number));

  return {
    document: {
      type: docType,
      number: docNumber,
    },
    personalData: {
      firstName: str(pd.firstName),
      lastName: str(pd.lastName),
      birthDate: dateOrNull(pd.birthDate),
      nationality: str(pd.nationality),
      gender: str(pd.gender),
    },
    maritimeFitness: {
      seamanBook: {
        number: str(sb.number),
        expirationDate: dateOrNull(sb.expirationDate),
        status: str(sb.status),
      },
      medicalCertificate: {
        expirationDate: dateOrNull(mc.expirationDate),
        status: str(mc.status),
      },
      vaccinationCard: {
        expirationDate: dateOrNull(vc.expirationDate),
        status: str(vc.status),
      },
    },
    contact: {
      phone: str(ct.phone),
      email: str(ct.email),
      address: str(ct.address),
    },
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {ReturnType<typeof normalizeSeafarerCreateBody>} p
 * @returns {string|null} mensaje de error o null si OK
 */
export function validateSeafarerCreateInput(p) {
  if (!p.document.type) return "Indique el tipo de documento.";
  if (!p.document.number) return "Indique el número de documento.";
  if (!p.personalData.firstName) return "Indique el nombre.";
  if (!p.personalData.lastName) return "Indique el apellido.";
  if (!p.personalData.birthDate) return "Indique la fecha de nacimiento.";
  if (!p.personalData.nationality) return "Indique la nacionalidad.";
  if (!p.personalData.gender) return "Indique el género.";
  if (!p.contact.email) return "Indique un correo electrónico.";
  if (!EMAIL_RE.test(p.contact.email)) return "El correo electrónico no es válido.";
  if (!p.contact.phone) return "Indique un teléfono de contacto.";
  return null;
}

/**
 * Arma el documento completo para `create` (sin licencias, cursos, embarques, etc.).
 * @param {ReturnType<typeof normalizeSeafarerCreateBody>} normalized
 * @param {object|null} user — `req.user` (JWT)
 */
export function buildSeafarerCreateDocument(normalized, user) {
  const label = seafarerAuditLabelFromUser(user);
  return {
    document: normalized.document,
    personalData: normalized.personalData,
    maritimeFitness: normalized.maritimeFitness,
    contact: normalized.contact,
    generalStatus: {
      active: true,
      disqualified: false,
      deceased: false,
    },
    licenses: {
      recreational: [],
      comercial: [],
      special: [],
    },
    titles: [],
    heldLicenses: [],
    courses: [],
    restrictions: [],
    embarkations: [],
    sanctions: [],
    observations: [],
    metadata: {
      createdAt: null,
      updatedAt: null,
      createdBy: label,
      lastModifiedBy: label,
    },
  };
}

/**
 * @param {object} body — cuerpo HTTP crudo
 * @param {object|null} user
 * @returns {Promise<object>} documento creado (lean)
 */
export async function createSeafarer(body, user) {
  const normalized = normalizeSeafarerCreateBody(body);
  const err = validateSeafarerCreateInput(normalized);
  if (err) {
    const e = new Error(err);
    e.statusCode = 400;
    throw e;
  }
  const existing = await SeafarerMongoose.findOne({
    "document.type": normalized.document.type,
    "document.number": normalized.document.number,
  })
    .lean()
    .exec();
  if (existing) {
    const e = new Error(
      "Ya existe un registro de gente de mar con ese documento.",
    );
    e.statusCode = 409;
    throw e;
  }
  const docPayload = buildSeafarerCreateDocument(normalized, user);
  const created = await SeafarerMongoose.create(docPayload);
  const o = created.toObject ? created.toObject() : created;
  return o;
}

function httpError(message, statusCode = 400) {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
}

const SEAFARER_CONSULT_POPULATE = [
  {
    path: "titles.titleId",
    select: "code name stcwRegulation department level active",
  },
  {
    path: "heldLicenses.licenseId",
    select: "code name kind category authority active",
  },
];

/**
 * @param {string} documentType
 * @param {string} documentNumber
 */
export async function findSeafarerByDocument(documentType, documentNumber) {
  const type = str(documentType);
  const number = normalizeSeafarerDocumentNumber(type, documentNumber);
  if (!type) throw httpError("Indique el tipo de documento.");
  if (!number) throw httpError("Indique el número de documento.");

  const doc = await SeafarerMongoose.findOne({
    "document.type": type,
    "document.number": number,
  })
    .populate(SEAFARER_CONSULT_POPULATE)
    .exec();

  if (!doc) {
    throw httpError("No se encontró ningún registro con ese documento.", 404);
  }
  return doc.toObject ? doc.toObject() : doc;
}

async function loadSeafarerDocById(id) {
  const key = str(id);
  if (!key) throw httpError("Identificador de registro no válido.");
  const doc = await SeafarerMongoose.findById(key).exec();
  if (!doc) {
    throw httpError("Registro de gente de mar no encontrado.", 404);
  }
  return doc;
}

async function seafarerToConsultObject(docId) {
  const refreshed = await SeafarerMongoose.findById(docId)
    .populate(SEAFARER_CONSULT_POPULATE)
    .exec();
  if (!refreshed) {
    throw httpError("Registro de gente de mar no encontrado.", 404);
  }
  return refreshed.toObject ? refreshed.toObject() : refreshed;
}

function touchSeafarerMetadata(doc, user) {
  if (!doc.metadata || typeof doc.metadata !== "object") {
    doc.metadata = {};
  }
  doc.metadata.lastModifiedBy = seafarerAuditLabelFromUser(user);
  doc.markModified("metadata");
}

/**
 * @param {string} id
 * @param {"recreational"|"comercial"|"special"} bucket
 * @param {object} entry
 * @param {object|null} user
 */
export async function addSeafarerLicense(id, bucket, entry, user) {
  const b = str(bucket);
  if (!SEAFARER_LICENSE_BUCKETS.includes(b)) {
    throw httpError(
      'Indique el tipo de licencia: recreational, comercial o special.',
    );
  }
  const raw = entry && typeof entry === "object" ? entry : {};
  if (!str(raw.code) && !str(raw.name)) {
    throw httpError(
      "Indique al menos el código o el nombre de la licencia.",
    );
  }
  const doc = await loadSeafarerDocById(id);
  doc.addLicense(b, raw);
  touchSeafarerMetadata(doc, user);
  await doc.save();
  return doc.toObject ? doc.toObject() : doc;
}

/**
 * @param {string} id
 * @param {object} entry
 * @param {object|null} user
 */
export async function addSeafarerTitle(id, entry, user) {
  const normalized = normalizeSeafarerHeldTitleEntry(
    entry && typeof entry === "object" ? entry : {},
  );
  if (!normalized.titleId) {
    throw httpError("Seleccione un título del catálogo.", 400);
  }
  if (!mongoose.Types.ObjectId.isValid(normalized.titleId)) {
    throw httpError("Identificador de título no válido.", 400);
  }
  const exists = await TitleMongoose.exists({ _id: normalized.titleId });
  if (!exists) {
    throw httpError("El título indicado no existe en el catálogo.", 404);
  }
  if (!normalized.issuedDate || !normalized.expirationDate) {
    throw httpError(
      "La fecha de emisión y la de vencimiento son obligatorias.",
      400,
    );
  }
  if (normalized.expirationDate <= normalized.issuedDate) {
    throw httpError(
      "La fecha de vencimiento debe ser posterior a la fecha de emisión.",
      400,
    );
  }
  const doc = await loadSeafarerDocById(id);
  doc.addHeldTitle(normalized);
  touchSeafarerMetadata(doc, user);
  await doc.save();
  return seafarerToConsultObject(doc._id);
}

/**
 * @param {string} seafarerId
 * @param {string} heldEntryId — `_id` del subdocumento en `titles`
 * @param {object} entry
 * @param {object|null} user
 */
export async function updateSeafarerHeldTitle(
  seafarerId,
  heldEntryId,
  entry,
  user,
) {
  const rawEntry = entry && typeof entry === "object" ? entry : {};
  const isRenewal = Boolean(rawEntry.isRenewal);
  const normalized = normalizeSeafarerHeldTitleEntry(rawEntry);
  if (!normalized.titleId) {
    throw httpError("Seleccione un título del catálogo.", 400);
  }
  if (!mongoose.Types.ObjectId.isValid(normalized.titleId)) {
    throw httpError("Identificador de título no válido.", 400);
  }
  const exists = await TitleMongoose.exists({ _id: normalized.titleId });
  if (!exists) {
    throw httpError("El título indicado no existe en el catálogo.", 404);
  }
  if (!normalized.issuedDate || !normalized.expirationDate) {
    throw httpError(
      "La fecha de emisión y la de vencimiento son obligatorias.",
      400,
    );
  }
  if (normalized.expirationDate <= normalized.issuedDate) {
    throw httpError(
      "La fecha de vencimiento debe ser posterior a la fecha de emisión.",
      400,
    );
  }
  const eid = str(heldEntryId);
  if (!mongoose.Types.ObjectId.isValid(eid)) {
    throw httpError("Identificador de registro de título no válido.", 400);
  }
  const doc = await loadSeafarerDocById(seafarerId);
  ensureSeafarerTitlesShape(doc);
  const sub = doc.titles.id(eid);
  if (!sub) {
    throw httpError("No se encontró ese título en la ficha.", 404);
  }
  sub.set(normalized);
  if (isRenewal) {
    const n = Number(sub.renewalsCount);
    const base = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    sub.set("renewalsCount", base + 1);
  }
  touchSeafarerMetadata(doc, user);
  await doc.save();
  return seafarerToConsultObject(doc._id);
}

/**
 * @param {string} seafarerId
 * @param {string} heldEntryId
 * @param {object|null} user
 */
export async function deleteSeafarerHeldTitle(seafarerId, heldEntryId, user) {
  const eid = str(heldEntryId);
  if (!mongoose.Types.ObjectId.isValid(eid)) {
    throw httpError("Identificador de registro de título no válido.", 400);
  }
  const doc = await loadSeafarerDocById(seafarerId);
  ensureSeafarerTitlesShape(doc);
  const sub = doc.titles.id(eid);
  if (!sub) {
    throw httpError("No se encontró ese título en la ficha.", 404);
  }
  sub.deleteOne();
  touchSeafarerMetadata(doc, user);
  await doc.save();
  return seafarerToConsultObject(doc._id);
}

async function assertLicenceCatalogEntryForHeld(licenseObjectId) {
  const cat = await LicenceMongoose.findById(licenseObjectId)
    .select("kind")
    .lean()
    .exec();
  if (!cat) {
    throw httpError("La licencia indicada no existe en el catálogo.", 404);
  }
  if (cat.kind === "title") {
    throw httpError(
      "Seleccione una licencia del catálogo (no un título STCW).",
      400,
    );
  }
}

/**
 * @param {string} id
 * @param {object} entry
 * @param {object|null} user
 */
export async function addSeafarerHeldLicense(id, entry, user) {
  const normalized = normalizeSeafarerHeldLicenseEntry(
    entry && typeof entry === "object" ? entry : {},
  );
  if (!normalized.licenseId) {
    throw httpError("Seleccione una licencia del catálogo.", 400);
  }
  if (!mongoose.Types.ObjectId.isValid(normalized.licenseId)) {
    throw httpError("Identificador de licencia no válido.", 400);
  }
  await assertLicenceCatalogEntryForHeld(normalized.licenseId);
  if (!normalized.issuedDate || !normalized.expirationDate) {
    throw httpError(
      "La fecha de emisión y la de vencimiento son obligatorias.",
      400,
    );
  }
  if (normalized.expirationDate <= normalized.issuedDate) {
    throw httpError(
      "La fecha de vencimiento debe ser posterior a la fecha de emisión.",
      400,
    );
  }
  const doc = await loadSeafarerDocById(id);
  doc.addHeldLicense(normalized);
  touchSeafarerMetadata(doc, user);
  await doc.save();
  return seafarerToConsultObject(doc._id);
}

/**
 * @param {string} seafarerId
 * @param {string} heldEntryId
 * @param {object} entry
 * @param {object|null} user
 */
export async function updateSeafarerHeldLicense(
  seafarerId,
  heldEntryId,
  entry,
  user,
) {
  const rawEntry = entry && typeof entry === "object" ? entry : {};
  const isRenewal = Boolean(rawEntry.isRenewal);
  const normalized = normalizeSeafarerHeldLicenseEntry(rawEntry);
  if (!normalized.licenseId) {
    throw httpError("Seleccione una licencia del catálogo.", 400);
  }
  if (!mongoose.Types.ObjectId.isValid(normalized.licenseId)) {
    throw httpError("Identificador de licencia no válido.", 400);
  }
  await assertLicenceCatalogEntryForHeld(normalized.licenseId);
  if (!normalized.issuedDate || !normalized.expirationDate) {
    throw httpError(
      "La fecha de emisión y la de vencimiento son obligatorias.",
      400,
    );
  }
  if (normalized.expirationDate <= normalized.issuedDate) {
    throw httpError(
      "La fecha de vencimiento debe ser posterior a la fecha de emisión.",
      400,
    );
  }
  const eid = str(heldEntryId);
  if (!mongoose.Types.ObjectId.isValid(eid)) {
    throw httpError("Identificador de registro de licencia no válido.", 400);
  }
  const doc = await loadSeafarerDocById(seafarerId);
  ensureSeafarerHeldLicensesShape(doc);
  const sub = doc.heldLicenses.id(eid);
  if (!sub) {
    throw httpError("No se encontró esa licencia en la ficha.", 404);
  }
  sub.set(normalized);
  if (isRenewal) {
    const n = Number(sub.renewalsCount);
    const base = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    sub.set("renewalsCount", base + 1);
  }
  touchSeafarerMetadata(doc, user);
  await doc.save();
  return seafarerToConsultObject(doc._id);
}

/**
 * @param {string} seafarerId
 * @param {string} heldEntryId
 * @param {object|null} user
 */
export async function deleteSeafarerHeldLicense(
  seafarerId,
  heldEntryId,
  user,
) {
  const eid = str(heldEntryId);
  if (!mongoose.Types.ObjectId.isValid(eid)) {
    throw httpError("Identificador de registro de licencia no válido.", 400);
  }
  const doc = await loadSeafarerDocById(seafarerId);
  ensureSeafarerHeldLicensesShape(doc);
  const sub = doc.heldLicenses.id(eid);
  if (!sub) {
    throw httpError("No se encontró esa licencia en la ficha.", 404);
  }
  sub.deleteOne();
  touchSeafarerMetadata(doc, user);
  await doc.save();
  return seafarerToConsultObject(doc._id);
}

/**
 * @param {string} id
 * @param {object} entry
 * @param {object|null} user
 */
export async function addSeafarerCourse(id, entry, user) {
  const raw = entry && typeof entry === "object" ? entry : {};
  if (!str(raw.code) && !str(raw.name)) {
    throw httpError("Indique al menos el código o el nombre del curso.");
  }
  const doc = await loadSeafarerDocById(id);
  doc.addCourse(raw);
  touchSeafarerMetadata(doc, user);
  await doc.save();
  return doc.toObject ? doc.toObject() : doc;
}

/**
 * @param {string} id
 * @param {object} entry
 * @param {object|null} user
 */
export async function addSeafarerSanction(id, entry, user) {
  const raw = entry && typeof entry === "object" ? entry : {};
  if (!str(raw.type) && !str(raw.description)) {
    throw httpError("Indique el tipo o la descripción de la sanción.");
  }
  const doc = await loadSeafarerDocById(id);
  doc.addSanction(raw);
  touchSeafarerMetadata(doc, user);
  await doc.save();
  return doc.toObject ? doc.toObject() : doc;
}

/**
 * @param {string} id
 * @param {object} entry
 * @param {object|null} user
 */
export async function addSeafarerObservation(id, entry, user) {
  const raw = entry && typeof entry === "object" ? entry : {};
  if (!str(raw.text)) {
    throw httpError("Indique el texto de la observación.");
  }
  const doc = await loadSeafarerDocById(id);
  const payload = { ...raw };
  if (!str(payload.registeredBy)) {
    payload.registeredBy = seafarerAuditLabelFromUser(user);
  }
  doc.addObservation(payload);
  touchSeafarerMetadata(doc, user);
  await doc.save();
  return doc.toObject ? doc.toObject() : doc;
}
