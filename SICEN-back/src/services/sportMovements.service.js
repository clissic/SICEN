import { isValidObjectId } from "mongoose";
import { SportMovementMongoose } from "../DAO/models/mongoose/sportMovements.mongoose.js";
import { VesselMongoose } from "../DAO/models/mongoose/vessels.mongoose.js";
import { SeafarerMongoose } from "../DAO/models/mongoose/seafarers.mongoose.js";
import { LicenceMongoose } from "../DAO/models/mongoose/licences.mongoose.js";
import { findUnitByAcronym } from "./units.service.js";
import { notifyAudience } from "./notifications.service.js";
import {
  normalizeSportBrevetCategory,
  SPORT_BREVET_KEYS,
} from "../constants/seafarerSportBrevet.js";
import {
  normalizeSeafarerDni,
  normalizeSeafarerPassport,
  normalizeSeafarerCcSeries,
  normalizeSeafarerCcNumber,
} from "../utils/seafarerDocument.js";

const VALIDITY_MS = 24 * 60 * 60 * 1000;
const EDITABLE_STATUSES = new Set(["standBy", "expired"]);

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

function userEmail(user) {
  return str(user?.email).toLowerCase();
}

function plus24h(from = new Date()) {
  return new Date(from.getTime() + VALIDITY_MS);
}

/**
 * Resuelve `_id` de buque desde Mongo id o id de negocio.
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

function parseEta(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }
  const s = str(value);
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

function normalizePassengers(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      const row = p && typeof p === "object" ? p : {};
      return {
        fullName: str(row.fullName),
        documentNumber: str(row.documentNumber),
      };
    })
    .filter((p) => p.fullName || p.documentNumber);
}

async function loadUyBdLicenseIds() {
  const docs = await LicenceMongoose.find(
    { code: "UY_BD", kind: "license" },
    { _id: 1 }
  ).lean();
  return new Set(docs.map((d) => String(d._id)));
}

function seafarerDisplayName(seafarer) {
  const pd = seafarer?.personalData || {};
  const last = str(pd.lastName);
  const first = str(pd.firstName);
  if (last && first) return `${last}, ${first}`;
  return last || first || "";
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
    if (cat && SPORT_BREVET_KEYS.has(cat)) {
      return cat;
    }
  }
  return null;
}

/**
 * Busca náuta por documento y exige brevet deportivo UY_BD.
 */
async function resolveSkipperFromBody(skipperBody) {
  const raw = skipperBody && typeof skipperBody === "object" ? skipperBody : {};
  const documentType = str(raw.documentType) || "DNI";
  const documentNumber = str(raw.documentNumber);
  const ccSeries = str(raw.ccSeries);
  const ccNumber = str(raw.ccNumber);

  if (!["DNI", "Pasaporte", "CC"].includes(documentType)) {
    throw httpError("Tipo de documento del patrón no válido.");
  }

  let filter;
  let storedDocNumber = "";
  if (documentType === "DNI") {
    const n = normalizeSeafarerDni(documentNumber);
    if (!n) throw httpError("Indique la cédula del patrón.");
    storedDocNumber = n;
    filter = {
      $or: [
        { "identificationDocuments.dni": n },
        { "document.type": "DNI", "document.number": n },
        { "document.type": "Cédula de identidad", "document.number": n },
      ],
    };
  } else if (documentType === "Pasaporte") {
    const n = normalizeSeafarerPassport(documentNumber);
    if (!n) throw httpError("Indique el pasaporte del patrón.");
    storedDocNumber = n;
    filter = {
      $or: [
        { "identificationDocuments.passport": n },
        { "document.type": "Pasaporte", "document.number": n },
      ],
    };
  } else {
    const series = normalizeSeafarerCcSeries(ccSeries);
    const number = normalizeSeafarerCcNumber(ccNumber || documentNumber);
    if (!series) throw httpError("Indique la serie de la credencial cívica del patrón.");
    if (!number) throw httpError("Indique el número de la credencial cívica del patrón.");
    storedDocNumber = `${series}-${number}`;
    filter = {
      "identificationDocuments.civicCredential.series": series,
      "identificationDocuments.civicCredential.number": number,
    };
  }

  const seafarer = await SeafarerMongoose.findOne(filter)
    .populate({
      path: "heldLicenses.licenseId",
      select: "code name kind category authority active",
    })
    .lean();

  if (!seafarer) {
    throw httpError("No se encontró un náuta con ese documento.", 404);
  }

  const uyBdIds = await loadUyBdLicenseIds();
  const brevetCategory = extractSportBrevet(seafarer, uyBdIds);
  if (!brevetCategory) {
    throw httpError(
      "El patrón indicado no tiene Brevet Deportivo (UY_BD) registrado."
    );
  }

  return {
    seafarerId: seafarer._id,
    documentType,
    documentNumber: storedDocNumber,
    fullName: seafarerDisplayName(seafarer),
    brevetCategory,
    phone: str(seafarer.contact?.phone),
    email: str(seafarer.contact?.email),
    address: str(seafarer.contact?.address),
  };
}

