import mongoose, { isValidObjectId } from "mongoose";
import { VesselInspectionMongoose } from "../DAO/models/mongoose/vesselInspections.mongoose.js";
import { VesselMongoose } from "../DAO/models/mongoose/vessels.mongoose.js";
import { UserMongoose } from "../DAO/models/mongoose/users.mongoose.js";
import {
  deleteStoredInspectionPdf,
  renameInspectionPdfByInspectionId,
} from "../utils/inspectionPDFFiles.js";

/** Nombre canónico del state de usuario que habilita como inspector ERP. */
const OSERP_STATE_NAME = "Oficial Supervisor por el Estado Rector de Puertos";

/**
 * Normaliza la prioridad CIALA cargada como texto libre a 1 o 2.
 * Acepta variantes con/sin prefijo "Prioridad", números arábigos, romanos y
 * palabras (UNO/DOS). Devuelve `null` cuando no se reconoce la prioridad;
 * el front agrupa esos casos bajo "Sin prioridad".
 */
function normalizeCialaPriority(value) {
  const raw = String(value ?? "")
    .trim()
    .toUpperCase();
  if (!raw) return null;
  const cleaned = raw
    .replace(/PRIORIDAD/g, "")
    .replace(/^P/, "")
    .replace(/[^A-Z0-9]/g, "");
  if (["1", "I", "UNO"].includes(cleaned)) return 1;
  if (["2", "II", "DOS"].includes(cleaned)) return 2;
  return null;
}

function httpError(msg, status = 400) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

function str(v) {
  return String(v ?? "").trim();
}

/**
 * Resuelve el `_id` del buque a partir de un identificador que puede ser el
 * `_id` de Mongo o el `id` (UUID) de negocio.
 */
async function resolveVesselObjectId(vesselIdParam) {
  const raw = str(vesselIdParam);
  if (!raw) return null;
  if (isValidObjectId(raw)) {
    const byMongo = await VesselMongoose.findById(raw).select("_id").lean();
    if (byMongo) return byMongo._id;
  }
  const byBusinessId = await VesselMongoose.findOne({ id: raw })
    .select("_id")
    .lean();
  if (byBusinessId) return byBusinessId._id;
  return null;
}

/**
 * Parsea una fecha que puede venir como `Date`, ISO string o
 * `YYYY-MM-DD`. Devuelve `null` si el input no es válido o está vacío.
 * Se usa indistintamente para `arrivalDate` e `inspectionDate`.
 */
function parseDateInput(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }
  const s = str(value);
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Extrae el "día calendario" de un input como string `YYYY-MM-DD` (sin
 * depender de la zona horaria del servidor). Acepta:
 *   - string `YYYY-MM-DD` (lo más común desde un `<input type="date">`),
 *   - string ISO `YYYY-MM-DDTHH:mm:ss...` (corta los primeros 10 chars),
 *   - `Date` (toma su día en UTC para coincidir con cómo se persistieron
 *     las inspecciones, que viven como UTC midnight en Mongo).
 * Devuelve `""` cuando el valor no es un día válido.
 */
function extractDayKey(value) {
  if (!value) return "";
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }
  const s = str(value);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

function normalizeDeficiency(raw) {
  const d = raw && typeof raw === "object" ? raw : {};
  const actionsRaw = Array.isArray(d.actionsTaken) ? d.actionsTaken : [];
  const actions = actionsRaw
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n));
  return {
    code: str(d.code),
    name: str(d.name),
    rule: str(d.rule),
    actionsTaken: actions,
    ISMrelated: Boolean(d.ISMrelated),
  };
}

function normalizeDeficiencies(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeDeficiency);
}

/**
 * Valida y normaliza el payload de creación/edición.
 * Permite `partial: true` para updates parciales (no exige los obligatorios
 * salvo que vengan presentes).
 */
