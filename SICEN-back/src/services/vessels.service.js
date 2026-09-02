import { randomUUID } from "crypto";
import { isValidObjectId } from "mongoose";
import {
  ensureVesselFinesShape,
  VesselMongoose,
} from "../DAO/models/mongoose/vessels.mongoose.js";
import {
  buildAutoridadSummary,
  normalizeCertificatePayload,
} from "../constants/vesselCertificates.js";
import {
  classifySportVesselGrossTonnage,
  classifyVesselGrossTonnage,
  sportTonnageCountsToRows,
  tonnageCountsToRows,
} from "../constants/vesselTonnageBuckets.js";
import {
  isPescaArtesanalShipType,
  isPesqueroShipType,
  SPORT_RECREATIONAL_DOC_TYPES,
} from "../constants/vesselStatsClassification.js";
import { logger } from "../utils/logger.js";
import { ownerStringMatchesSkipper, ownerLabelFromSkipper, skipperCanManageVessel } from "../utils/skipperVesselOwner.js";
import { UserMongoose } from "../DAO/models/mongoose/users.mongoose.js";
import { createPlaceholderInspectionForVessel } from "./vesselInspections.service.js";

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const INITIAL_PORT_STATE_CONTROL = {
  hasDeficiencies: false,
  deficiencies: [],
  detained: false,
  detentions: [],
};

const INITIAL_LEGAL_STATUS = {
  hasVesselEmbargo: false,
  vesselEmbargoDetails: null,
  hasCompanyEmbargo: false,
  companyEmbargoDetails: null,
};

function emptyToNull(s) {
  if (s == null) return null;
  const t = String(s).trim();
  return t === "" ? null : t;
}