async function buildVesselSnapshot(vesselObjectId) {
  const vessel = await VesselMongoose.findById(vesselObjectId).lean();
  if (!vessel) {
    throw httpError("El buque indicado no existe en la base de buques.", 400);
  }
  if (str(vessel.vesselType) !== "Deportivo") {
    throw httpError("Solo se pueden despachar buques de tipo Deportivo.");
  }
  return {
    vessel,
    snapshot: {
      name: str(vessel.generalInfo?.name),
      nationalRegistryNumber: str(
        vessel.identification?.nationalRegistryNumber
      ),
      vesselType: str(vessel.vesselType),
    },
  };
}

async function normalizeInformedUnits(raw) {
  if (!Array.isArray(raw)) {
    throw httpError("Las prefecturas a informar deben enviarse como una lista.");
  }

  const units = [
    ...new Set(raw.map((value) => str(value).toUpperCase()).filter(Boolean)),
  ];

  for (const acronym of units) {
    const unit = await findUnitByAcronym(acronym);
    if (!unit) {
      throw httpError(`La prefectura a informar «${acronym}» no existe.`);
    }
  }

  return units;
}

function assertPrefecturesAreCoherent(destinationUnit, informedUnits) {
  const destination = str(destinationUnit).toUpperCase();
  const transit = Array.isArray(informedUnits) ? informedUnits : [];
  if (destination && transit.includes(destination)) {
    throw httpError(
      "La prefectura de destino no puede repetirse entre las prefecturas de tránsito."
    );
  }
}

/**
 * Valida y normaliza campos editables del movimiento.
 */
