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
import {
  normalizeSeafarerCcNumber,
  normalizeSeafarerCcSeries,
  normalizeSeafarerDni,
  normalizeSeafarerPassport,
} from "../utils/seafarerDocument.js";
import { SEAFARER_GENDER_VALUES } from "../DAO/models/mongoose/seafarers.mongoose.js";
import {
  normalizeSeafarerMorphEyeColor,
  normalizeSeafarerMorphHairColor,
  normalizeSeafarerMorphHairColoration,
  normalizeSeafarerMorphHairColorDetail,
  normalizeSeafarerMorphSkinColor,
} from "../constants/seafarerMorphological.js";
import {
  resolveHeldCredentialStatus,
  syncHeldCredentialsExpiryOnDoc,
} from "../utils/heldCredentialStatus.js";

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
function normalizeBloodGroup(raw) {
  const g = str(raw).toUpperCase();
  if (g === "A" || g === "B" || g === "AB" || g === "O") return g;
  return "";
}

function normalizeRhFactor(raw) {
  const r = str(raw);
  if (r === "+" || r === "-") return r;
  return "";
}

function normalizeGender(raw) {
  const g = str(raw);
  return SEAFARER_GENDER_VALUES.includes(g) ? g : "";
}

function parseHeightCm(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export function normalizeSeafarerCreateBody(raw) {
  const b = raw && typeof raw === "object" ? raw : {};
  const idDocs =
    b.identificationDocuments && typeof b.identificationDocuments === "object"
      ? b.identificationDocuments
      : b.document && typeof b.document === "object"
        ? b.document
        : {};
  const ccRaw =
    idDocs.civicCredential && typeof idDocs.civicCredential === "object"
      ? idDocs.civicCredential
      : {};
  const pd =
    b.personalData && typeof b.personalData === "object" ? b.personalData : {};
  const bt =
    pd.bloodType && typeof pd.bloodType === "object" ? pd.bloodType : {};
  const morph =
    b.morphologicalData && typeof b.morphologicalData === "object"
      ? b.morphologicalData
      : {};
  const mf =
    b.maritimeFitness && typeof b.maritimeFitness === "object"
      ? b.maritimeFitness
      : {};
  const mc =
    mf.medicalCertificate && typeof mf.medicalCertificate === "object"
      ? mf.medicalCertificate
      : {};
  const vc =
    mf.vaccinationCard && typeof mf.vaccinationCard === "object"
      ? mf.vaccinationCard
      : {};
  const ct = b.contact && typeof b.contact === "object" ? b.contact : {};

  const dni = normalizeSeafarerDni(
    idDocs.dni != null ? idDocs.dni : idDocs.type === "DNI" ? idDocs.number : "",
  );
  const passport = normalizeSeafarerPassport(
    idDocs.passport != null
      ? idDocs.passport
      : idDocs.type === "Pasaporte"
        ? idDocs.number
        : "",
  );
  const ccSeries = normalizeSeafarerCcSeries(ccRaw.series);
  const ccNumber = normalizeSeafarerCcNumber(ccRaw.number);

  return {
    identificationDocuments: {
      dni,
      passport,
      civicCredential: {
        series: ccSeries,
        number: ccNumber,
      },
    },
    morphologicalData: {
      hairColor: normalizeSeafarerMorphHairColor(morph.hairColor),
      hairColorDetail: normalizeSeafarerMorphHairColorDetail(
        morph.hairColor,
        morph.hairColorDetail,
      ),
      hairColoration: normalizeSeafarerMorphHairColoration(morph.hairColoration),
      eyeColor: normalizeSeafarerMorphEyeColor(morph.eyeColor),
      skinColor: normalizeSeafarerMorphSkinColor(morph.skinColor),
      heightCm: parseHeightCm(morph.heightCm),
    },
    personalData: {
      firstName: str(pd.firstName),
      lastName: str(pd.lastName),
      birthDate: dateOrNull(pd.birthDate),
      nationality: str(pd.nationality),
      gender: normalizeGender(pd.gender),
      bloodType: {
        group: normalizeBloodGroup(bt.group),
        rhFactor: normalizeRhFactor(bt.rhFactor),
      },
    },
    maritimeFitness: {
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
  const id = p.identificationDocuments;
  if (!id.dni) return "Indique el DNI.";
  if (!id.civicCredential.series) return "Indique la serie de la credencial cívica.";
  if (!id.civicCredential.number) {
    return "Indique el número de la credencial cívica.";
  }
  if (!p.personalData.firstName) return "Indique el nombre.";
  if (!p.personalData.lastName) return "Indique el apellido.";
  if (!p.personalData.birthDate) return "Indique la fecha de nacimiento.";
  if (!p.personalData.nationality) return "Indique la nacionalidad.";
  if (!p.personalData.gender) return "Seleccione el género (masculino o femenino).";
  if (!p.personalData.bloodType.group) return "Seleccione el grupo sanguíneo.";
  if (!p.personalData.bloodType.rhFactor) return "Seleccione el factor Rh.";
  if (
    p.morphologicalData.heightCm != null &&
    p.morphologicalData.heightCm <= 0
  ) {
    return "La altura debe ser un número mayor que cero (en centímetros).";
  }
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
    identificationDocuments: normalized.identificationDocuments,
    morphologicalData: normalized.morphologicalData,
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
  const id = normalized.identificationDocuments;
  const dupOr = [];
  if (id.dni) {
    dupOr.push({ "identificationDocuments.dni": id.dni });
    dupOr.push({ "document.type": "DNI", "document.number": id.dni });
    dupOr.push({
      "document.type": "Cédula de identidad",
      "document.number": id.dni,
    });
  }
  if (id.passport) {
    dupOr.push({ "identificationDocuments.passport": id.passport });
    dupOr.push({ "document.type": "Pasaporte", "document.number": id.passport });
  }
  if (id.civicCredential.series && id.civicCredential.number) {
    dupOr.push({
      "identificationDocuments.civicCredential.series": id.civicCredential.series,
      "identificationDocuments.civicCredential.number": id.civicCredential.number,
    });
  }
  if (dupOr.length) {
    const existing = await SeafarerMongoose.findOne({ $or: dupOr }).lean().exec();
    if (existing) {
      const e = new Error(
        "Ya existe un registro de gente de mar con ese DNI, pasaporte o credencial cívica.",
      );
      e.statusCode = 409;
      throw e;
    }
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
    select: "code name application stcwRegulation department level active",
  },
  {
    path: "heldLicenses.licenseId",
    select: "code name kind category authority active",
  },
];

/**
 * @param {string} documentType — DNI | Pasaporte | CC
 * @param {string} documentNumber — DNI o pasaporte
 * @param {string} [ccSeries]
 * @param {string} [ccNumber]
 */
export async function findSeafarerByDocument(
  documentType,
  documentNumber,
  ccSeries = "",
  ccNumber = "",
) {
  const type = str(documentType);
  if (!type) throw httpError("Indique el tipo de documento.");
  if (type !== "DNI" && type !== "Pasaporte" && type !== "CC") {
    throw httpError("Tipo de documento no válido. Use DNI, Pasaporte o CC.");
  }

  let filter;
  if (type === "DNI") {
    const n = normalizeSeafarerDni(documentNumber);
    if (!n) throw httpError("Indique el DNI.");
    filter = {
      $or: [
        { "identificationDocuments.dni": n },
        { "document.type": "DNI", "document.number": n },
        { "document.type": "Cédula de identidad", "document.number": n },
      ],
    };
  } else if (type === "Pasaporte") {
    const n = normalizeSeafarerPassport(documentNumber);
    if (!n) throw httpError("Indique el número de pasaporte.");
    filter = {
      $or: [
        { "identificationDocuments.passport": n },
        { "document.type": "Pasaporte", "document.number": n },
      ],
    };
  } else {
    const series = normalizeSeafarerCcSeries(ccSeries);
    const number = normalizeSeafarerCcNumber(ccNumber);
    if (!series) throw httpError("Indique la serie de la credencial cívica.");
    if (!number) throw httpError("Indique el número de la credencial cívica.");
    filter = {
      "identificationDocuments.civicCredential.series": series,
      "identificationDocuments.civicCredential.number": number,
    };
  }

  const doc = await SeafarerMongoose.findOne(filter)
    .populate(SEAFARER_CONSULT_POPULATE)
    .exec();

  if (!doc) {
    throw httpError("No se encontró ningún registro con ese documento.", 404);
  }
  await persistSeafarerExpirySync(doc);
  const refreshed = await SeafarerMongoose.findOne(filter)
    .populate(SEAFARER_CONSULT_POPULATE)
    .exec();
  return refreshed.toObject ? refreshed.toObject() : refreshed;
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

async function persistSeafarerExpirySync(doc) {
  if (!syncHeldCredentialsExpiryOnDoc(doc)) return false;
  await doc.save();
  return true;
}

async function seafarerToConsultObject(docId) {
  const refreshed = await SeafarerMongoose.findById(docId)
    .populate(SEAFARER_CONSULT_POPULATE)
    .exec();
  if (!refreshed) {
    throw httpError("Registro de gente de mar no encontrado.", 404);
  }
  await persistSeafarerExpirySync(refreshed);
  const out = await SeafarerMongoose.findById(docId)
    .populate(SEAFARER_CONSULT_POPULATE)
    .exec();
  return out.toObject ? out.toObject() : out;
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
  const rawEntry = entry && typeof entry === "object" ? entry : {};
  const isRenewal = Boolean(rawEntry.isRenewal);
  const normalized = normalizeSeafarerHeldTitleEntry(rawEntry);
  normalized.status = resolveHeldCredentialStatus(
    normalized.status,
    normalized.expirationDate,
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
  if (isRenewal) {
    const sub = doc.titles[doc.titles.length - 1];
    if (sub) sub.set("renewalsCount", 1);
  }
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
  normalized.status = resolveHeldCredentialStatus(
    normalized.status,
    normalized.expirationDate,
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
  const rawEntry = entry && typeof entry === "object" ? entry : {};
  const isRenewal = Boolean(rawEntry.isRenewal);
  const normalized = normalizeSeafarerHeldLicenseEntry(rawEntry);
  normalized.status = resolveHeldCredentialStatus(
    normalized.status,
    normalized.expirationDate,
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
  if (isRenewal) {
    const sub = doc.heldLicenses[doc.heldLicenses.length - 1];
    if (sub) sub.set("renewalsCount", 1);
  }
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
  normalized.status = resolveHeldCredentialStatus(
    normalized.status,
    normalized.expirationDate,
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