async function buildInspectionPayload(body, { partial = false } = {}) {
  const out = {};

  if (!partial || body.vesselId !== undefined) {
    const objectId = await resolveVesselObjectId(body.vesselId);
    if (!objectId) {
      throw httpError(
        "El buque indicado no existe en la base de buques.",
        400
      );
    }
    out.vesselId = objectId;
  }

  if (!partial || body.arrivalDate !== undefined) {
    out.arrivalDate = parseDateInput(body.arrivalDate);
  }

  if (!partial || body.inspectionDate !== undefined) {
    out.inspectionDate = parseDateInput(body.inspectionDate);
  }

  if (!partial || body.arrivalPort !== undefined) {
    out.arrivalPort = str(body.arrivalPort).toUpperCase();
  }

  if (!partial || body.cialaPriority !== undefined) {
    out.cialaPriority = str(body.cialaPriority);
  }

  if (!partial || body.inspectionPerformed !== undefined) {
    out.inspectionPerformed = Boolean(body.inspectionPerformed);
  }

  if (!partial || body.deficiencies !== undefined) {
    out.deficiencies = normalizeDeficiencies(body.deficiencies);
  }

  if (!partial || body.inspectors !== undefined) {
    out.inspectors = normalizeInspectors(body.inspectors);
  }

  return out;
}

/**
 * Normaliza un valor recibido para `inspectors`: acepta array, string CSV o
 * un único email; devuelve un array de emails en minúsculas, sin duplicados
 * y sin entradas vacías.
 */
function normalizeInspectors(raw) {
  if (raw == null) return [];
  let arr;
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string") {
    /* Cuando viene por `multipart/form-data` puede llegar como JSON o como
       una lista separada por comas; ambos casos los aceptamos. */
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        arr = Array.isArray(parsed) ? parsed : [trimmed];
      } catch {
        arr = trimmed.split(",");
      }
    } else {
      arr = trimmed.split(",");
    }
  } else {
    arr = [raw];
  }
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    const s = str(v).toLowerCase();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/**
 * Crea un registro de inspección "placeholder" para un buque recién dado de
 * alta. Lo usa el módulo de buques al registrar un buque de Ultramar para que
 * exista una fila inicial sin datos de inspección (la verdadera se completará
 * cuando el buque ingrese a un puerto nacional y se realice la diligencia).
 *
 * @param {import("mongoose").Types.ObjectId|string} vesselObjectId — `_id`
 *   del buque ya creado en la colección `vessels`.
 * @param {{ email?: string }|null} user — autor de la creación; se anota en
 *   `metadata.createdBy/lastModifiedBy` para auditoría.
 */
export async function createPlaceholderInspectionForVessel(
  vesselObjectId,
  user
) {
  if (!vesselObjectId) {
    throw httpError(
      "Identificador de buque inválido para crear el registro de inspección.",
      400
    );
  }
  const email = str(user?.email);
  const doc = await VesselInspectionMongoose.create({
    vesselId: vesselObjectId,
    arrivalDate: null,
    inspectionDate: null,
    arrivalPort: "",
    cialaPriority: "",
    inspectionPerformed: false,
    deficiencies: [],
    metadata: { createdBy: email, lastModifiedBy: email },
  });
  return doc.toObject();
}

/**
 * Crea una nueva inspección.
 *
 * Si el buque ya tiene un **placeholder** (registro automático con
 * `arrivalDate: null` creado al dar de alta el buque Ultramar), la nueva
 * inspección **lo absorbe**: se actualiza ese documento existente en lugar de
 * crear uno nuevo. Esto evita acumular placeholders huérfanos. Si no hay
 * placeholder (es el segundo o N-ésimo ingreso del buque), se crea un nuevo
 * registro normal.
 *
 * Si `pdfFile` viene presente, después de obtener el `_id` definitivo de la
 * inspección se renombra el archivo temporal a `<_id>.pdf` y se persiste la
 * URL pública en `inspectionPDF`. Si ya había un PDF previo (caso de
 * absorción del placeholder con archivo viejo, poco probable), se borra del
 * disco antes de guardar el nuevo.
 *
 * @param {object} body
 * @param {object|null} user
 * @param {{ filename: string }|null} [pdfFile] Archivo crudo de Multer.
 */