function parseFiniteNumber(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {object|null|undefined} existing — documento lean actual (edición) o null (alta)
 */
function navigationAreaFrom(existing) {
  const ex = existing && typeof existing === "object" ? existing : {};
  return typeof ex.classification?.navigationArea === "string"
    ? ex.classification.navigationArea
    : "";
}

/**
 * Fragmento de documento alineado con `createVesselInitial` (identificación, tripulación, etc.).
 * @param {ReturnType<typeof normalizeVesselInitialPayload>} p
 * @param {object|null} existing — documento lean previo (para conservar campos no editados en formulario)
 */
export function buildRegistrationSubdoc(p, existing) {
  const na = navigationAreaFrom(existing);
  const companyAddress =
    existing && typeof existing === "object"
      ? typeof existing.ownership?.companyAddress === "string"
        ? existing.ownership.companyAddress
        : ""
      : "";
  const administrators =
    existing && typeof existing === "object" && Array.isArray(existing.ownership?.administrators)
      ? existing.ownership.administrators
      : [];

  const classification =
    p.vesselType === "Deportivo"
      ? {
          kind: "",
          classificationSociety: "",
          flagRegistryCountry: "",
          navigationArea: na,
        }
      : {
          kind: p.classificationKind,
          classificationSociety:
            p.classificationKind === "recognized"
              ? String(p.classificationSociety || "").trim()
              : "",
          flagRegistryCountry:
            p.classificationKind === "flag"
              ? String(p.classificationFlagRegistry || "").trim()
              : "",
          navigationArea: na,
        };

  return {
    vesselType: p.vesselType,
    recreationalDocType:
      p.vesselType === "Deportivo"
        ? String(p.recreationalDocType || "").trim()
        : "",
    recreationalCategory:
      p.vesselType === "Deportivo"
        ? String(p.recreationalCategory || "").trim()
        : "",
    identification: {
      imoNumber:
        p.vesselType === "Deportivo" ? null : emptyToNull(p.imoNumber),
      nationalRegistryNumber: emptyToNull(p.nationalRegistryNumber),
      mmsi: emptyToNull(p.mmsi),
      callSign: emptyToNull(p.callSign),
    },
    generalInfo: {
      name: p.name.trim(),
      flagState: p.flagState.trim(),
      portOfRegistry: p.portOfRegistry.trim().toUpperCase(),
      yearBuilt: p.yearBuilt,
      shipType: p.shipType.trim(),
      grossTonnage: p.grossTonnage,
      netTonnage: p.netTonnage,
      deadweight: p.deadweight,
      lengthOverall: p.lengthOverall,
      beam: p.beam,
      puntal: p.puntal,
      draft: p.draft,
    },
    ownership: {
      owner: p.owner.trim(),
      operator: p.operator.trim(),
      companyAddress,
      administrators,
    },
    classification,
    crew: {
      master: p.master.trim(),
      crewCapacity: p.crewCapacity,
    },
  };
}

/**
 * Crea un buque con datos iniciales; el resto de módulos completará PSC, embargos, etc.
 *
 * Side effect: si el buque es de **Ultramar**, dispara la creación de un
 * registro placeholder en `vesselInspections` con `inspectionPerformed: false`
 * y los campos de inspección vacíos. Esto garantiza que el módulo de Estado
 * Rector de Puertos arranque con una fila por buque elegible aunque todavía
 * no haya ingresado a puerto nacional.
 *
 * @param {ReturnType<typeof normalizeVesselInitialPayload>} p — cuerpo ya normalizado.
 * @param {{ email?: string }|null} [user] — autor del alta (para auditar el placeholder).
 */
export async function createVesselInitial(p, user = null) {
  const id = randomUUID();
  const reg = buildRegistrationSubdoc(p, null);

  let administrators = [];
  let ownerText = str(p.owner);

  if (p.vesselType === "Deportivo") {
    const adminIds = [
      ...(p.ownerSkipperUserId ? [p.ownerSkipperUserId] : []),
      ...(p.administratorSkipperUserIds || []),
    ];
    if (adminIds.length) {
      const usersById = await loadSkipperUsersForVesselLink(adminIds);
      administrators = buildAdministratorEntries({
        ownerSkipperUserId: p.ownerSkipperUserId || "",
        administratorSkipperUserIds: p.administratorSkipperUserIds || [],
        usersById,
        actor: user,
      });
      if (p.ownerSkipperUserId) {
        const ownerUser = usersById.get(p.ownerSkipperUserId);
        if (ownerUser) ownerText = ownerLabelFromSkipper(ownerUser);
      }
    }
  }

  if (reg.ownership) {
    reg.ownership.owner = ownerText;
    reg.ownership.administrators = administrators;
  }

  const doc = {
    id,
    ...reg,
    propulsion: {
      engineType: "",
      enginePowerKW: null,
      serviceSpeedKnots: null,
    },
    certificates: [],
    tracking: {
      lastKnownPosition: { latitude: null, longitude: null },
      lastPort: "",
      nextPort: "",
      eta: "",
    },
    portStateControl: { ...INITIAL_PORT_STATE_CONTROL },
    legalStatus: { ...INITIAL_LEGAL_STATUS },
    status: {
      operationalStatus: "",
      remarks: null,
    },
  };

  const created = await VesselMongoose.create(doc);

  if (p.vesselType === "Ultramar") {
    try {
      await createPlaceholderInspectionForVessel(created._id, user);
    } catch (err) {
      /* El alta del buque ya fue exitosa: registramos la falla del side
         effect pero no la propagamos para no perder el documento creado. */
      logger.warn(
        `createVesselInitial: no se pudo crear el placeholder de inspección para el buque ${created._id}: ${err?.message || err}`
      );
    }
  }

  return created;
}

/**
 * Documento lean → campos planos del formulario de alta/edición.
 * @param {object|null} doc
 * @returns {object|null}
 */
export function vesselDocToFormPayload(doc) {
  if (!doc || typeof doc !== "object") return null;
  const id = doc.identification || {};
  const gi = doc.generalInfo || {};
  const own = doc.ownership || {};
  const cls = doc.classification || {};
  const cr = doc.crew || {};
  const numStr = (n) =>
    n == null || n === "" || !Number.isFinite(Number(n)) ? "" : String(n);
  const intStr = (n) =>
    n == null || !Number.isInteger(n) ? "" : String(n);
  const str = (v) => (v == null ? "" : String(v));

  const docType = str(doc.recreationalDocType);
  const vt = str(doc.vesselType);
  let recreationalCategory = str(doc.recreationalCategory);
  if (vt !== "Deportivo") {
    recreationalCategory = "";
  } else if (docType === "Certificado de Construcción" && !recreationalCategory) {
    recreationalCategory = "500 metros";
  }

  return {
    vesselType: str(doc.vesselType),
    recreationalDocType: docType,
    recreationalCategory,
    name: str(gi.name),
    imoNumber:
      id.imoNumber != null && id.imoNumber !== "" ? str(id.imoNumber) : "",
    nationalRegistryNumber:
      id.nationalRegistryNumber != null && id.nationalRegistryNumber !== ""
        ? str(id.nationalRegistryNumber)
        : "",
    mmsi: id.mmsi != null && id.mmsi !== "" ? str(id.mmsi) : "",
    callSign: str(id.callSign),
    flagState: str(gi.flagState),
    portOfRegistry: str(gi.portOfRegistry),
    shipType: str(gi.shipType),
    yearBuilt: intStr(gi.yearBuilt),
    grossTonnage: numStr(gi.grossTonnage),
    netTonnage: numStr(gi.netTonnage),
    deadweight: numStr(gi.deadweight),
    lengthOverall: numStr(gi.lengthOverall),
    beam: numStr(gi.beam),
    puntal: numStr(gi.puntal),
    draft: numStr(gi.draft),
    owner: str(own.owner),
    operator: str(own.operator),
    classificationKind: str(cls.kind),
    classificationSociety: str(cls.classificationSociety),
    classificationFlagRegistry: str(cls.flagRegistryCountry),
    master: str(cr.master),
    crewCapacity: intStr(cr.crewCapacity),
  };
}

/**
 * Actualiza datos de registro del buque (misma forma que el alta).
 * @param {string} vesselIdParam
 * @param {object} rawBody — cuerpo HTTP (se normaliza en servicio)
 * @returns {Promise<object|null>} documento lean actualizado o null
 */
export async function updateVesselInitial(vesselIdParam, rawBody) {
  const doc = await findVesselByIdentifier(vesselIdParam);
  if (!doc) return null;
  const p = normalizeVesselInitialPayload(rawBody || {});
  const sub = buildRegistrationSubdoc(p, doc);
  await VesselMongoose.updateOne({ _id: doc._id }, { $set: sub });
  return findVesselByIdentifier(vesselIdParam);
}

export function normalizeVesselInitialPayload(raw) {
  const vesselType =
    typeof raw.vesselType === "string" ? raw.vesselType.trim() : "";
  const recreationalDocType =
    typeof raw.recreationalDocType === "string"
      ? raw.recreationalDocType.trim()
      : "";
  let recreationalCategory =
    typeof raw.recreationalCategory === "string"
      ? raw.recreationalCategory.trim()
      : "";
  const name = typeof raw.name === "string" ? raw.name : "";
  const imoNumber = typeof raw.imoNumber === "string" ? raw.imoNumber : "";
  const nationalRegistryNumber =
    typeof raw.nationalRegistryNumber === "string"
      ? raw.nationalRegistryNumber
      : "";
  const mmsi = typeof raw.mmsi === "string" ? raw.mmsi : "";
  const callSign = typeof raw.callSign === "string" ? raw.callSign : "";
  const flagState = typeof raw.flagState === "string" ? raw.flagState : "";
  const portOfRegistry =
    typeof raw.portOfRegistry === "string"
      ? raw.portOfRegistry.trim().toUpperCase()
      : "";
  const shipType = typeof raw.shipType === "string" ? raw.shipType : "";
  const yearBuilt = parseFiniteNumber(raw.yearBuilt);
  const grossTonnage = parseFiniteNumber(raw.grossTonnage);
  let netTonnage = parseFiniteNumber(raw.netTonnage);
  let deadweight = parseFiniteNumber(raw.deadweight);
  if (vesselType === "Deportivo") {
    netTonnage = 0;
    deadweight = 0;
  }
  const lengthOverall = parseFiniteNumber(raw.lengthOverall);
  const beam = parseFiniteNumber(raw.beam);
  const puntal =
    vesselType === "Deportivo" ? parseFiniteNumber(raw.puntal) : null;
  const draft = parseFiniteNumber(raw.draft);
  const owner = typeof raw.owner === "string" ? raw.owner : "";
  const operator = typeof raw.operator === "string" ? raw.operator : "";
  const classificationKind =
    typeof raw.classificationKind === "string"
      ? raw.classificationKind.trim()
      : "";
  const classificationSociety =
    typeof raw.classificationSociety === "string"
      ? raw.classificationSociety
      : "";
  const classificationFlagRegistry =
    typeof raw.classificationFlagRegistry === "string"
      ? raw.classificationFlagRegistry
      : "";
  const master = typeof raw.master === "string" ? raw.master : "";
  const crewCapacity = parseFiniteNumber(raw.crewCapacity);

  const ownerSkipperUserId = str(raw.ownerSkipperUserId);
  const administratorSkipperUserIds = Array.isArray(
    raw.administratorSkipperUserIds
  )
    ? [...new Set(raw.administratorSkipperUserIds.map((id) => str(id)).filter(Boolean))]
    : [];

  if (vesselType === "Deportivo" && recreationalDocType === "Extranjero") {
    if (recreationalCategory.length > 500) {
      recreationalCategory = recreationalCategory.slice(0, 500);
    }
  } else if (
    vesselType === "Deportivo" &&
    recreationalDocType === "Certificado de Construcción"
  ) {
    recreationalCategory = "500 metros";
  } else if (vesselType !== "Deportivo") {
    recreationalCategory = "";
  }

  return {
    vesselType,
    recreationalDocType,
    recreationalCategory,
    name,
    imoNumber,
    nationalRegistryNumber,
    mmsi,
    callSign,
    flagState,
    portOfRegistry,
    shipType,
    yearBuilt,
    grossTonnage,
    netTonnage,
    deadweight,
    lengthOverall,
    beam,
    puntal,
    draft,
    owner,
    operator,
    classificationKind,
    classificationSociety,
    classificationFlagRegistry,
    master,
    crewCapacity,
    ownerSkipperUserId,
    administratorSkipperUserIds,
  };
}

async function loadSkipperUsersForVesselLink(userIds) {
  const unique = [...new Set(userIds.map((id) => str(id)).filter(Boolean))];
  if (!unique.length) return new Map();
  const invalid = unique.filter((id) => !isValidObjectId(id));
  if (invalid.length) {
    const e = new Error("Identificador de náuta no válido.");
    e.status = 400;
    throw e;
  }
  const docs = await UserMongoose.find({ _id: { $in: unique } })
    .select("first_name last_name email documentId role")
    .lean();
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  for (const id of unique) {
    const u = byId.get(id);
    if (!u || str(u.role) !== "skipper") {
      const e = new Error("Solo se pueden vincular cuentas de náuta deportivo.");
      e.status = 400;
      throw e;
    }
  }
  return byId;
}

function buildAdministratorEntries({ ownerSkipperUserId, administratorSkipperUserIds, usersById, actor }) {
  const linkedBy = str(actor?.email);
  const linkedByUnit = str(actor?.unit).toUpperCase();
  const now = new Date();
  const entries = [];
  const seen = new Set();

  if (ownerSkipperUserId) {
    const ownerUser = usersById.get(ownerSkipperUserId);
    if (!ownerUser) {
      const e = new Error("El propietario náuta indicado no existe.");
      e.status = 400;
      throw e;
    }
    entries.push({
      userId: ownerUser._id,
      claimType: "owner",
      linkedAt: now,
      linkedBy,
      linkedByUnit,
    });
    seen.add(ownerSkipperUserId);
  }

  for (const adminId of administratorSkipperUserIds) {
    if (seen.has(adminId)) continue;
    const adminUser = usersById.get(adminId);
    if (!adminUser) {
      const e = new Error("Uno de los administradores indicados no existe.");
      e.status = 400;
      throw e;
    }
    entries.push({
      userId: adminUser._id,
      claimType: "admin",
      linkedAt: now,
      linkedBy,
      linkedByUnit,
    });
    seen.add(adminId);
  }

  return entries;
}

/**
 * Lista buques paginados según tipo y criterios (OMI o matrícula + puerto;
 * si es Deportivo, también por tipo de documentación).
 */
export async function listVesselsPaginated({
  vesselType,
  imoNumber,
  nationalRegistryNumber,
  portOfRegistry,
  recreationalDocType,
  page,
  limit,
}) {
  const filter = { vesselType };
  if (vesselType === "Ultramar") {
    const imo = String(imoNumber ?? "").trim();
    if (imo) filter["identification.imoNumber"] = imo;
  } else if (vesselType === "Cabotaje" || vesselType === "Deportivo") {
    const mat = String(nationalRegistryNumber ?? "").trim();
    const port = String(portOfRegistry ?? "").trim().toUpperCase();
    if (mat) filter["identification.nationalRegistryNumber"] = mat;
    if (port) {
      filter["generalInfo.portOfRegistry"] = {
        $regex: new RegExp(`^${escapeRegex(port)}$`, "i"),
      };
    }
    if (vesselType === "Deportivo") {
      const doc = String(recreationalDocType ?? "").trim();
      if (doc) filter.recreationalDocType = doc;
    }
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));

  return VesselMongoose.paginate(filter, {
    page: safePage,
    limit: safeLimit,
    sort: { createdAt: -1 },
  });
}

