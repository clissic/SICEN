import { shipFinesModel, getNextShipFineNumber } from "../DAO/models/shipFines.model.js";
import { ShipFinesMongoose } from "../DAO/models/mongoose/shipFines.mongoose.js";
import {
  normalizeVesselFinePayload,
  validateVesselFinePayload,
} from "../constants/vesselFines.js";
import {
  findVesselByIdentifier,
  findVesselDocumentByIdentifier,
  linkShipFineToVessel,
  unlinkShipFineFromVessel,
} from "./vessels.service.js";

function auditLabel(user) {
  if (!user || typeof user !== "object") return "S/M";
  const email = String(user.email ?? "").trim();
  if (email) return email;
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return name || "S/M";
}

function vesselSnapshot(vessel) {
  const id = vessel?.identification ?? {};
  return {
    vesselName: String(vessel?.generalInfo?.name ?? "").trim(),
    vesselImo: id.imoNumber != null ? String(id.imoNumber) : "",
    vesselRegistry:
      id.nationalRegistryNumber != null
        ? String(id.nationalRegistryNumber)
        : "",
  };
}

/**
 * Crea la multa en `shipFines` y agrega su `_id` al array `fines` del buque.
 * @param {object} rawBody
 * @param {object|null} user
 */
export async function createShipFine(rawBody, user) {
  const normalized = normalizeVesselFinePayload(rawBody, {
    fineAuthor: user?.email,
    lastModifiedBy: auditLabel(user),
  });
  const err = validateVesselFinePayload(normalized);
  if (err) {
    const e = new Error(err);
    e.statusCode = 400;
    throw e;
  }

  const vesselDoc = await findVesselDocumentByIdentifier(normalized.vesselId);
  if (!vesselDoc) {
    const e = new Error("Buque no encontrado.");
    e.statusCode = 404;
    throw e;
  }

  const businessId = String(vesselDoc.id ?? "").trim();
  const fine_number = await getNextShipFineNumber();
  const snap = vesselSnapshot(vesselDoc.toObject ? vesselDoc.toObject() : vesselDoc);

  const created = await shipFinesModel.create({
    fine_number,
    fine_date: normalized.fine_date,
    fine_time: normalized.fine_time,
    fine_article: normalized.fine_article,
    fine_amount: normalized.fine_amount,
    fine_extra_amount: normalized.fine_extra_amount,
    fine_author: normalized.fine_author,
    fine_proves: normalized.fine_proves,
    fine_status: normalized.fine_status,
    vesselId: businessId || normalized.vesselId,
    vessel: vesselDoc._id,
    ...snap,
    owner_ci: normalized.owner_ci,
    owner_name: normalized.owner_name,
    owner_tel: normalized.owner_tel,
    owner_dir: normalized.owner_dir,
    last_modified_by: normalized.last_modified_by,
  });

  await linkShipFineToVessel(vesselDoc._id, created._id);
  return created;
}

/**
 * @param {number|string} fineNumber
 * @param {object} rawBody
 * @param {object|null} user
 */
export async function updateShipFineByNumber(fineNumber, rawBody, user) {
  const n = Number(fineNumber);
  if (!Number.isFinite(n)) {
    const e = new Error("Número de multa no válido.");
    e.statusCode = 400;
    throw e;
  }

  const existing = await shipFinesModel.findByNumber(n);
  if (!existing) {
    const e = new Error("Multa no encontrada.");
    e.statusCode = 404;
    throw e;
  }

  const merged = {
    ...existing,
    ...rawBody,
    vesselId: existing.vesselId,
    vessel_id: existing.vesselId,
  };
  const normalized = normalizeVesselFinePayload(merged, {
    fineAuthor: existing.fine_author || user?.email,
    lastModifiedBy: auditLabel(user),
  });
  const err = validateVesselFinePayload(normalized);
  if (err) {
    const e = new Error(err);
    e.statusCode = 400;
    throw e;
  }

  return shipFinesModel.findOneAndUpdate(
    { fine_number: n },
    {
      fine_date: normalized.fine_date,
      fine_time: normalized.fine_time,
      fine_article: normalized.fine_article,
      fine_amount: normalized.fine_amount,
      fine_extra_amount: normalized.fine_extra_amount,
      fine_proves: normalized.fine_proves,
      fine_status: normalized.fine_status,
      owner_ci: normalized.owner_ci,
      owner_name: normalized.owner_name,
      owner_tel: normalized.owner_tel,
      owner_dir: normalized.owner_dir,
      last_modified_by: normalized.last_modified_by,
    },
  );
}

/**
 * @param {string} fineMongoId
 */
export async function deleteShipFineById(fineMongoId) {
  const existing = await shipFinesModel.findById(fineMongoId);
  if (!existing) {
    const e = new Error("Multa no encontrada.");
    e.statusCode = 404;
    throw e;
  }

  if (existing.vessel) {
    await unlinkShipFineFromVessel(existing.vessel, existing._id);
  }

  await shipFinesModel.deleteById(existing._id);
  return existing;
}

/** @param {string} vesselIdParam */
export async function listShipFinesByVessel(vesselIdParam) {
  const vessel = await findVesselByIdentifier(vesselIdParam);
  if (!vessel) return null;
  const businessId = String(vessel.id ?? "").trim();
  return ShipFinesMongoose.find({
    $or: [{ vesselId: businessId }, { vessel: vessel._id }],
  })
    .sort({ fine_number: -1 })
    .lean()
    .exec();
}