export async function createInspection(body, user, pdfFile = null) {
  const payload = await buildInspectionPayload(body, { partial: false });
  const email = str(user?.email);

  const placeholder = await VesselInspectionMongoose.findOne({
    vesselId: payload.vesselId,
    arrivalDate: null,
  }).exec();

  let doc;
  if (placeholder) {
    Object.assign(placeholder, payload);
    placeholder.metadata = {
      createdBy: placeholder.metadata?.createdBy || email,
      lastModifiedBy: email,
    };
    doc = placeholder;
  } else {
    doc = new VesselInspectionMongoose({
      ...payload,
      metadata: { createdBy: email, lastModifiedBy: email },
    });
  }

  /* Si en el alta el usuario ya marca la inspección como realizada (uso
     directo desde el flujo "todo en una", no el habitual), lo registramos
     como inspector salvo que el body envíe explícitamente `inspectors`. */
  const inspectorsExplicit = body && body.inspectors !== undefined;
  const userEmailLower = email.toLowerCase();
  if (
    doc.inspectionPerformed &&
    userEmailLower &&
    !inspectorsExplicit
  ) {
    const current = Array.isArray(doc.inspectors)
      ? doc.inspectors.map((s) => String(s).toLowerCase())
      : [];
    if (!current.includes(userEmailLower)) {
      doc.inspectors = [...current, userEmailLower];
    }
  }

  if (pdfFile) {
    if (doc.inspectionPDF) {
      deleteStoredInspectionPdf(doc.inspectionPDF);
    }
    const url = renameInspectionPdfByInspectionId(pdfFile, doc._id);
    if (!url) {
      throw httpError("No se pudo guardar el PDF de la inspección.", 500);
    }
    doc.inspectionPDF = url;
  }

  await doc.save();
  return doc.toObject();
}

/**
 * Busca una inspección por _id e incluye los datos esenciales del buque.
 * @param {string} inspectionId
 */
export async function findInspectionById(inspectionId) {
  const id = str(inspectionId);
  if (!isValidObjectId(id)) {
    throw httpError("Identificador de inspección no válido.", 400);
  }
  const doc = await VesselInspectionMongoose.findById(id)
    .populate({
      path: "vesselId",
      select:
        "id generalInfo.name generalInfo.flagState generalInfo.portOfRegistry identification",
    })
    .lean();
  if (!doc) {
    throw httpError("Inspección no encontrada.", 404);
  }
  return doc;
}

/**
 * Escapa caracteres especiales de regex para usar el string como literal en
 * una `RegExp`. Necesario para que el buscador no rompa con caracteres tipo
 * `.`, `*`, `(`, etc., que el usuario podría tipear sin intención de
 * interpretarlos como regex.
 */
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Lista paginada de inspecciones, con filtros opcionales.
 *
 * Por defecto **excluye los placeholders** (registros con `arrivalDate: null`,
 * generados automáticamente al alta del buque Ultramar). Para incluirlos hay
 * que pasar `includePlaceholders: true`.
 *
 * @param {object} params
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {string} [params.vesselId] - _id o id de negocio del buque.
 * @param {string} [params.arrivalPort]
 * @param {boolean} [params.inspectionPerformed]
 * @param {number} [params.year] - Filtra por año de `arrivalDate`.
 * @param {string} [params.search] - Busca por OMI o nombre del buque
 *   (case insensitive, match parcial). Internamente se resuelve a los
 *   `vesselId` que matchean y se filtra `vesselId: { $in: [...] }`.
 * @param {string} [params.createdBy] - Email del usuario que creó el
 *   registro (`metadata.createdBy`). Comparación case-insensitive exacta.
 *   Útil para auditoría; NO equivale a "el que realizó la inspección".
 * @param {string} [params.inspectorEmail] - Email que debe figurar en el
 *   array `inspectors` (case-insensitive). Es el filtro que usa "Mis
 *   inspecciones" porque ese array refleja a quien efectivamente realizó
 *   la diligencia, no a quien cargó el ingreso.
 * @param {string|Date} [params.inspectionDate] - Filtra por inspecciones
 *   realizadas exactamente ese día (zona local del servidor). Acepta
 *   `YYYY-MM-DD` o `Date`.
 * @param {boolean} [params.includePlaceholders=false]
 */