/**
 * Lista buques de un tipo (Ultramar / Cabotaje / Deportivo) ordenados por
 * nombre, devolviendo sólo los campos necesarios para un picker:
 *   `{ _id, vesselType, name, imoNumber, nationalRegistryNumber,
 *      flagState, portOfRegistry }`.
 *
 * Pensado para alimentar comboboxes (p. ej. el desplegable de buques en el
 * formulario de alta de inspecciones). Hasta 500 documentos: si la base crece
 * más allá de ese número conviene `searchVesselsByType` (filtro server-side).
 *
 * @param {string} vesselType — uno de "Ultramar" | "Cabotaje" | "Deportivo".
 */
export async function listVesselsByType(vesselType) {
  const vt = String(vesselType ?? "").trim();
  if (!vt) return [];
  const docs = await VesselMongoose.find(
    { vesselType: vt },
    {
      vesselType: 1,
      "generalInfo.name": 1,
      "generalInfo.flagState": 1,
      "generalInfo.portOfRegistry": 1,
      "identification.imoNumber": 1,
      "identification.nationalRegistryNumber": 1,
    }
  )
    .sort({ "generalInfo.name": 1 })
    .limit(500)
    .lean();

  return docs.map((d) => ({
    _id: d._id,
    vesselType: d.vesselType ?? "",
    name: d.generalInfo?.name ?? "",
    imoNumber: d.identification?.imoNumber ?? null,
    nationalRegistryNumber:
      d.identification?.nationalRegistryNumber ?? null,
    flagState: d.generalInfo?.flagState ?? "",
    portOfRegistry: d.generalInfo?.portOfRegistry ?? "",
  }));
}