async function buildMovementPayload(body, { partial = false } = {}) {
  const out = {};

  if (!partial || body.vesselId !== undefined) {
    const objectId = await resolveVesselObjectId(body.vesselId);
    if (!objectId) {
      throw httpError("El buque indicado no existe en la base de buques.", 400);
    }
    const { snapshot } = await buildVesselSnapshot(objectId);
    out.vesselId = objectId;
    out.vesselSnapshot = snapshot;
  }

  if (!partial || body.departureDate !== undefined) {
    const d = str(body.departureDate);
    if (!partial && !d) throw httpError("Indique la fecha de despacho.");
    if (d) out.departureDate = d;
  }

  if (!partial || body.departureTime !== undefined) {
    const t = str(body.departureTime);
    if (!partial && !t) throw httpError("Indique la hora de despacho.");
    if (t) out.departureTime = t;
  }

  if (!partial || body.departurePort !== undefined) {
    const p = str(body.departurePort);
    if (!partial && !p) throw httpError("Indique el puerto de despacho.");
    if (body.departurePort !== undefined) out.departurePort = p;
  }

  if (!partial || body.destinationPort !== undefined) {
    const p = str(body.destinationPort);
    if (!partial && !p) throw httpError("Indique el puerto de destino.");
    if (body.destinationPort !== undefined) out.destinationPort = p;
  }

  if (!partial || body.eta !== undefined) {
    const eta = parseEta(body.eta);
    if (!partial && !eta) throw httpError("Indique una ETA válida.");
    if (body.eta !== undefined) {
      if (!eta) throw httpError("ETA no válida.");
      out.eta = eta;
    }
  }

  if (!partial || body.destinationUnit !== undefined) {
    const acronym = str(body.destinationUnit).toUpperCase();
    if (!partial && !acronym) {
      throw httpError("Indique la prefectura a informar.");
    }
    if (acronym) {
      const unit = await findUnitByAcronym(acronym);
      if (!unit) {
        throw httpError("La prefectura a informar no existe.", 400);
      }
      out.destinationUnit = acronym;
    }
  }

  if (!partial || body.informedUnits !== undefined) {
    out.informedUnits = await normalizeInformedUnits(body.informedUnits || []);
  }

  if (!partial || body.skipper !== undefined) {
    if (!partial && !body.skipper) {
      throw httpError("Indique el patrón del movimiento.");
    }
    if (body.skipper !== undefined) {
      out.skipper = await resolveSkipperFromBody(body.skipper);
    }
  }

  if (!partial || body.passengers !== undefined) {
    out.passengers = normalizePassengers(body.passengers);
  }

  return out;
}

/**
 * Marca como expired los standBy de una unidad origen cuya validez venció.
 */
export async function expireStaleStandByForOrigin(originUnit) {
  const unit = str(originUnit).toUpperCase();
  if (!unit) return 0;
  const now = new Date();
  const result = await SportMovementMongoose.updateMany(
    {
      originUnit: unit,
      status: "standBy",
      standBy: true,
      expiresAt: { $lte: now },
    },
    {
      $set: { status: "expired", standBy: true },
    }
  );
  return result.modifiedCount || 0;
}

function openMovementFilter(excludeMovementId = null) {
  const openFilter = {
    status: { $in: ["standBy", "expired", "inTransit"] },
  };
  if (excludeMovementId) {
    openFilter._id = { $ne: excludeMovementId };
  }
  return openFilter;
}

function vesselBusyMessage(busyVessel) {
  const name = str(busyVessel?.vesselSnapshot?.name) || "ese buque";
  const status = str(busyVessel?.status) || "abierto";
  return `El buque «${name}» ya tiene un movimiento abierto (${status}). Debe cerrarse antes de registrar otro despacho.`;
}

async function findOpenMovementForVessel(vesselId, excludeMovementId = null) {
  if (!vesselId) return null;
  return SportMovementMongoose.findOne({
    ...openMovementFilter(excludeMovementId),
    vesselId,
  })
    .select("_id status vesselSnapshot.name originUnit destinationUnit")
    .lean();
}

/**
 * Verifica si un buque puede iniciar un despacho (sin movimiento abierto).
 * Se usa al click de «Registrar movimiento» antes de abrir el modal.
 */
export async function checkVesselAvailability(vesselIdParam) {
  const objectId = await resolveVesselObjectId(vesselIdParam);
  if (!objectId) {
    throw httpError("El buque indicado no existe en la base de buques.", 404);
  }
  const busyVessel = await findOpenMovementForVessel(objectId);
  if (busyVessel) {
    return {
      available: false,
      msg: vesselBusyMessage(busyVessel),
      openMovement: busyVessel,
    };
  }
  return { available: true, vesselId: objectId };
}

/**
 * Un buque o patrón no puede figurar en más de un movimiento abierto
 * (cualquier status distinto de `closed`).
 */