export async function listInspectionsPaginated({
  page,
  limit,
  vesselId,
  arrivalPort,
  inspectionPerformed,
  year,
  search,
  createdBy,
  inspectorEmail,
  inspectionDate,
  includePlaceholders = false,
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
  const emptyResult = {
    docs: [],
    totalDocs: 0,
    totalPages: 0,
    page: safePage,
    limit: safeLimit,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
  };

  const filter = {};

  if (!includePlaceholders) {
    filter.arrivalDate = { $type: "date" };
  }

  const y = Number(year);
  if (Number.isInteger(y) && y >= 1900 && y <= 9999) {
    filter.$expr = { $eq: [{ $year: "$arrivalDate" }, y] };
  }

  if (vesselId) {
    const objectId = await resolveVesselObjectId(vesselId);
    if (!objectId) return emptyResult;
    filter.vesselId = objectId;
  }

  const searchStr = str(search);
  if (searchStr) {
    const rx = new RegExp(escapeRegex(searchStr), "i");
    const matched = await VesselMongoose.find({
      $or: [{ "identification.imoNumber": rx }, { "generalInfo.name": rx }],
    })
      .select("_id")
      .lean();
    if (matched.length === 0) return emptyResult;
    const ids = matched.map((v) => v._id);
    filter.vesselId = filter.vesselId
      ? { $and: [filter.vesselId, { $in: ids }] }
      : { $in: ids };
  }

  if (arrivalPort && str(arrivalPort)) {
    filter.arrivalPort = str(arrivalPort).toUpperCase();
  }

  if (inspectionPerformed !== undefined && inspectionPerformed !== null) {
    filter.inspectionPerformed = Boolean(inspectionPerformed);
  }

  const createdByStr = str(createdBy).toLowerCase();
  if (createdByStr) {
    filter["metadata.createdBy"] = new RegExp(
      `^${escapeRegex(createdByStr)}$`,
      "i"
    );
  }

  /* Match contra el array `inspectors`. Los emails se guardan en lowercase
     desde la normalización del service, pero registros viejos podrían
     tener mayúsculas, así que comparamos con regex case-insensitive
     anclada al elemento completo. */
  const inspectorEmailStr = str(inspectorEmail).toLowerCase();
  if (inspectorEmailStr) {
    filter.inspectors = new RegExp(
      `^${escapeRegex(inspectorEmailStr)}$`,
      "i"
    );
  }

  /* Filtro por día exacto de `inspectionDate`. Las inspecciones se
     guardan con `new Date("YYYY-MM-DD")`, que JavaScript interpreta como
     **UTC midnight**. Si armamos el rango en hora local del servidor
     (`new Date(y, m, d, 0, 0, 0)`), en zonas como UTC-3 quedan corridas
     entre 3 y 23 horas respecto del valor persistido y el filtro nunca
     matchea. Por eso resolvemos el día en UTC, igual que como vive en
     Mongo: tomamos Y/M/D del string `YYYY-MM-DD` (o de `getUTCFullYear/
     Month/Date` si vino como Date) y armamos el rango con `Date.UTC`. */
  const inspDayKey = extractDayKey(inspectionDate);
  if (inspDayKey) {
    const [y, m, d] = inspDayKey.split("-").map((v) => Number(v));
    if (
      Number.isInteger(y) &&
      Number.isInteger(m) &&
      Number.isInteger(d)
    ) {
      const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const end = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0));
      filter.inspectionDate = { $gte: start, $lt: end };
    }
  }

  return VesselInspectionMongoose.paginate(filter, {
    page: safePage,
    limit: safeLimit,
    sort: { arrivalDate: -1, createdAt: -1 },
    populate: {
      path: "vesselId",
      select: "id generalInfo.name generalInfo.flagState identification",
    },
  });
}

function emptyPriorityBucket() {
  return {
    arrivals: 0,
    inspections: 0,
    deficient: 0,
    deficientPct: 0,
  };
}