const VESSEL_SEARCH_MIN_CHARS = 2;
const VESSEL_SEARCH_MAX_LIMIT = 30;

/**
 * Búsqueda server-side de buques por tipo + nombre y/o matrícula (parcial,
 * case-insensitive). Exige al menos 2 caracteres en nombre o en matrícula.
 * Devuelve como máximo `limit` (default 15, máx. 30) en el mismo shape que
 * `listVesselsByType`.
 */
export async function searchVesselsByType({
  vesselType,
  name,
  nationalRegistryNumber,
  limit,
} = {}) {
  const vt = String(vesselType ?? "").trim();
  if (!vt) return { vessels: [], total: 0 };

  const nameQ = String(name ?? "").trim();
  const regQ = String(nationalRegistryNumber ?? "").trim();
  const nameOk = nameQ.length >= VESSEL_SEARCH_MIN_CHARS;
  const regOk = regQ.length >= VESSEL_SEARCH_MIN_CHARS;
  if (!nameOk && !regOk) {
    return { vessels: [], total: 0 };
  }

  const filter = { vesselType: vt };
  const and = [];
  if (nameOk) {
    and.push({
      "generalInfo.name": {
        $regex: new RegExp(escapeRegex(nameQ), "i"),
      },
    });
  }
  if (regOk) {
    and.push({
      "identification.nationalRegistryNumber": {
        $regex: new RegExp(escapeRegex(regQ), "i"),
      },
    });
  }
  if (and.length === 1) {
    Object.assign(filter, and[0]);
  } else if (and.length > 1) {
    filter.$and = and;
  }

  const safeLimit = Math.min(
    VESSEL_SEARCH_MAX_LIMIT,
    Math.max(1, Number(limit) || 15)
  );

  const [docs, total] = await Promise.all([
    VesselMongoose.find(filter, {
      vesselType: 1,
      recreationalDocType: 1,
      recreationalCategory: 1,
      "identification.callSign": 1,
      "generalInfo.name": 1,
      "generalInfo.flagState": 1,
      "generalInfo.portOfRegistry": 1,
      "generalInfo.yearBuilt": 1,
      "generalInfo.shipType": 1,
      "generalInfo.grossTonnage": 1,
      "generalInfo.lengthOverall": 1,
      "generalInfo.beam": 1,
      "generalInfo.puntal": 1,
      "identification.imoNumber": 1,
      "identification.nationalRegistryNumber": 1,
      "ownership.owner": 1,
      "crew.crewCapacity": 1,
    })
      .sort({ "generalInfo.name": 1 })
      .limit(safeLimit)
      .lean(),
    VesselMongoose.countDocuments(filter),
  ]);

  return {
    vessels: docs.map((d) => ({
      _id: d._id,
      vesselType: d.vesselType ?? "",
      name: d.generalInfo?.name ?? "",
      imoNumber: d.identification?.imoNumber ?? null,
      nationalRegistryNumber:
        d.identification?.nationalRegistryNumber ?? null,
      callSign: d.identification?.callSign ?? "",
      flagState: d.generalInfo?.flagState ?? "",
      portOfRegistry: d.generalInfo?.portOfRegistry ?? "",
      recreationalDocType: d.recreationalDocType ?? "",
      recreationalCategory: d.recreationalCategory ?? "",
      shipType: d.generalInfo?.shipType ?? "",
      yearBuilt: d.generalInfo?.yearBuilt ?? null,
      grossTonnage: d.generalInfo?.grossTonnage ?? null,
      lengthOverall: d.generalInfo?.lengthOverall ?? null,
      beam: d.generalInfo?.beam ?? null,
      puntal: d.generalInfo?.puntal ?? null,
      owner: d.ownership?.owner ?? "",
      crewCapacity: d.crew?.crewCapacity ?? null,
    })),
    total,
    limit: safeLimit,
  };
}