async function assertVesselAndSkipperAvailable({
  vesselId,
  skipper,
  excludeMovementId = null,
} = {}) {
  const openFilter = openMovementFilter(excludeMovementId);

  if (vesselId) {
    const busyVessel = await findOpenMovementForVessel(
      vesselId,
      excludeMovementId
    );
    if (busyVessel) {
      throw httpError(vesselBusyMessage(busyVessel));
    }
  }

  if (skipper) {
    const or = [];
    if (skipper.seafarerId) {
      or.push({ "skipper.seafarerId": skipper.seafarerId });
    }
    const docType = str(skipper.documentType);
    const docNumber = str(skipper.documentNumber);
    if (docType && docNumber) {
      or.push({
        "skipper.documentType": docType,
        "skipper.documentNumber": docNumber,
      });
    }
    if (or.length) {
      const busySkipper = await SportMovementMongoose.findOne({
        ...openFilter,
        $or: or,
      })
        .select("_id status skipper.fullName vesselSnapshot.name")
        .lean();
      if (busySkipper) {
        const skipperName =
          str(busySkipper.skipper?.fullName) || "El patrón indicado";
        const vesselName =
          str(busySkipper.vesselSnapshot?.name) || "otro buque";
        throw httpError(
          `${skipperName} ya está asignado al movimiento abierto del buque «${vesselName}» (${busySkipper.status}). No puede despacharse en otro buque hasta que ese movimiento se cierre.`
        );
      }
    }
  }
}

export async function createSportMovement(body, user) {
  const origin = userUnit(user);
  if (!origin) {
    throw httpError(
      "Su usuario no tiene unidad asignada; no puede registrar despachos."
    );
  }

  const payload = await buildMovementPayload(body, { partial: false });
  assertPrefecturesAreCoherent(
    payload.destinationUnit,
    payload.informedUnits
  );
  await assertVesselAndSkipperAvailable({
    vesselId: payload.vesselId,
    skipper: payload.skipper,
  });

  const now = new Date();
  const email = userEmail(user);

  const doc = await SportMovementMongoose.create({
    ...payload,
    originUnit: origin,
    standBy: true,
    status: "standBy",
    expiresAt: plus24h(now),
    confirmedAt: null,
    renewedAt: null,
    metadata: {
      createdBy: email,
      lastModifiedBy: email,
    },
  });
  return doc.toObject();
}

export async function listDispatchesForUser(user, { page, limit } = {}) {
  const origin = userUnit(user);
  if (!origin) {
    throw httpError("Su usuario no tiene unidad asignada.");
  }
  await expireStaleStandByForOrigin(origin);

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));

  return SportMovementMongoose.paginate(
    {
      originUnit: origin,
      status: { $in: ["standBy", "expired"] },
    },
    {
      page: safePage,
      limit: safeLimit,
      sort: { createdAt: -1 },
    }
  );
}

/** Despachos ya confirmados (inTransit) de la unidad origen. */
export async function listConfirmedDispatchesForUser(
  user,
  { page, limit } = {}
) {
  const origin = userUnit(user);
  if (!origin) {
    throw httpError("Su usuario no tiene unidad asignada.");
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));

  return SportMovementMongoose.paginate(
    {
      originUnit: origin,
      status: "inTransit",
      standBy: false,
    },
    {
      page: safePage,
      limit: safeLimit,
      sort: { confirmedAt: -1, createdAt: -1 },
    }
  );
}

export async function listArrivalsForUser(user, { page, limit } = {}) {
  const dest = userUnit(user);
  if (!dest) {
    throw httpError("Su usuario no tiene unidad asignada.");
  }
  const now = new Date();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));

  return SportMovementMongoose.paginate(
    {
      destinationUnit: dest,
      status: "inTransit",
      standBy: false,
      eta: { $gte: now },
    },
    {
      page: safePage,
      limit: safeLimit,
      sort: { eta: 1 },
    }
  );
}

/**
 * Materializa notificaciones de demora (idempotente).
 * Destino + cada prefectura de tránsito; una sola vez por movimiento.
 */