function pctRound(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0;
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/**
 * Estadísticas del módulo Inspecciones, acotadas al ejercicio anual indicado.
 * Excluye los placeholders (registros sin `arrivalDate`) porque representan
 * buques que todavía no ingresaron a puerto. El cómputo se hace en memoria
 * porque el dataset esperado es chico; si crece, mover a aggregations.
 *
 * El ranking `byInspector` atribuye cada inspección **exclusivamente** a
 * los emails del array `inspectors` (quien firmó la diligencia). Si el
 * array está vacío, la inspección suma a `totalInspections` y a su bucket
 * de prioridad, pero NO se reparte entre inspectores: queda sin atribución
 * por diseño (el usuario debe completar el campo desde el modal). Esto
 * evita que la auditoría de quién creó el registro (`metadata.createdBy`,
 * que puede ser otro OSERP que sólo cargó el ingreso) contamine el
 * ranking del menú.
 *
 * Por inspección, cada email único del array suma 1 a sus contadores
 * (total, P1, P2). Si la diligencia se firmó a varias manos, cada
 * inspector listado suma de forma independiente; el total general
 * (`totalInspections`, `byPriority.*.inspections`) sigue contando la
 * inspección una sola vez.
 *
 * @param {{ year: number }} params — `year` es obligatorio.
 * @returns {Promise<object>} Forma de la respuesta documentada en el cliente.
 */
export async function getInspectionStats({ year } = {}) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 1900 || y > 9999) {
    throw httpError("Año de ejercicio inválido.", 400);
  }

  const inspections = await VesselInspectionMongoose.find(
    {
      arrivalDate: { $type: "date" },
      $expr: { $eq: [{ $year: "$arrivalDate" }, y] },
    },
    {
      arrivalDate: 1,
      arrivalPort: 1,
      cialaPriority: 1,
      inspectionPerformed: 1,
      deficiencies: 1,
      /* Para el ranking por inspector usamos exclusivamente el array
         `inspectors` (quien efectivamente firmó la diligencia).
         `metadata.createdBy` ya no se considera para atribuir: puede ser
         el OSERP que sólo cargó el ingreso y no participó de la
         inspección. */
      inspectors: 1,
    }
  ).lean();

  const priorityBuckets = {
    1: emptyPriorityBucket(),
    2: emptyPriorityBucket(),
    noPriority: emptyPriorityBucket(),
  };

  let totalArrivals = 0;
  let totalInspections = 0;
  let totalDeficiencies = 0;
  let inspectionsWithIsm = 0;
  let inspectionsWithDeficiencies = 0;
  /** @type {Map<string, { p1Arrivals: number, p1Inspections: number }>} */
  const portP1Stats = new Map();
  const deficiencyCounts = new Map();
  const inspectorCounts = new Map();
  const inspectorP1Counts = new Map();
  const inspectorP2Counts = new Map();

  for (const ins of inspections) {
    totalArrivals += 1;
    const priority = normalizeCialaPriority(ins.cialaPriority);
    const bucketKey = priority ?? "noPriority";
    const bucket = priorityBuckets[bucketKey];
    bucket.arrivals += 1;

    const port = String(ins.arrivalPort ?? "").trim();
    const performed = !!ins.inspectionPerformed;

    if (port && priority === 1) {
      let entry = portP1Stats.get(port);
      if (!entry) {
        entry = { p1Arrivals: 0, p1Inspections: 0 };
        portP1Stats.set(port, entry);
      }
      entry.p1Arrivals += 1;
      if (performed) entry.p1Inspections += 1;
    }

    if (!performed) continue;

    totalInspections += 1;
    bucket.inspections += 1;

    const defs = Array.isArray(ins.deficiencies) ? ins.deficiencies : [];
    if (defs.length > 0) {
      inspectionsWithDeficiencies += 1;
      bucket.deficient += 1;
      totalDeficiencies += defs.length;
      let ismFlag = false;
      for (const d of defs) {
        if (d?.ISMrelated) ismFlag = true;
        const code = String(d?.code ?? "").trim();
        if (code) {
          deficiencyCounts.set(code, (deficiencyCounts.get(code) || 0) + 1);
        }
      }
      if (ismFlag) inspectionsWithIsm += 1;
    }

    /* Atribución de la inspección a los inspectores: cada email único
       del array `inspectors` suma 1 a sus contadores total/P1/P2. Si la
       inspección se firmó a varias manos, cada inspector listado suma
       de manera independiente, así el ranking del menú refleja la
       participación real (sin alterar `totalInspections`, que ya se
       incrementó una sola vez arriba). Si el array vino vacío, la
       inspección NO se atribuye a nadie en el ranking por diseño:
       `metadata.createdBy` no se usa como fallback porque puede ser el
       OSERP que sólo cargó el ingreso. */
    const inspectorEmails = (
      Array.isArray(ins.inspectors) ? ins.inspectors : []
    )
      .map((e) => String(e ?? "").trim().toLowerCase())
      .filter(Boolean);
    const seenInThis = new Set();
    for (const email of inspectorEmails) {
      if (seenInThis.has(email)) continue;
      seenInThis.add(email);
      inspectorCounts.set(email, (inspectorCounts.get(email) || 0) + 1);
      if (priority === 1) {
        inspectorP1Counts.set(
          email,
          (inspectorP1Counts.get(email) || 0) + 1
        );
      } else if (priority === 2) {
        inspectorP2Counts.set(
          email,
          (inspectorP2Counts.get(email) || 0) + 1
        );
      }
    }
  }

  for (const key of Object.keys(priorityBuckets)) {
    const b = priorityBuckets[key];
    b.deficientPct = pctRound(b.deficient, b.arrivals);
  }

  /* "Top puertos" se ordena por cobertura de inspecciones Prioridad 1: qué
     porcentaje de los buques P1 que ingresaron a ese puerto fueron
     efectivamente inspeccionados. Sólo se incluyen puertos con al menos un
     ingreso P1; el desempate se hace por cantidad de ingresos P1 desc para
     evitar que un puerto con 1/1 (100%) tape a otro con 40/50 (80%). */
  const topPorts = Array.from(portP1Stats.entries())
    .map(([port, entry]) => ({
      port,
      p1Arrivals: entry.p1Arrivals,
      p1Inspections: entry.p1Inspections,
      p1CoveragePct: pctRound(entry.p1Inspections, entry.p1Arrivals),
    }))
    .filter((row) => row.p1Arrivals > 0)
    .sort((a, b) => {
      if (b.p1CoveragePct !== a.p1CoveragePct) {
        return b.p1CoveragePct - a.p1CoveragePct;
      }
      return b.p1Arrivals - a.p1Arrivals;
    })
    .slice(0, 5);

  const topDeficiencies = Array.from(deficiencyCounts.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const activeInspectors = await UserMongoose.find(
    {
      states: { $elemMatch: { name: OSERP_STATE_NAME, isActive: true } },
    },
    { email: 1, first_name: 1, last_name: 1, rank: 1, unit: 1, avatar: 1 }
  ).lean();

  const byInspector = activeInspectors
    .map((u) => {
      const email = String(u.email ?? "")
        .trim()
        .toLowerCase();
      return {
        email,
        firstName: String(u.first_name ?? ""),
        lastName: String(u.last_name ?? ""),
        rank: String(u.rank ?? ""),
        unit: String(u.unit ?? ""),
        avatar: String(u.avatar ?? ""),
        count: email ? inspectorCounts.get(email) || 0 : 0,
        countP1: email ? inspectorP1Counts.get(email) || 0 : 0,
        countP2: email ? inspectorP2Counts.get(email) || 0 : 0,
      };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return `${a.lastName} ${a.firstName}`.localeCompare(
        `${b.lastName} ${b.firstName}`,
        "es"
      );
    });

  const avgDeficienciesPerInspection =
    totalInspections > 0
      ? Math.round((totalDeficiencies / totalInspections) * 100) / 100
      : 0;

  return {
    year: y,
    totalArrivals,
    totalInspections,
    inspectionsWithDeficiencies,
    inspectionsClean: totalInspections - inspectionsWithDeficiencies,
    inspectionsWithIsm,
    totalDeficiencies,
    avgDeficienciesPerInspection,
    byPriority: {
      p1: priorityBuckets[1],
      p2: priorityBuckets[2],
      noPriority: priorityBuckets.noPriority,
    },
    topPorts,
    topDeficiencies,
    byInspector,
  };
}