const DEPORTIVO_BY_OWNER_PROJECTION = {
  id: 1,
  vesselType: 1,
  recreationalDocType: 1,
  recreationalCategory: 1,
  "identification.callSign": 1,
  "generalInfo.name": 1,
  "generalInfo.flagState": 1,
  "generalInfo.portOfRegistry": 1,
  "generalInfo.yearBuilt": 1,
  "generalInfo.shipType": 1,
  "generalInfo.grossTonnage": 1,
  "generalInfo.lengthOverall": 1,
  "generalInfo.beam": 1,
  "generalInfo.puntal": 1,
  "identification.nationalRegistryNumber": 1,
  "ownership.owner": 1,
  "ownership.administrators": 1,
  "crew.crewCapacity": 1,
};

export function mapDeportivoVesselSummary(d) {
  const uid = String(d.__viewerUserId || "");
  const adminEntry = (d.ownership?.administrators || []).find(
    (a) => String(a.userId) === uid
  );
  let myClaimType = adminEntry?.claimType || null;
  if (
    !myClaimType &&
    d.__viewerUser &&
    ownerStringMatchesSkipper(d.ownership?.owner, d.__viewerUser)
  ) {
    myClaimType = "owner";
  }
  return {
    _id: d._id,
    id: d.id || undefined,
    vesselType: d.vesselType ?? "",
    name: d.generalInfo?.name ?? "",
    nationalRegistryNumber: d.identification?.nationalRegistryNumber ?? null,
    callSign: d.identification?.callSign ?? "",
    flagState: d.generalInfo?.flagState ?? "",
    portOfRegistry: d.generalInfo?.portOfRegistry ?? "",
    recreationalDocType: d.recreationalDocType ?? "",
    recreationalCategory: d.recreationalCategory ?? "",
    shipType: d.generalInfo?.shipType ?? "",
    yearBuilt: d.generalInfo?.yearBuilt ?? null,
    grossTonnage: d.generalInfo?.grossTonnage ?? null,
    lengthOverall: d.generalInfo?.lengthOverall ?? null,
    beam: d.generalInfo?.beam ?? null,
    puntal: d.generalInfo?.puntal ?? null,
    owner: d.ownership?.owner ?? "",
    myClaimType,
    crewCapacity: d.crew?.crewCapacity ?? null,
  };
}

