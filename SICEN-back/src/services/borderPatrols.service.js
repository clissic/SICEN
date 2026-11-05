import { isValidObjectId } from "mongoose";
import { BorderPatrolsMongoose } from "../DAO/models/mongoose/borderPatrols.mongoose.js";
import { BorderPatrolTypesMongoose } from "../DAO/models/mongoose/borderPatrolTypes.mongoose.js";
import { UnitMongoose } from "../DAO/models/mongoose/units.mongoose.js";
import { logger } from "../utils/logger.js";

const EMPRE = "EMPRE";
const KINDS = new Set(["fluvial", "terrestre"]);
const STATUSES = new Set(["planned", "fulfilled", "missed"]);
const AREAS = new Set(["rio-uruguay", "rio-de-la-plata", "oceano-atlantico"]);
const FUEL_TYPES = new Set([
  "nafta-super",
  "nafta-premium",
  "gasoil-comun",
  "gasoil-especial",
  "jet-a1",
]);

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

export function assertEmpreUser(user) {
  if (userUnit(user) !== EMPRE) {
    throw httpError("Esta función es solo para la unidad EMPRE.", 403);
  }
}

function parseYear(yearRaw) {
  const year = Number(yearRaw);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw httpError("El año no es válido.", 400);
  }
  return year;
}

function parseYearMonth(yearRaw, monthRaw) {
  const year = parseYear(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw httpError("El mes no es válido.", 400);
  }
  return { year, month };
}

let patrolIndexesReady = null;
function ensureBorderPatrolIndexes() {
  if (!patrolIndexesReady) {
    patrolIndexesReady = BorderPatrolsMongoose.syncIndexes().catch((e) => {
      patrolIndexesReady = null;
      logger.warning("Índices de patrullas: " + (e?.message || e));
    });
  }
  return patrolIndexesReady;
}

function parseDate(raw) {
  const value = str(raw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw httpError("La fecha no es válida.", 400);
  }
  const [year, month, day] = value.split("-").map(Number);
  const dt = new Date(year, month - 1, day);
  if (
    dt.getFullYear() !== year ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day
  ) {
    throw httpError("La fecha no es válida.", 400);
  }
  return value;
}

function nonNegInt(raw, label) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || Math.floor(n) !== n) {
    throw httpError(`${label} no es válido.`, 400);
  }
  return n;
}

function nonNegDecimal(raw, label) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw httpError(`${label} no es válido.`, 400);
  }
  return Math.round(n * 10) / 10;
}

function parseFulfillment(raw, patrol) {
  if (!raw || typeof raw !== "object") {
    throw httpError("Completá los datos de la patrulla cumplida.", 400);
  }
  const area = str(patrol?.area).toLowerCase();
  if (!AREAS.has(area)) {
    throw httpError("La patrulla no tiene un área asignada.", 400);
  }
  const kind = str(patrol?.kind).toLowerCase();
  if (!KINDS.has(kind)) {
    throw httpError("El tipo de patrulla no es válido.", 400);
  }
  const vehicle = str(raw.vehicle).slice(0, 80);
  if (!vehicle) throw httpError("Indicá el medio utilizado (matrícula).", 400);

  const registeredCraft = nonNegInt(raw.registeredCraft, "Embarcaciones registradas");
  const controlled = raw.controlledCraft || {};
  const sports = nonNegInt(controlled.sports ?? raw.controlledSports, "Emb. deportivas");
  const merchant = nonNegInt(controlled.merchant ?? raw.controlledMerchant, "Buques mercantes");
  const fishing = nonNegInt(controlled.fishing ?? raw.controlledFishing, "Pesqueros");
  const identifiedPersons = nonNegInt(
    raw.identifiedPersons,
    "Personas identificadas"
  );

  const fuelType = str(raw.fuel?.type || raw.fuelType).toLowerCase();
  if (!FUEL_TYPES.has(fuelType)) throw httpError("Elegí el tipo de combustible.", 400);
  const liters = nonNegDecimal(raw.fuel?.liters ?? raw.fuelLiters, "Cantidad de combustible");

  const incidentsRaw = Array.isArray(raw.incidents) ? raw.incidents : [];
  const incidents = [];
  for (const item of incidentsRaw) {
    const detail = str(item?.detail).slice(0, 1000);
    if (detail) incidents.push({ detail });
  }

  let distanceNm = 0;
  let distanceKm = 0;
  if (kind === "fluvial") {
    distanceNm = nonNegDecimal(raw.distanceNm, "Millas náuticas patrulladas");
  } else {
    distanceKm = nonNegDecimal(
      raw.distanceKm ?? raw.distanceNm,
      "Kilómetros patrullados"
    );
  }
  const breakdowns = nonNegInt(raw.breakdowns, "Averías");
  const personnel = Number(raw.personnel);
  if (!Number.isFinite(personnel) || personnel < 1 || Math.floor(personnel) !== personnel) {
    throw httpError("El personal involucrado debe ser al menos 1.", 400);
  }

  return {
    area,
    vehicle,
    registeredCraft,
    controlledCraft: { sports, merchant, fishing },
    identifiedPersons,
    fuel: { type: fuelType, liters },
    incidents,
    incidentCount: incidents.length,
    distanceNm,
    distanceKm,
    breakdowns,
    personnel,
  };
}