export async function materializeDelayedNotifications({ limit = 40 } = {}) {
  const now = new Date();
  const batch = await SportMovementMongoose.find({
    status: "inTransit",
    standBy: false,
    eta: { $lt: now },
    $or: [{ delayedNotifiedAt: null }, { delayedNotifiedAt: { $exists: false } }],
  })
    .sort({ eta: 1 })
    .limit(Math.min(100, Math.max(1, Number(limit) || 40)))
    .lean();

  if (!batch.length) return { processed: 0 };

  const href = "/mi-unidad/areas/movimientos-deportivos/demorados";
  let processed = 0;

  for (const m of batch) {
    const movementId = String(m._id);
    const name = str(m.vesselSnapshot?.name) || "Buque";
    const reg =
      str(m.vesselSnapshot?.nationalRegistryNumber) || "s/matrícula";
    const destUnit = str(m.destinationUnit).toUpperCase();
    const transitUnits = Array.isArray(m.informedUnits)
      ? [
          ...new Set(
            m.informedUnits
              .map((u) => str(u).toUpperCase())
              .filter((u) => u && u !== destUnit)
          ),
        ]
      : [];

    const baseMeta = {
      movementId,
      vesselName: name,
      nationalRegistryNumber: reg,
      originUnit: str(m.originUnit).toUpperCase(),
      destinationUnit: destUnit,
      informedUnits: transitUnits,
    };

    if (destUnit) {
      await notifyAudience({
        audienceType: "unit",
        audienceValue: destUnit,
        type: "sportMovement.delayed",
        title: "Buque demorado",
        body: `Buque demorado: ${name} (${reg}) con ETA vencida hacia su prefectura.`,
        href,
        meta: { ...baseMeta, role: "destination" },
        dedupeKey: `sportMovement.delayed:${movementId}:${destUnit}`,
      });
    }

    for (const unit of transitUnits) {
      await notifyAudience({
        audienceType: "unit",
        audienceValue: unit,
        type: "sportMovement.delayed",
        title: "Buque demorado en tránsito",
        body: `Buque demorado en tránsito por su jurisdicción: ${name} (${reg}).`,
        href,
        meta: { ...baseMeta, role: "transit" },
        dedupeKey: `sportMovement.delayed:${movementId}:${unit}`,
      });
    }

    await SportMovementMongoose.updateOne(
      { _id: m._id },
      { $set: { delayedNotifiedAt: now } }
    );
    processed += 1;
  }

  return { processed };
}

export async function listDelayedForUser(user, { page, limit } = {}) {
  await materializeDelayedNotifications();
  const dest = userUnit(user);
  if (!dest) {
    throw httpError("Su usuario no tiene unidad asignada.");
  }
  const now = new Date();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));

  return SportMovementMongoose.paginate(
    {
      status: "inTransit",
      standBy: false,
      eta: { $lt: now },
      $or: [{ destinationUnit: dest }, { informedUnits: dest }],
    },
    {
      page: safePage,
      limit: safeLimit,
      sort: { eta: 1 },
    }
  );
}

export async function delayedAlertForUser(user) {
  await materializeDelayedNotifications();
  const unit = userUnit(user);
  if (!unit) {
    return { count: 0, items: [] };
  }
  const now = new Date();
  /** Destino operativo o prefectura informada en tránsito. */
  const filter = {
    status: "inTransit",
    standBy: false,
    eta: { $lt: now },
    $or: [{ destinationUnit: unit }, { informedUnits: unit }],
  };
  const [count, items] = await Promise.all([
    SportMovementMongoose.countDocuments(filter),
    SportMovementMongoose.find(filter)
      .select(
        "vesselSnapshot departurePort destinationPort eta originUnit destinationUnit informedUnits skipper.fullName"
      )
      .sort({ eta: 1 })
      .limit(20)
      .lean(),
  ]);

  return { count, items };
}

/** Casos cerrados (buques arribados) de la unidad destino.
 *  Con `onlyDelayed: true` solo los que se cerraron con ETA ya vencida
 *  (historial de demorados resueltos; excluye arribos a tiempo).
 */