/**
 * Buques deportivos cuyo propietario coincide con el usuario náuta
 * o donde figura en ownership.administrators.
 */
export async function listDeportivoVesselsByOwner(user) {
  if (str(user?.role) !== "skipper") {
    const e = new Error("Solo los náutas pueden consultar sus buques.");
    e.status = 403;
    throw e;
  }

  const docs = await VesselMongoose.find(
    { vesselType: "Deportivo" },
    DEPORTIVO_BY_OWNER_PROJECTION
  )
    .sort({ "generalInfo.name": 1 })
    .lean();

  const uid = String(user._id);
  const vessels = docs
    .filter((d) => skipperCanManageVessel(d, user))
    .map((d) =>
      mapDeportivoVesselSummary({
        ...d,
        __viewerUserId: uid,
        __viewerUser: user,
      })
    );

  return { vessels, total: vessels.length };
}

function str(v) {
  return String(v ?? "").trim();
}

/**
 * Lista todos los buques paginados, sin requerir filtros.
 * @returns paginate result con `docs`, `totalDocs`, `totalPages`, etc.
 */
export async function listAllVesselsPaginated({ page, limit } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
  return VesselMongoose.paginate(
    {},
    {
      page: safePage,
      limit: safeLimit,
      sort: { createdAt: -1 },
    },
  );
}

/**
 * Busca un buque por `id` de negocio (UUID) o, si aplica, por `_id` de MongoDB.
 * @returns {Promise<object|null>} documento lean o null
 */
export async function findVesselByIdentifier(vesselIdParam) {
  const raw = String(vesselIdParam ?? "").trim();
  if (!raw) return null;
  const byBusinessId = await VesselMongoose.findOne({ id: raw }).lean().exec();
  if (byBusinessId) return byBusinessId;
  if (isValidObjectId(raw)) {
    const byMongo = await VesselMongoose.findById(raw).lean().exec();
    if (byMongo) return byMongo;
  }
  return null;
}

/**
 * @returns {Promise<import("mongoose").Document|null>}
 */
export async function findVesselDocumentByIdentifier(vesselIdParam) {
  const raw = String(vesselIdParam ?? "").trim();
  if (!raw) return null;
  const byBusinessId = await VesselMongoose.findOne({ id: raw }).exec();
  if (byBusinessId) return byBusinessId;
  if (isValidObjectId(raw)) {
    const byMongo = await VesselMongoose.findById(raw).exec();
    if (byMongo) return byMongo;
  }
  return null;
}

/**
 * Agrega el `_id` de una multa (`shipFines`) al buque.
 * @param {import("mongoose").Types.ObjectId} vesselMongoId
 * @param {import("mongoose").Types.ObjectId} fineMongoId
 */
export async function linkShipFineToVessel(vesselMongoId, fineMongoId) {
  if (!vesselMongoId || !fineMongoId) return;
  await VesselMongoose.updateOne(
    { _id: vesselMongoId },
    { $addToSet: { fines: fineMongoId } },
  ).exec();
}