export async function listBorderPatrolsByMonth({ year, month }, user) {
  await ensureBorderPatrolIndexes();
  const unit = userUnit(user);
  if (!unit) throw httpError("Debe iniciar sesión.", 401);

  const hasMonth = month !== undefined && month !== null && String(month).trim() !== "";
  const prefix = hasMonth
    ? (() => {
        const parsed = parseYearMonth(year, month);
        return `${parsed.year}-${String(parsed.month).padStart(2, "0")}-`;
      })()
    : `${parseYear(year)}-`;

  const filter = { date: { $regex: `^${prefix}` } };
  if (unit !== EMPRE) {
    filter.unitAcronym = unit;
  }

  const patrols = await BorderPatrolsMongoose.find(filter)
    .sort({ date: 1, unitAcronym: 1, kind: 1 })
    .lean();
  return patrols;
}

export async function createBorderPatrol(body, user) {
  assertEmpreUser(user);
  await ensureBorderPatrolIndexes();
  const unitAcronym = str(body?.unitAcronym).toUpperCase();
  if (!unitAcronym) throw httpError("Elegí una unidad.", 400);
  const unit = await UnitMongoose.findOne({ acronym: unitAcronym })
    .select("_id")
    .lean();
  if (!unit) throw httpError("La unidad no está cargada en el sistema.", 400);

  const typeId = str(body?.typeId);
  if (!isValidObjectId(typeId)) throw httpError("Elegí la patrulla.", 400);
  const type = await BorderPatrolTypesMongoose.findById(typeId).lean();
  if (!type || type.unitAcronym !== unitAcronym) {
    throw httpError("La patrulla no corresponde a esa unidad.", 400);
  }
  const kind = str(body?.kind).toLowerCase();
  if (!KINDS.has(kind)) throw httpError("Elegí si es terrestre o fluvial.", 400);
  if (kind !== type.kind) {
    throw httpError("El tipo no coincide con la patrulla elegida.", 400);
  }
  const area = str(type.area).toLowerCase();
  if (!AREAS.has(area)) {
    throw httpError("Esa patrulla no tiene un área cargada. Pedile a la unidad que la complete.", 400);
  }

  const date = parseDate(body?.date);
  const email = str(user?.email);
  try {
    const doc = await BorderPatrolsMongoose.create({
      unitAcronym,
      date,
      kind,
      typeId: type._id,
      number: type.number,
      detail: type.detail,
      area,
      status: "planned",
      metadata: { createdBy: email, lastModifiedBy: email },
    });
    return doc.toObject();
  } catch (e) {
    if (e?.code === 11000) {
      throw httpError("Esa patrulla ya está asignada ese día.", 409);
    }
    throw e;
  }
}

export async function updateBorderPatrolStatus(id, body, user) {
  if (!isValidObjectId(id)) throw httpError("Identificador no válido.", 400);
  const status = str(body?.status).toLowerCase();
  if (!STATUSES.has(status)) throw httpError("El estado no es válido.", 400);
  const existing = await BorderPatrolsMongoose.findById(id).exec();
  if (!existing) throw httpError("No se encontró la patrulla.", 404);

  const unit = userUnit(user);
  if (unit !== EMPRE && unit !== str(existing.unitAcronym).toUpperCase()) {
    throw httpError("No podés modificar patrullas de otra unidad.", 403);
  }

  let observations = existing.observations || "";
  if (Object.prototype.hasOwnProperty.call(body || {}, "observations")) {
    observations = str(body.observations);
    if (observations.length > 500) {
      throw httpError("Las observaciones no pueden superar los 500 caracteres.", 400);
    }
  }

  if (status === "fulfilled") {
    existing.fulfillment = parseFulfillment(body?.fulfillment, existing);
  }

  existing.status = status;
  existing.observations = observations;
  existing.metadata = {
    createdBy: existing.metadata?.createdBy || "",
    lastModifiedBy: str(user?.email),
  };
  await existing.save();
  return existing.toObject();
}

export async function deleteBorderPatrol(id, user) {
  assertEmpreUser(user);
  if (!isValidObjectId(id)) throw httpError("Identificador no válido.", 400);
  const existing = await BorderPatrolsMongoose.findByIdAndDelete(id).lean();
  if (!existing) throw httpError("No se encontró la patrulla.", 404);
  return existing;
}