export async function listClosedForUser(user, { page, limit, onlyDelayed } = {}) {
  const dest = userUnit(user);
  if (!dest) {
    throw httpError("Su usuario no tiene unidad asignada.");
  }
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));

  const filter = {
    destinationUnit: dest,
    status: "closed",
  };

  const delayedOnly =
    onlyDelayed === true ||
    onlyDelayed === "true" ||
    onlyDelayed === "1" ||
    onlyDelayed === 1;
  if (delayedOnly) {
    filter.$expr = {
      $and: [
        { $ne: ["$eta", null] },
        { $ne: ["$closedAt", null] },
        { $gte: ["$closedAt", "$eta"] },
      ],
    };
  }

  return SportMovementMongoose.paginate(filter, {
    page: safePage,
    limit: safeLimit,
    sort: { closedAt: -1, createdAt: -1 },
  });
}

const CLOSURE_OUTCOMES = new Set(["arrived", "maritimeIncident"]);

/**
 * Cierra un movimiento en tránsito (unidad destino).
 * Puede usarse desde ARRIBOS (antes de la ETA) o DEMORADOS.
 * outcome: arrived | maritimeIncident
 */
export async function closeSportMovement(id, body, user) {
  if (!isValidObjectId(id)) throw httpError("Identificador no válido.", 400);
  const dest = userUnit(user);
  if (!dest) throw httpError("Su usuario no tiene unidad asignada.");

  const outcome = str(body?.outcome);
  if (!CLOSURE_OUTCOMES.has(outcome)) {
    throw httpError(
      'Indique el resultado del cierre: "arrived" o "maritimeIncident".'
    );
  }
  const notes = str(body?.observations ?? body?.closureNotes);

  const doc = await SportMovementMongoose.findById(id).exec();
  if (!doc) throw httpError("Movimiento no encontrado.", 404);
  if (str(doc.destinationUnit).toUpperCase() !== dest) {
    throw httpError(
      "Solo la prefectura de destino puede cerrar este movimiento.",
      403
    );
  }
  if (doc.status !== "inTransit" || doc.standBy) {
    throw httpError("Solo se pueden cerrar movimientos en tránsito.");
  }

  const now = new Date();
  doc.status = "closed";
  doc.standBy = false;
  doc.closureOutcome = outcome;
  doc.closureNotes = notes;
  doc.closedAt = now;
  doc.metadata = {
    createdBy: doc.metadata?.createdBy || "",
    lastModifiedBy: userEmail(user),
  };
  await doc.save();
  return doc.toObject();
}

async function loadOwnedEditable(id, user) {
  if (!isValidObjectId(id)) throw httpError("Identificador no válido.", 400);
  const origin = userUnit(user);
  if (!origin) throw httpError("Su usuario no tiene unidad asignada.");

  await expireStaleStandByForOrigin(origin);

  const doc = await SportMovementMongoose.findById(id).exec();
  if (!doc) throw httpError("Movimiento no encontrado.", 404);
  if (str(doc.originUnit).toUpperCase() !== origin) {
    throw httpError("No puede gestionar un movimiento de otra unidad.", 403);
  }
  if (!EDITABLE_STATUSES.has(doc.status)) {
    throw httpError(
      "Solo se pueden modificar o eliminar movimientos en espera o vencidos."
    );
  }
  return doc;
}

export async function updateSportMovement(id, body, user) {
  const doc = await loadOwnedEditable(id, user);
  const partial = await buildMovementPayload(body, { partial: true });

  const nextVesselId =
    partial.vesselId !== undefined ? partial.vesselId : doc.vesselId;
  const nextSkipper =
    partial.skipper !== undefined ? partial.skipper : doc.skipper;
  const nextDestinationUnit =
    partial.destinationUnit !== undefined
      ? partial.destinationUnit
      : doc.destinationUnit;
  const nextInformedUnits =
    partial.informedUnits !== undefined
      ? partial.informedUnits
      : doc.informedUnits;

  assertPrefecturesAreCoherent(nextDestinationUnit, nextInformedUnits);
  await assertVesselAndSkipperAvailable({
    vesselId: nextVesselId,
    skipper: nextSkipper,
    excludeMovementId: doc._id,
  });

  Object.assign(doc, partial);
  doc.metadata = {
    createdBy: doc.metadata?.createdBy || "",
    lastModifiedBy: userEmail(user),
  };
  await doc.save();
  return doc.toObject();
}