/**
 * @param {import("mongoose").Types.ObjectId} vesselMongoId
 * @param {import("mongoose").Types.ObjectId} fineMongoId
 */
export async function unlinkShipFineFromVessel(vesselMongoId, fineMongoId) {
  if (!vesselMongoId || !fineMongoId) return;
  await VesselMongoose.updateOne(
    { _id: vesselMongoId },
    { $pull: { fines: fineMongoId } },
  ).exec();
}

/**
 * Buque con multas pobladas desde `shipFines`.
 * @param {string} vesselIdParam
 */
export async function findVesselByIdentifierWithFines(vesselIdParam) {
  const raw = String(vesselIdParam ?? "").trim();
  if (!raw) return null;
  const byBusinessId = await VesselMongoose.findOne({ id: raw })
    .populate("fines")
    .lean()
    .exec();
  if (byBusinessId) return byBusinessId;
  if (isValidObjectId(raw)) {
    return VesselMongoose.findById(raw).populate("fines").lean().exec();
  }
  return null;
}

/**
 * Elimina el documento del buque por `id` de negocio o `_id` MongoDB.
 * @param {string} vesselIdParam
 * @returns {Promise<boolean>} true si se eliminó un documento
 */
export async function deleteVesselByIdentifier(vesselIdParam) {
  const doc = await findVesselByIdentifier(vesselIdParam);
  if (!doc?._id) return false;
  const res = await VesselMongoose.deleteOne({ _id: doc._id }).exec();
  return res.deletedCount === 1;
}

/**
 * Inserta o actualiza (por `key`) un elemento en `certificates` del buque.
 * @param {string} vesselIdParam — `id` de negocio o `_id` MongoDB
 * @param {object} normalized — salida de `normalizeCertificatePayload`
 * @returns {Promise<object|null>} documento lean actualizado o null si no hay buque
 */
export async function upsertVesselCertificate(vesselIdParam, normalized) {
  const doc = await findVesselByIdentifier(vesselIdParam);
  if (!doc) return null;

  const autoridadText =
    buildAutoridadSummary(normalized) || normalized.autoridad || "";
  const entry = {
    key: normalized.key,
    otorgado: normalized.otorgado || "",
    convalidacion: normalized.convalidacion || "",
    vencimiento: normalized.vencimiento || "",
    puertoConvalidacion: normalized.puertoConvalidacion || "",
    autoridadKind: normalized.autoridadKind || "",
    autoridadSociety: normalized.autoridadSociety || "",
    autoridadFlagCountry: normalized.autoridadFlagCountry || "",
    autoridad: autoridadText,
  };

  const certificates = Array.isArray(doc.certificates)
    ? doc.certificates.map((c) =>
        typeof c === "object" && c != null ? { ...c } : c
      )
    : [];

  const idx = certificates.findIndex(
    (c) => c && typeof c === "object" && c.key === entry.key
  );
  if (idx >= 0) {
    certificates[idx] = { ...certificates[idx], ...entry };
  } else {
    certificates.push(entry);
  }

  await VesselMongoose.updateOne(
    { _id: doc._id },
    { $set: { certificates } }
  );

  return findVesselByIdentifier(vesselIdParam);
}

/**
 * Añade una clave de certificado adicional (`other_*`) al buque si aún no está.
 * @param {string} vesselIdParam
 * @param {string} key
 * @returns {Promise<object|null>}
 */
export async function addExtraCertificatePresetKey(vesselIdParam, key) {
  const rawKey = String(key ?? "").trim();
  if (!rawKey) return null;

  const doc = await findVesselByIdentifier(vesselIdParam);
  if (!doc) return null;

  const prev = Array.isArray(doc.extraCertificatePresetKeys)
    ? doc.extraCertificatePresetKeys.map((k) => String(k ?? "").trim()).filter(Boolean)
    : [];

  if (prev.includes(rawKey)) {
    return findVesselByIdentifier(vesselIdParam);
  }

  await VesselMongoose.updateOne(
    { _id: doc._id },
    { $set: { extraCertificatePresetKeys: [...prev, rawKey] } }
  );

  return findVesselByIdentifier(vesselIdParam);
}

const SIN_TIPO_MERCANTIL = "Sin tipo indicado";

function shipTypeCountsToSortedRows(map) {
  return [...map.entries()]
    .map(([shipType, count]) => ({ shipType, count }))
    .sort(
      (a, b) =>
        b.count - a.count || String(a.shipType).localeCompare(String(b.shipType), "es")
    );
}

