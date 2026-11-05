import { isValidObjectId } from "mongoose";
import { BorderPatrolTypesMongoose } from "../DAO/models/mongoose/borderPatrolTypes.mongoose.js";
import { UnitMongoose } from "../DAO/models/mongoose/units.mongoose.js";

const EMPRE = "EMPRE";
const KINDS = new Set(["fluvial", "terrestre"]);
const AREAS = new Set(["rio-uruguay", "rio-de-la-plata", "oceano-atlantico"]);

function httpError(msg, status = 400) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

function str(v) {
  return String(v ?? "").trim();
}

function callerUnit(user) {
  return str(user?.unit).toUpperCase();
}

function assertReader(user, unitAcronym) {
  const mine = callerUnit(user);
  if (!mine) throw httpError("No tiene una unidad asignada.", 403);
  if (mine === EMPRE || mine === unitAcronym) return mine;
  throw httpError("No puede ver las patrullas de otra unidad.", 403);
}

/** La unidad que patrulla carga su número y detalle. EMPRE solo las consulta. */
function assertOwner(user) {
  const mine = callerUnit(user);
  if (!mine) throw httpError("No tiene una unidad asignada.", 403);
  if (mine === EMPRE) {
    throw httpError(
      "El número y el detalle los carga un tripulante de la unidad que patrulla.",
      403
    );
  }
  return mine;
}

function parseNumber(raw) {
  const number = Number(raw);
  if (!Number.isInteger(number) || number < 1 || number > 99) {
    throw httpError("El número de patrulla tiene que ser entre 1 y 99.", 400);
  }
  return number;
}

function parseKind(raw) {
  const kind = str(raw).toLowerCase();
  if (!KINDS.has(kind)) throw httpError("Elegí si es terrestre o fluvial.", 400);
  return kind;
}

function parseDetail(raw) {
  const detail = str(raw);
  if (!detail) throw httpError("Escribí el detalle de la patrulla.", 400);
  if (detail.length > 240) {
    throw httpError("El detalle es demasiado largo.", 400);
  }
  return detail;
}

function parseArea(raw) {
  const area = str(raw).toLowerCase();
  if (!AREAS.has(area)) throw httpError("Elegí el área.", 400);
  return area;
}

async function assertUnitExists(unitAcronym) {
  const unit = await UnitMongoose.findOne({ acronym: unitAcronym })
    .select("_id")
    .lean();
  if (!unit) throw httpError("La unidad no está cargada en el sistema.", 400);
}

export async function listBorderPatrolTypes(unitAcronymRaw, user) {
  const unitAcronym = str(unitAcronymRaw).toUpperCase();
  if (!unitAcronym) throw httpError("Elegí una unidad.", 400);
  assertReader(user, unitAcronym);
  const types = await BorderPatrolTypesMongoose.find({ unitAcronym })
    .sort({ number: 1, kind: 1 })
    .lean();
  return types;
}

export async function createBorderPatrolType(body, user) {
  const unitAcronym = assertOwner(user);
  await assertUnitExists(unitAcronym);
  const number = parseNumber(body?.number);
  const kind = parseKind(body?.kind);
  const detail = parseDetail(body?.detail);
  const area = parseArea(body?.area);
  const email = str(user?.email);
  try {
    const doc = await BorderPatrolTypesMongoose.create({
      unitAcronym,
      number,
      kind,
      detail,
      area,
      metadata: { createdBy: email, lastModifiedBy: email },
    });
    return doc.toObject();
  } catch (e) {
    if (e?.code === 11000) {
      throw httpError("Esa patrulla ya está cargada en la unidad.", 409);
    }
    throw e;
  }
}

export async function updateBorderPatrolType(id, body, user) {
  const unitAcronym = assertOwner(user);
  if (!isValidObjectId(id)) throw httpError("Identificador no válido.", 400);
  const existing = await BorderPatrolTypesMongoose.findById(id).exec();
  if (!existing) throw httpError("No se encontró la patrulla.", 404);
  if (existing.unitAcronym !== unitAcronym) {
    throw httpError("No puede modificar las patrullas de otra unidad.", 403);
  }
  existing.number = parseNumber(body?.number);
  existing.kind = parseKind(body?.kind);
  existing.detail = parseDetail(body?.detail);
  existing.area = parseArea(body?.area);
  existing.metadata = {
    createdBy: existing.metadata?.createdBy || "",
    lastModifiedBy: str(user?.email),
  };
  try {
    await existing.save();
  } catch (e) {
    if (e?.code === 11000) {
      throw httpError("Esa patrulla ya está cargada en la unidad.", 409);
    }
    throw e;
  }
  return existing.toObject();
}

export async function deleteBorderPatrolType(id, user) {
  const unitAcronym = assertOwner(user);
  if (!isValidObjectId(id)) throw httpError("Identificador no válido.", 400);
  const existing = await BorderPatrolTypesMongoose.findById(id).exec();
  if (!existing) throw httpError("No se encontró la patrulla.", 404);
  if (existing.unitAcronym !== unitAcronym) {
    throw httpError("No puede eliminar las patrullas de otra unidad.", 403);
  }
  await existing.deleteOne();
  return { number: existing.number, kind: existing.kind };
}