export async function confirmSportMovement(id, user) {
  const doc = await loadOwnedEditable(id, user);
  if (doc.status === "expired") {
    throw httpError(
      "El movimiento está vencido. Renévelo antes de confirmarlo."
    );
  }
  if (doc.status !== "standBy" || !doc.standBy) {
    throw httpError("Solo se pueden confirmar movimientos en espera.");
  }
  const now = new Date();
  if (doc.expiresAt && doc.expiresAt.getTime() <= now.getTime()) {
    doc.status = "expired";
    await doc.save();
    throw httpError(
      "El movimiento venció. Renévelo antes de confirmarlo."
    );
  }

  doc.standBy = false;
  doc.status = "inTransit";
  doc.confirmedAt = now;
  doc.metadata = {
    createdBy: doc.metadata?.createdBy || "",
    lastModifiedBy: userEmail(user),
  };
  await doc.save();
  return doc.toObject();
}

export async function renewSportMovement(id, user) {
  const doc = await loadOwnedEditable(id, user);
  if (doc.status !== "expired") {
    throw httpError("Solo se pueden renovar movimientos vencidos.");
  }
  const now = new Date();
  doc.status = "standBy";
  doc.standBy = true;
  doc.renewedAt = now;
  doc.expiresAt = plus24h(now);
  doc.confirmedAt = null;
  doc.metadata = {
    createdBy: doc.metadata?.createdBy || "",
    lastModifiedBy: userEmail(user),
  };
  await doc.save();
  return doc.toObject();
}

export async function deleteSportMovement(id, user) {
  const doc = await loadOwnedEditable(id, user);
  const deletedId = String(doc._id);
  await doc.deleteOne();
  return { id: deletedId };
}

/**
 * Anula un movimiento ya confirmado (inTransit) desde la unidad origen.
 * Libera buque/patrón y lo saca de arribos/demorados. Requiere motivo.
 */
export async function cancelConfirmedSportMovement(id, body, user) {
  if (!isValidObjectId(id)) throw httpError("Identificador no válido.", 400);
  const origin = userUnit(user);
  if (!origin) throw httpError("Su usuario no tiene unidad asignada.");

  const reason = str(body?.reason ?? body?.cancellationReason);
  if (!reason) {
    throw httpError("Indique el motivo de la eliminación.");
  }

  const doc = await SportMovementMongoose.findById(id).exec();
  if (!doc) throw httpError("Movimiento no encontrado.", 404);
  if (str(doc.originUnit).toUpperCase() !== origin) {
    throw httpError("No puede gestionar un movimiento de otra unidad.", 403);
  }
  if (doc.status !== "inTransit" || doc.standBy) {
    throw httpError(
      "Solo se pueden eliminar movimientos confirmados que estén en tránsito."
    );
  }

  const now = new Date();
  doc.status = "cancelled";
  doc.standBy = false;
  doc.cancellationReason = reason;
  doc.cancelledAt = now;
  doc.metadata = {
    createdBy: doc.metadata?.createdBy || "",
    lastModifiedBy: userEmail(user),
  };
  await doc.save();
  return doc.toObject();
}

export async function findSportMovementById(id, user) {
  if (!isValidObjectId(id)) throw httpError("Identificador no válido.", 400);
  const unit = userUnit(user);
  const doc = await SportMovementMongoose.findById(id).lean();
  if (!doc) throw httpError("Movimiento no encontrado.", 404);
  const origin = str(doc.originUnit).toUpperCase();
  const dest = str(doc.destinationUnit).toUpperCase();
  if (unit && unit !== origin && unit !== dest) {
    throw httpError("No tiene acceso a este movimiento.", 403);
  }
  return doc;
}