/**
 * Totales y desglose por `generalInfo.shipType` para el panel de estadísticas (menú buques).
 * @returns {Promise<{
 *   total: number,
 *   commercialTotal: number,
 *   ultramar: number,
 *   cabotaje: number,
 *   pesqueros: number,
 *   pescaArtesanal: number,
 *   sportTotal: number,
 *   sportCertificadoConstruccion: number,
 *   sportRegistroEmbarcacionesDeportivas: number,
 *   sportMatriculaCabotaje: number,
 *   sportExtranjero: number,
 *   sportOtherDocType: number,
 *   otherVesselType: number,
 *   byTonnage: { label: string, count: number }[],
 *   withoutTonnage: number,
 *   overTonnageRange: number,
 *   sportByTonnage: { label: string, count: number }[],
 *   sportWithoutTonnage: number,
 *   mercantileByShipType: { shipType: string, count: number }[],
 *   sportByShipType: { shipType: string, count: number }[]
 * }>}
 */
export async function getVesselStatsForDashboard() {
  const docs = await VesselMongoose.find(
    {},
    { vesselType: 1, generalInfo: 1, recreationalDocType: 1 },
  ).lean();

  let ultramar = 0;
  let cabotaje = 0;
  let pesqueros = 0;
  let pescaArtesanal = 0;
  let sportTotal = 0;
  let sportCertificadoConstruccion = 0;
  let sportRegistroEmbarcacionesDeportivas = 0;
  let sportMatriculaCabotaje = 0;
  let sportExtranjero = 0;
  let sportOtherDocType = 0;
  let otherVesselType = 0;
  let withoutTonnage = 0;
  let overTonnageRange = 0;
  let sportWithoutTonnage = 0;
  const mercMap = new Map();
  const sportMap = new Map();
  const tonnageMap = new Map();
  const sportTonnageMap = new Map();

  for (const d of docs) {
    const vt = String(d.vesselType ?? "").trim();
    const st = String(d.generalInfo?.shipType ?? "").trim();
    const grossTonnage = d.generalInfo?.grossTonnage;

    if (vt === "Ultramar" || vt === "Cabotaje") {
      if (isPescaArtesanalShipType(st)) pescaArtesanal += 1;
      else if (isPesqueroShipType(st)) pesqueros += 1;
      else if (vt === "Ultramar") ultramar += 1;
      else cabotaje += 1;
    } else if (vt === "Deportivo") {
      sportTotal += 1;
      const doc = String(d.recreationalDocType ?? "").trim();
      if (doc === "Certificado de Construcción") sportCertificadoConstruccion += 1;
      else if (doc === "Registro de Embarcaciones Deportivas") {
        sportRegistroEmbarcacionesDeportivas += 1;
      } else if (doc === "Matrícula de Cabotaje") sportMatriculaCabotaje += 1;
      else if (doc === "Extranjero") sportExtranjero += 1;
      else if (doc) sportOtherDocType += 1;
    } else otherVesselType += 1;

    if (vt === "Ultramar" || vt === "Cabotaje") {
      const tonnageBucket = classifyVesselGrossTonnage(grossTonnage);
      if (tonnageBucket === null) withoutTonnage += 1;
      else if (tonnageBucket === "over_range") overTonnageRange += 1;
      else tonnageMap.set(tonnageBucket, (tonnageMap.get(tonnageBucket) || 0) + 1);

      const key = st || SIN_TIPO_MERCANTIL;
      mercMap.set(key, (mercMap.get(key) || 0) + 1);
    } else if (vt === "Deportivo") {
      const sportBucket = classifySportVesselGrossTonnage(grossTonnage);
      if (sportBucket === null) sportWithoutTonnage += 1;
      else
        sportTonnageMap.set(
          sportBucket,
          (sportTonnageMap.get(sportBucket) || 0) + 1,
        );

      const key = st || SIN_TIPO_MERCANTIL;
      sportMap.set(key, (sportMap.get(key) || 0) + 1);
    }
  }

  const commercialTotal = ultramar + cabotaje + pesqueros + pescaArtesanal;

  return {
    total: docs.length,
    commercialTotal,
    ultramar,
    cabotaje,
    pesqueros,
    pescaArtesanal,
    sportTotal,
    sportCertificadoConstruccion,
    sportRegistroEmbarcacionesDeportivas,
    sportMatriculaCabotaje,
    sportExtranjero,
    sportOtherDocType,
    sportRecreationalDocTypes: SPORT_RECREATIONAL_DOC_TYPES,
    otherVesselType,
    byTonnage: tonnageCountsToRows(tonnageMap),
    withoutTonnage,
    overTonnageRange,
    sportByTonnage: sportTonnageCountsToRows(sportTonnageMap),
    sportWithoutTonnage,
    mercantileByShipType: shipTypeCountsToSortedRows(mercMap),
    sportByShipType: shipTypeCountsToSortedRows(sportMap),
  };
}
