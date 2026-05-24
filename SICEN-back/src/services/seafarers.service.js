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
import {
  normalizeSportBrevetCategory,
  sportBrevetCountsToRows,
  SPORT_BREVET_KEYS,
} from "../constants/seafarerSportBrevet.js";

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

/**
 * Elimina un registro completo de gente de mar (por _id).
 * Solo debe poder llamarse desde rutas con guard de administrador.
 * @param {string} seafarerId
 * @returns {Promise<{ id: string }>}
 */
export async function deleteSeafarerById(seafarerId) {
  const id = str(seafarerId);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw httpError("Identificador de registro no válido.", 400);
  }
  const deleted = await SeafarerMongoose.findByIdAndDelete(id).exec();
  if (!deleted) {
    throw httpError("Registro de gente de mar no encontrado.", 404);
  }
  return { id };
}

/** Estado general del marinero (active / disqualified / deceased). */
function normalizeSeafarerGeneralStatus(raw) {
  const gs = raw && typeof raw === "object" ? raw : {};
  return {
    active: gs.active === true || gs.active === "true",
    disqualified: gs.disqualified === true || gs.disqualified === "true",
    deceased: gs.deceased === true || gs.deceased === "true",
  };
}

/**
 * Actualiza los datos básicos del marinero: identificación, datos personales,
 * morfología, aptitud náutica, contacto y estado general.
 *
 * No toca títulos / licencias / cursos / sanciones / observaciones.
 *
 * @param {string} seafarerId
 * @param {object} body — cuerpo HTTP crudo (mismo shape que `create`)
 * @param {object|null} user
 * @returns {Promise<object>} marinero actualizado (formato consulta)
 */
export async function updateSeafarerBasicData(seafarerId, body, user) {
  const id = str(seafarerId);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw httpError("Identificador de registro no válido.", 400);
  }

  const normalized = normalizeSeafarerCreateBody(body);
  const err = validateSeafarerCreateInput(normalized);
  if (err) throw httpError(err, 400);

  const idDocs = normalized.identificationDocuments;
  const dupOr = [];
  if (idDocs.dni) {
    dupOr.push({ "identificationDocuments.dni": idDocs.dni });
    dupOr.push({ "document.type": "DNI", "document.number": idDocs.dni });
    dupOr.push({
      "document.type": "Cédula de identidad",
      "document.number": idDocs.dni,
    });
  }
  if (idDocs.passport) {
    dupOr.push({ "identificationDocuments.passport": idDocs.passport });
    dupOr.push({
      "document.type": "Pasaporte",
      "document.number": idDocs.passport,
    });
  }
  if (idDocs.civicCredential.series && idDocs.civicCredential.number) {
    dupOr.push({
      "identificationDocuments.civicCredential.series":
        idDocs.civicCredential.series,
      "identificationDocuments.civicCredential.number":
        idDocs.civicCredential.number,
    });
  }
  if (dupOr.length) {
    const existing = await SeafarerMongoose.findOne({
      $and: [{ _id: { $ne: new mongoose.Types.ObjectId(id) } }, { $or: dupOr }],
    })
      .lean()
      .exec();
    if (existing) {
      throw httpError(
        "Ya existe otro registro con ese DNI, pasaporte o credencial cívica.",
        409,
      );
    }
  }

  const doc = await loadSeafarerDocById(id);

  doc.set("identificationDocuments", normalized.identificationDocuments);
  doc.set("personalData", normalized.personalData);
  doc.set("morphologicalData", normalized.morphologicalData);
  doc.set("maritimeFitness", normalized.maritimeFitness);
  doc.set("contact", normalized.contact);

  if (body && typeof body === "object" && body.generalStatus !== undefined) {
    doc.set("generalStatus", normalizeSeafarerGeneralStatus(body.generalStatus));
  }

  if (doc.document && (doc.document.type || doc.document.number)) {
    doc.set("document", undefined);
  }

  touchSeafarerMetadata(doc, user);
  await doc.save();
  return seafarerToConsultObject(doc._id);
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

const SIN_NACIONALIDAD = "Sin nacionalidad indicada";
const SIN_GENERO = "Sin género indicado";

function labelCountsToSortedRows(map, labelKey) {
  return [...map.entries()]
    .map(([label, count]) => ({ [labelKey]: label, count }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        String(a[labelKey]).localeCompare(String(b[labelKey]), "es"),
    );
}

/**
 * Totales y desglose para el panel de estadísticas (menú gente de mar).
 * @returns {Promise<{
 *   total: number,
 *   active: number,
 *   disqualified: number,
 *   deceased: number,
 *   inactiveOther: number,
 *   byNationality: { nationality: string, count: number }[],
 *   byGender: { gender: string, count: number }[],
 *   bySportBrevet: { category: string, label: string, count: number }[]
 * }>}
 */
export async function getSeafarerStatsForDashboard() {
  const uyBdLicences = await LicenceMongoose.find(
    { code: "UY_BD", kind: "license" },
    { _id: 1 },
  ).lean();
  const uyBdLicenseIds = new Set(
    uyBdLicences.map((l) => String(l._id)),
  );

  const docs = await SeafarerMongoose.find(
    {},
    { personalData: 1, generalStatus: 1, heldLicenses: 1 },
  ).lean();

  let active = 0;
  let disqualified = 0;
  let deceased = 0;
  let inactiveOther = 0;
  const natMap = new Map();
  const genderMap = new Map();
  const brevetPersonIds = {
    A: new Set(),
    B: new Set(),
    C: new Set(),
    D: new Set(),
  };

  for (const d of docs) {
    const gs = d.generalStatus && typeof d.generalStatus === "object" ? d.generalStatus : {};
    const isDeceased = !!gs.deceased;
    const isDisqualified = !!gs.disqualified;
    const isActive = gs.active !== false;

    if (isDeceased) deceased += 1;
    else if (isDisqualified) disqualified += 1;
    else if (isActive) active += 1;
    else inactiveOther += 1;

    const nat = str(d.personalData?.nationality) || SIN_NACIONALIDAD;
    natMap.set(nat, (natMap.get(nat) || 0) + 1);

    const g = str(d.personalData?.gender);
    const genderKey = SEAFARER_GENDER_VALUES.includes(g) ? g : SIN_GENERO;
    genderMap.set(genderKey, (genderMap.get(genderKey) || 0) + 1);

    const personId = String(d._id);
    const held = Array.isArray(d.heldLicenses) ? d.heldLicenses : [];
    const brevetCatsOnPerson = new Set();
    for (const hl of held) {
      const licenseIdRaw = hl?.licenseId;
      const licenseId =
        licenseIdRaw != null && typeof licenseIdRaw === "object"
          ? String(licenseIdRaw._id ?? "")
          : String(licenseIdRaw ?? "");
      if (!licenseId || !uyBdLicenseIds.has(licenseId)) continue;
      const cat = normalizeSportBrevetCategory(hl?.category);
      if (cat && SPORT_BREVET_KEYS.has(cat)) brevetCatsOnPerson.add(cat);
    }
    for (const cat of brevetCatsOnPerson) {
      brevetPersonIds[cat].add(personId);
    }
  }

  const brevetCountsByKey = Object.fromEntries(
    [...SPORT_BREVET_KEYS].map((k) => [k, brevetPersonIds[k].size]),
  );

  return {
    total: docs.length,
    active,
    disqualified,
    deceased,
    inactiveOther,
    byNationality: labelCountsToSortedRows(natMap, "nationality"),
    byGender: labelCountsToSortedRows(genderMap, "gender"),
    bySportBrevet: sportBrevetCountsToRows(brevetCountsByKey),
  };
}
