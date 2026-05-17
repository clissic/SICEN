import { Schema, model } from "mongoose";

/** @deprecated Legado: un solo tipo/número. Preferir `identificationDocuments`. */
const documentSchema = new Schema(
  {
    type: { type: String, default: "", trim: true },
    number: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const civicCredentialSchema = new Schema(
  {
    series: { type: String, default: "", trim: true },
    number: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const identificationDocumentsSchema = new Schema(
  {
    dni: { type: String, default: "", trim: true },
    passport: { type: String, default: "", trim: true },
    civicCredential: { type: civicCredentialSchema, default: () => ({}) },
  },
  { _id: false }
);

const morphologicalDataSchema = new Schema(
  {
    hairColor: { type: String, default: "", trim: true },
    /** Detalle cuando `hairColor` es MULTICOLOR. */
    hairColorDetail: { type: String, default: "", trim: true },
    /** Natural | Artificial (valores almacenados: NATURAL, ARTIFICIAL). */
    hairColoration: { type: String, default: "", trim: true },
    eyeColor: { type: String, default: "", trim: true },
    skinColor: { type: String, default: "", trim: true },
    heightCm: { type: Number, default: null, min: 0 },
  },
  { _id: false }
);

const bloodTypeSchema = new Schema(
  {
    group: {
      type: String,
      enum: ["", "A", "B", "AB", "O"],
      default: "",
    },
    rhFactor: {
      type: String,
      enum: ["", "+", "-"],
      default: "",
    },
  },
  { _id: false }
);

export const SEAFARER_GENDER_VALUES = ["Masculino", "Femenino"];

const personalDataSchema = new Schema(
  {
    firstName: { type: String, default: "", trim: true },
    lastName: { type: String, default: "", trim: true },
    birthDate: { type: Date, default: null },
    nationality: { type: String, default: "", trim: true },
    gender: {
      type: String,
      enum: ["", ...SEAFARER_GENDER_VALUES],
      default: "",
    },
    bloodType: { type: bloodTypeSchema, default: () => ({}) },
  },
  { _id: false }
);

const datedStatusSchema = new Schema(
  {
    expirationDate: { type: Date, default: null },
    status: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const maritimeFitnessSchema = new Schema(
  {
    medicalCertificate: { type: datedStatusSchema, default: () => ({}) },
    vaccinationCard: { type: datedStatusSchema, default: () => ({}) },
  },
  { _id: false }
);

const contactSchema = new Schema(
  {
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const generalStatusSchema = new Schema(
  {
    active: { type: Boolean, default: true },
    disqualified: { type: Boolean, default: false },
    deceased: { type: Boolean, default: false },
  },
  { _id: false }
);

/** Ítem de licencia (recreational | comercial | special). Los títulos del marinero van en `titles`. */
const licenseEntrySchema = new Schema(
  {
    kind: {
      type: String,
      enum: ["title", "license"],
      default: "license",
    },
    titleCatalogId: { type: String, default: "", trim: true },
    code: { type: String, default: "", trim: true },
    name: { type: String, default: "", trim: true },
    licenseNumber: { type: String, default: "", trim: true },
    issueDate: { type: Date, default: null },
    expirationDate: { type: Date, default: null },
    issuer: { type: String, default: "", trim: true },
    status: { type: String, default: "", trim: true },
  },
  { _id: false }
);

/** Título poseído por el marinero (referencia al catálogo `titles`). */
const seafarerHeldTitleSchema = new Schema(
  {
    titleId: {
      type: Schema.Types.ObjectId,
      ref: "Title",
      required: true,
    },
    number: { type: String, default: "", trim: true },
    issuingInstitution: { type: String, default: "", trim: true },
    issuedDate: { type: Date, default: null },
    expirationDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["ACTIVO", "VENCIDO", "SUSPENDIDO", "REVOCADO"],
      default: "ACTIVO",
    },
    /** Contador de renovaciones registradas al editar con «Renovación» marcada. */
    renewalsCount: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

/** Licencia poseída (referencia al catálogo `licences`, kind license). */
const seafarerHeldLicenseSchema = new Schema(
  {
    licenseId: {
      type: Schema.Types.ObjectId,
      ref: "Licence",
      required: true,
    },
    number: { type: String, default: "", trim: true },
    /** Categoría concreta de la licencia en poder del marinero (p. ej. distinción no cubierta solo por el catálogo). */
    category: { type: String, default: "", trim: true },
    issuedDate: { type: Date, default: null },
    expirationDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["ACTIVO", "VENCIDO", "SUSPENDIDO", "REVOCADO"],
      default: "ACTIVO",
    },
    /** Contador de renovaciones registradas al editar con «Renovación» marcada. */
    renewalsCount: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const licensesBucketSchema = new Schema(
  {
    recreational: { type: [licenseEntrySchema], default: [] },
    comercial: { type: [licenseEntrySchema], default: [] },
    special: { type: [licenseEntrySchema], default: [] },
  },
  { _id: false }
);

const courseInstitutionSchema = new Schema(
  {
    name: { type: String, default: "", trim: true },
    code: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const courseCertificateSchema = new Schema(
  {
    number: { type: String, default: "", trim: true },
  },
  { _id: false }
);

/** Curso / capacitación (p. ej. IMO BST). */
const courseEntrySchema = new Schema(
  {
    code: { type: String, default: "", trim: true },
    name: { type: String, default: "", trim: true },
    type: { type: String, default: "", trim: true },
    institution: { type: courseInstitutionSchema, default: () => ({}) },
    approvalDate: { type: Date, default: null },
    expirationDate: { type: Date, default: null },
    certificate: { type: courseCertificateSchema, default: () => ({}) },
    status: { type: String, default: "", trim: true },
  },
  { _id: false }
);

/** Buque asociado a embarque / desembarque. */
const embarkVesselSchema = new Schema(
  {
    vesselId: { type: String, default: "", trim: true },
    name: { type: String, default: "", trim: true },
    imo: { type: String, default: "", trim: true },
    flag: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const embarkPortSchema = new Schema(
  {
    portId: { type: String, default: "", trim: true },
    name: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const embarkRegisteredBySchema = new Schema(
  {
    userId: { type: String, default: "", trim: true },
    username: { type: String, default: "", trim: true },
    authority: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const embarkRoleSchema = new Schema(
  {
    licenseCode: { type: String, default: "", trim: true },
    title: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const embarkationLegSchema = new Schema(
  {
    vessel: { type: embarkVesselSchema, default: () => ({}) },
    role: { type: embarkRoleSchema, default: () => ({}) },
    date: { type: Date, default: null },
    port: { type: embarkPortSchema, default: () => ({}) },
    registeredBy: { type: embarkRegisteredBySchema, default: () => ({}) },
    registeredAt: { type: Date, default: null },
  },
  { _id: false }
);

const disembarkationLegSchema = new Schema(
  {
    vessel: { type: embarkVesselSchema, default: () => ({}) },
    date: { type: Date, default: null },
    port: { type: embarkPortSchema, default: () => ({}) },
    registeredBy: { type: embarkRegisteredBySchema, default: () => ({}) },
    registeredAt: { type: Date, default: null },
  },
  { _id: false }
);

const embarkRecordUserRefSchema = new Schema(
  {
    userId: { type: String, default: "", trim: true },
    username: { type: String, default: "", trim: true },
  },
  { _id: false }
);

/** Metadatos del registro de embarque/desembarque (no confundir con `metadata` raíz del marinero). */
const embarkRecordMetadataSchema = new Schema(
  {
    createdAt: { type: Date, default: null },
    updatedAt: { type: Date, default: null },
    createdBy: { type: embarkRecordUserRefSchema, default: () => ({}) },
    lastModifiedBy: { type: embarkRecordUserRefSchema, default: () => ({}) },
  },
  { _id: false }
);

/** Un ciclo embarque + desembarque (y estado). */
const embarkationRecordSchema = new Schema(
  {
    embarkation: { type: embarkationLegSchema, default: () => ({}) },
    disembarkation: { type: disembarkationLegSchema, default: () => ({}) },
    status: { type: String, default: "", trim: true },
    metadata: { type: embarkRecordMetadataSchema, default: () => ({}) },
  },
  { _id: false }
);

const metadataSchema = new Schema(
  {
    createdAt: { type: Date, default: null },
    updatedAt: { type: Date, default: null },
    createdBy: { type: String, default: "", trim: true },
    lastModifiedBy: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const schema = new Schema(
  {
    /** @deprecated Usar `identificationDocuments`. */
    document: { type: documentSchema, default: () => ({}) },
    identificationDocuments: {
      type: identificationDocumentsSchema,
      default: () => ({}),
    },
    morphologicalData: {
      type: morphologicalDataSchema,
      default: () => ({}),
    },
    personalData: { type: personalDataSchema, default: () => ({}) },
    maritimeFitness: { type: maritimeFitnessSchema, default: () => ({}) },
    contact: { type: contactSchema, default: () => ({}) },
    generalStatus: { type: generalStatusSchema, default: () => ({}) },

    licenses: {
      type: licensesBucketSchema,
      default: () => ({
        recreational: [],
        comercial: [],
        special: [],
      }),
    },
    /** Títulos del marinero (instancias; catálogo en colección `titles`). */
    titles: { type: [seafarerHeldTitleSchema], default: [] },
    /** Licencias del marinero enlazadas al catálogo `licences` (kind license). */
    heldLicenses: { type: [seafarerHeldLicenseSchema], default: [] },
    courses: { type: [courseEntrySchema], default: [] },
    restrictions: { type: [Schema.Types.Mixed], default: [] },
    embarkations: { type: [embarkationRecordSchema], default: [] },
    sanctions: { type: [Schema.Types.Mixed], default: [] },
    observations: { type: [Schema.Types.Mixed], default: [] },

    metadata: { type: metadataSchema, default: () => ({}) },
  },
  { timestamps: false }
);

schema.pre("save", function (next) {
  const now = new Date();
  if (!this.metadata || typeof this.metadata !== "object") {
    this.metadata = {};
  }
  if (this.isNew && !this.metadata.createdAt) {
    this.metadata.createdAt = now;
  }
  this.metadata.updatedAt = now;
  next();
});

/** Claves válidas para `licenses` (arrays de licencias). */
export const SEAFARER_LICENSE_BUCKETS = ["recreational", "comercial", "special"];

const LICENSE_BUCKET_SET = new Set(SEAFARER_LICENSE_BUCKETS);

export const SEAFARER_TITLE_STATUS_VALUES = [
  "ACTIVO",
  "VENCIDO",
  "SUSPENDIDO",
  "REVOCADO",
];

const TITLE_STATUS_SET = new Set(SEAFARER_TITLE_STATUS_VALUES);

/**
 * Asegura que `titles` sea un array.
 * @param {import("mongoose").Document} doc
 */
export function ensureSeafarerTitlesShape(doc) {
  if (!Array.isArray(doc.titles)) {
    doc.set("titles", []);
  }
}

/**
 * Asegura que `heldLicenses` sea un array.
 * @param {import("mongoose").Document} doc
 */
export function ensureSeafarerHeldLicensesShape(doc) {
  if (!Array.isArray(doc.heldLicenses)) {
    doc.set("heldLicenses", []);
  }
}

/**
 * @param {object} raw
 */
export function normalizeSeafarerHeldLicenseEntry(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const str = (v) => (v == null ? "" : String(v).trim());
  const dateOrNull = (v) => {
    if (v == null || v === "") return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  let st = str(o.status).toUpperCase();
  if (st === "VENCIDO" || st !== "ACTIVO" && st !== "SUSPENDIDO" && st !== "REVOCADO") {
    st = "ACTIVO";
  }
  const licenseIdRaw = o.licenseId;
  const licenseId =
    licenseIdRaw != null
      ? str(
          typeof licenseIdRaw === "object" && licenseIdRaw._id != null
            ? licenseIdRaw._id
            : licenseIdRaw,
        )
      : "";
  return {
    licenseId,
    number: str(o.number),
    category: str(o.category),
    issuedDate: dateOrNull(o.issuedDate),
    expirationDate: dateOrNull(o.expirationDate),
    status: st,
  };
}

/**
 * @param {object} raw
 */
export function normalizeSeafarerHeldTitleEntry(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const str = (v) => (v == null ? "" : String(v).trim());
  const dateOrNull = (v) => {
    if (v == null || v === "") return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  let st = str(o.status).toUpperCase();
  if (st === "VENCIDO" || st !== "ACTIVO" && st !== "SUSPENDIDO" && st !== "REVOCADO") {
    st = "ACTIVO";
  }
  const titleIdRaw = o.titleId;
  const titleId =
    titleIdRaw != null
      ? str(
          typeof titleIdRaw === "object" && titleIdRaw._id != null
            ? titleIdRaw._id
            : titleIdRaw,
        )
      : "";
  return {
    titleId,
    number: str(o.number),
    issuingInstitution: str(o.issuingInstitution),
    issuedDate: dateOrNull(o.issuedDate),
    expirationDate: dateOrNull(o.expirationDate),
    status: st,
  };
}

/**
 * Normaliza un objeto plano a un subdocumento de licencia.
 * @param {object} raw
 */
export function normalizeSeafarerLicenseEntry(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const str = (v) => (v == null ? "" : String(v).trim());
  const dateOrNull = (v) => {
    if (v == null || v === "") return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const kindRaw = str(o.kind).toLowerCase();
  const kind = kindRaw === "title" ? "title" : "license";
  return {
    kind,
    titleCatalogId: str(o.titleCatalogId),
    code: str(o.code),
    name: str(o.name),
    licenseNumber: str(o.licenseNumber),
    issueDate: dateOrNull(o.issueDate),
    expirationDate: dateOrNull(o.expirationDate),
    issuer: str(o.issuer),
    status: str(o.status),
  };
}

/**
 * Asegura `doc.licenses` con los tres arrays inicializados.
 * @param {import("mongoose").Document} doc
 */
export function ensureSeafarerLicensesShape(doc) {
  if (!doc.licenses || typeof doc.licenses !== "object") {
    doc.set("licenses", {
      recreational: [],
      comercial: [],
      special: [],
    });
    return;
  }
  for (const key of SEAFARER_LICENSE_BUCKETS) {
    if (!Array.isArray(doc.licenses[key])) {
      doc.set(`licenses.${key}`, []);
    }
  }
}

/**
 * Agrega un título (instancia) al array `titles`.
 * @param {object} entry — objeto plano; se normaliza antes de pushear
 * @returns {import("mongoose").Document} this
 */
schema.methods.addHeldTitle = function (entry) {
  ensureSeafarerTitlesShape(this);
  const normalized = normalizeSeafarerHeldTitleEntry(entry);
  if (!normalized.titleId) {
    throw new Error(
      "addHeldTitle: indique titleId (identificador del título en el catálogo).",
    );
  }
  this.titles.push(normalized);
  this.markModified("titles");
  return this;
};

/**
 * Agrega una licencia (instancia catálogo `licences`) al array `heldLicenses`.
 * @param {object} entry — objeto plano; se normaliza antes de pushear
 */
schema.methods.addHeldLicense = function (entry) {
  ensureSeafarerHeldLicensesShape(this);
  const normalized = normalizeSeafarerHeldLicenseEntry(entry);
  if (!normalized.licenseId) {
    throw new Error(
      "addHeldLicense: indique licenseId (identificador en el catálogo licences).",
    );
  }
  this.heldLicenses.push(normalized);
  this.markModified("heldLicenses");
  return this;
};

/**
 * @param {"recreational"|"comercial"|"special"} bucket
 * @param {object} entry — objeto plano; se normaliza antes de pushear
 * @returns {import("mongoose").Document} this (para encadenar)
 */
schema.methods.addLicense = function (bucket, entry) {
  if (!LICENSE_BUCKET_SET.has(bucket)) {
    throw new Error(
      `addLicense: bucket inválido "${bucket}". Use: recreational, comercial o special.`
    );
  }
  ensureSeafarerLicensesShape(this);
  const normalized = normalizeSeafarerLicenseEntry(entry);
  this.licenses[bucket].push(normalized);
  this.markModified("licenses");
  return this;
};

/**
 * Normaliza un objeto plano a un subdocumento de curso.
 * @param {object} raw
 */
export function normalizeSeafarerCourseEntry(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const str = (v) => (v == null ? "" : String(v).trim());
  const dateOrNull = (v) => {
    if (v == null || v === "") return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const inst =
    o.institution && typeof o.institution === "object" ? o.institution : {};
  const cert =
    o.certificate && typeof o.certificate === "object" ? o.certificate : {};
  return {
    code: str(o.code),
    name: str(o.name),
    type: str(o.type),
    institution: {
      name: str(inst.name),
      code: str(inst.code),
    },
    approvalDate: dateOrNull(o.approvalDate),
    expirationDate: dateOrNull(o.expirationDate),
    certificate: {
      number: str(cert.number),
    },
    status: str(o.status),
  };
}

/**
 * Asegura que `courses` sea un array.
 * @param {import("mongoose").Document} doc
 */
export function ensureSeafarerCoursesShape(doc) {
  if (!Array.isArray(doc.courses)) {
    doc.set("courses", []);
  }
}

/**
 * Agrega un curso al array `courses`.
 * @param {object} entry — objeto plano; se normaliza antes de pushear
 * @returns {import("mongoose").Document} this
 */
schema.methods.addCourse = function (entry) {
  ensureSeafarerCoursesShape(this);
  const normalized = normalizeSeafarerCourseEntry(entry);
  this.courses.push(normalized);
  this.markModified("courses");
  return this;
};

function normEmbarkVessel(v) {
  const o = v && typeof v === "object" ? v : {};
  const str = (x) => (x == null ? "" : String(x).trim());
  return {
    vesselId: str(o.vesselId),
    name: str(o.name),
    imo: str(o.imo),
    flag: str(o.flag),
  };
}

function normEmbarkPort(p) {
  const o = p && typeof p === "object" ? p : {};
  const str = (x) => (x == null ? "" : String(x).trim());
  return {
    portId: str(o.portId),
    name: str(o.name),
    country: str(o.country),
  };
}

function normEmbarkRegisteredBy(r) {
  const o = r && typeof r === "object" ? r : {};
  const str = (x) => (x == null ? "" : String(x).trim());
  return {
    userId: str(o.userId),
    username: str(o.username),
    authority: str(o.authority),
  };
}

function normEmbarkRole(role) {
  const o = role && typeof role === "object" ? role : {};
  const str = (x) => (x == null ? "" : String(x).trim());
  return {
    licenseCode: str(o.licenseCode),
    title: str(o.title),
  };
}

function dateOrNull(v) {
  if (v == null || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normEmbarkRecordUserRef(u) {
  const o = u && typeof u === "object" ? u : {};
  const str = (x) => (x == null ? "" : String(x).trim());
  return {
    userId: str(o.userId),
    username: str(o.username),
  };
}

/**
 * Normaliza un registro de embarque / desembarque.
 * @param {object} raw
 */
export function normalizeSeafarerEmbarkationRecord(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const str = (x) => (x == null ? "" : String(x).trim());

  const emb = o.embarkation && typeof o.embarkation === "object" ? o.embarkation : {};
  const dis = o.disembarkation && typeof o.disembarkation === "object" ? o.disembarkation : {};
  const meta = o.metadata && typeof o.metadata === "object" ? o.metadata : {};

  return {
    embarkation: {
      vessel: normEmbarkVessel(emb.vessel),
      role: normEmbarkRole(emb.role),
      date: dateOrNull(emb.date),
      port: normEmbarkPort(emb.port),
      registeredBy: normEmbarkRegisteredBy(emb.registeredBy),
      registeredAt: dateOrNull(emb.registeredAt),
    },
    disembarkation: {
      vessel: normEmbarkVessel(dis.vessel),
      date: dateOrNull(dis.date),
      port: normEmbarkPort(dis.port),
      registeredBy: normEmbarkRegisteredBy(dis.registeredBy),
      registeredAt: dateOrNull(dis.registeredAt),
    },
    status: str(o.status),
    metadata: {
      createdAt: dateOrNull(meta.createdAt),
      updatedAt: dateOrNull(meta.updatedAt),
      createdBy: normEmbarkRecordUserRef(meta.createdBy),
      lastModifiedBy: normEmbarkRecordUserRef(meta.lastModifiedBy),
    },
  };
}

/**
 * @param {import("mongoose").Document} doc
 */
export function ensureSeafarerEmbarkationsShape(doc) {
  if (!Array.isArray(doc.embarkations)) {
    doc.set("embarkations", []);
  }
}

/**
 * Agrega un registro de embarque/desembarque a `embarkations`.
 * Si en `entry.metadata` no vienen `createdAt` / `updatedAt`, se completan con la fecha actual.
 * @param {object} entry
 * @returns {import("mongoose").Document} this
 */
schema.methods.addEmbarkation = function (entry) {
  ensureSeafarerEmbarkationsShape(this);
  const now = new Date();
  const base = normalizeSeafarerEmbarkationRecord(entry);
  if (!base.metadata.createdAt) base.metadata.createdAt = now;
  if (!base.metadata.updatedAt) base.metadata.updatedAt = now;
  this.embarkations.push(base);
  this.markModified("embarkations");
  return this;
};

/**
 * Normaliza un ítem de sanción.
 * @param {object} raw
 */
export function normalizeSeafarerSanctionEntry(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const str = (v) => (v == null ? "" : String(v).trim());
  const dateOrNull = (v) => {
    if (v == null || v === "") return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  return {
    code: str(o.code),
    type: str(o.type),
    description: str(o.description),
    issueDate: dateOrNull(o.issueDate),
    expirationDate: dateOrNull(o.expirationDate),
    authority: str(o.authority),
    status: str(o.status),
    resolutionNumber: str(o.resolutionNumber),
  };
}

/**
 * @param {import("mongoose").Document} doc
 */
export function ensureSeafarerSanctionsShape(doc) {
  if (!Array.isArray(doc.sanctions)) {
    doc.set("sanctions", []);
  }
}

schema.methods.addSanction = function (entry) {
  ensureSeafarerSanctionsShape(this);
  this.sanctions.push(normalizeSeafarerSanctionEntry(entry));
  this.markModified("sanctions");
  return this;
};

/**
 * Normaliza un ítem de observación.
 * @param {object} raw
 */
export function normalizeSeafarerObservationEntry(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const str = (v) => (v == null ? "" : String(v).trim());
  const dateOrNull = (v) => {
    if (v == null || v === "") return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  return {
    date: dateOrNull(o.date),
    category: str(o.category),
    text: str(o.text),
    registeredBy: str(o.registeredBy),
  };
}

/**
 * @param {import("mongoose").Document} doc
 */
export function ensureSeafarerObservationsShape(doc) {
  if (!Array.isArray(doc.observations)) {
    doc.set("observations", []);
  }
}

schema.methods.addObservation = function (entry) {
  ensureSeafarerObservationsShape(this);
  this.observations.push(normalizeSeafarerObservationEntry(entry));
  this.markModified("observations");
  return this;
};

/** Colección: gente de mar (registro de marineros / tripulación). */
export const SeafarerMongoose = model("seafarers", schema);