/**
 * Devuelve los años con inspecciones registradas (en función del `arrivalDate`),
 * ordenados de más reciente a más antiguo. Si no hay inspecciones, devuelve un
 * arreglo vacío; el front se encarga de mostrar al menos el año actual.
 */
export async function listInspectionYears() {
  const rows = await VesselInspectionMongoose.aggregate([
    { $match: { arrivalDate: { $type: "date" } } },
    { $group: { _id: { $year: "$arrivalDate" } } },
    { $project: { _id: 0, year: "$_id" } },
    { $sort: { year: -1 } },
  ]);
  return rows
    .map((r) => Number(r.year))
    .filter((y) => Number.isFinite(y) && y > 0);
}

/**
 * Actualiza parcialmente una inspección.
 *
 * Manejo del PDF (`inspectionPDF`):
 *  - Si llega `pdfFile`, reemplaza el archivo previo: borra el viejo en disco
 *    y guarda el nuevo como `<_id>.pdf`.
 *  - Si en el body llega `removeInspectionPDF: true` (sin archivo), borra el
 *    PDF existente y deja el campo vacío.
 *  - Si no llega ni archivo ni flag de remoción, no toca `inspectionPDF`.
 *
 * @param {string} inspectionId
 * @param {object} body
 * @param {object|null} user
 * @param {{ filename: string }|null} [pdfFile]
 */
export async function updateInspectionById(
  inspectionId,
  body,
  user,
  pdfFile = null
) {
  const id = str(inspectionId);
  if (!isValidObjectId(id)) {
    throw httpError("Identificador de inspección no válido.", 400);
  }
  const existing = await VesselInspectionMongoose.findById(id).exec();
  if (!existing) {
    throw httpError("Inspección no encontrada.", 404);
  }
  const wasPerformed = Boolean(existing.inspectionPerformed);
  const partial = await buildInspectionPayload(body, { partial: true });
  Object.assign(existing, partial);

  /* Auto-asignación de inspector: cuando el registro pasa de "Ingreso
     pendiente" a "Inspección realizada", agregamos el email del usuario
     que confirma la diligencia (a menos que el cliente ya haya enviado
     una lista explícita de `inspectors`). */
  const willBePerformed = Boolean(existing.inspectionPerformed);
  const userEmail = str(user?.email).toLowerCase();
  const inspectorsExplicit = body && body.inspectors !== undefined;
  if (
    !wasPerformed &&
    willBePerformed &&
    userEmail &&
    !inspectorsExplicit
  ) {
    const current = Array.isArray(existing.inspectors)
      ? existing.inspectors.map((s) => String(s).toLowerCase())
      : [];
    if (!current.includes(userEmail)) {
      existing.inspectors = [...current, userEmail];
    }
  }

  if (pdfFile) {
    if (existing.inspectionPDF) {
      deleteStoredInspectionPdf(existing.inspectionPDF);
    }
    const url = renameInspectionPdfByInspectionId(pdfFile, existing._id);
    if (!url) {
      throw httpError("No se pudo guardar el PDF de la inspección.", 500);
    }
    existing.inspectionPDF = url;
  } else if (
    body &&
    (body.removeInspectionPDF === true || body.removeInspectionPDF === "true")
  ) {
    if (existing.inspectionPDF) {
      deleteStoredInspectionPdf(existing.inspectionPDF);
    }
    existing.inspectionPDF = "";
  }

  existing.metadata = {
    createdBy: existing.metadata?.createdBy || "",
    lastModifiedBy: str(user?.email),
  };
  await existing.save();
  return existing.toObject();
}

/**
 * Elimina una inspección por _id y, si tenía PDF asociado, también lo borra
 * del disco bajo `SICEN-back/storage/inspectionsERP/`.
 */
export async function deleteInspectionById(inspectionId) {
  const id = str(inspectionId);
  if (!isValidObjectId(id)) {
    throw httpError("Identificador de inspección no válido.", 400);
  }
  const deleted = await VesselInspectionMongoose.findByIdAndDelete(id).exec();
  if (!deleted) {
    throw httpError("Inspección no encontrada.", 404);
  }
  if (deleted.inspectionPDF) {
    deleteStoredInspectionPdf(deleted.inspectionPDF);
  }
  return { id };
}

/** Re-exports para tests / debug, si se requieren. */
export const _internals = {
  buildInspectionPayload,
  resolveVesselObjectId,
  normalizeDeficiencies,
  parseDateInput,
};

export { mongoose };
