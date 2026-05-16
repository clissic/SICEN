import mongoose from "mongoose";
import { LicenceMongoose } from "../DAO/models/mongoose/licences.mongoose.js";
import { seafarerAuditLabelFromUser } from "./seafarers.service.js";
import {
  keywordRegexConditions,
  parseMetadataPagination,
} from "./seafarersMetadata.service.js";

function str(v) {
  return v == null ? "" : String(v).trim();
}

function boolOr(v, defaultVal) {
  if (v === true || v === false) return v;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
  }
  return defaultVal;
}

function buildPagedResult(rows, total, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    items: rows,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/** @param {object} raw */
export function normalizeLicenceBody(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const n = o.name && typeof o.name === "object" ? o.name : {};
  const kindRaw = str(o.kind).toLowerCase();
  const kind = kindRaw === "title" ? "title" : "license";
  return {
    kind,
    code: str(o.code),
    name: {
      es: str(n.es),
      en: str(n.en),
    },
    category: str(o.category),
    authority: str(o.authority),
    requiresRenewal: boolOr(o.requiresRenewal, false),
    active: boolOr(o.active, true),
  };
}

/**
 * @param {ReturnType<typeof normalizeLicenceBody>} p
 */
export function validateLicenceCreateInput(p) {
  if (!p.code) return "Indique el código del título o licencia.";
  if (!p.name.es && !p.name.en) {
    return "Indique el nombre en español y/o en inglés.";
  }
  return null;
}

/** @param {string} id */
function requireLicenceObjectId(id) {
  const s = str(id);
  if (!mongoose.Types.ObjectId.isValid(s)) {
    const e = new Error("Identificador de licencia no válido.");
    e.statusCode = 400;
    throw e;
  }
  return s;
}

export async function createLicence(body, user) {
  const normalized = normalizeLicenceBody(body);
  const err = validateLicenceCreateInput(normalized);
  if (err) {
    const e = new Error(err);
    e.statusCode = 400;
    throw e;
  }
  const now = new Date();
  const label = seafarerAuditLabelFromUser(user);
  const created = await LicenceMongoose.create({
    ...normalized,
    metadata: {
      createdAt: now,
      updatedAt: now,
      lastModifiedBy: label,
    },
  });
  return created.toObject ? created.toObject() : created;
}

/**
 * @param {string} id
 * @param {object} body
 * @param {object|null} user
 */
export async function updateLicenceById(id, body, user) {
  const oid = requireLicenceObjectId(id);
  const normalized = normalizeLicenceBody(body);
  const err = validateLicenceCreateInput(normalized);
  if (err) {
    const e = new Error(err);
    e.statusCode = 400;
    throw e;
  }
  const now = new Date();
  const label = seafarerAuditLabelFromUser(user);
  const updated = await LicenceMongoose.findByIdAndUpdate(
    oid,
    {
      $set: {
        ...normalized,
        "metadata.updatedAt": now,
        "metadata.lastModifiedBy": label,
      },
      $unset: { issueDate: "", expirationDate: "" },
    },
    { new: true, runValidators: true },
  )
    .lean()
    .exec();

  if (!updated) {
    const e = new Error("No se encontró el registro en el catálogo.");
    e.statusCode = 404;
    throw e;
  }
  return updated;
}

/** @param {string} id */
export async function deleteLicenceById(id) {
  const oid = requireLicenceObjectId(id);
  const deleted = await LicenceMongoose.findByIdAndDelete(oid).lean().exec();
  if (!deleted) {
    const e = new Error("No se encontró el registro en el catálogo.");
    e.statusCode = 404;
    throw e;
  }
  return deleted;
}

/** @param {"title"|"license"} catalogueKind */
function listMatchForCatalogueKind(catalogueKind) {
  if (catalogueKind === "title") {
    return { kind: "title" };
  }
  return {
    $or: [
      { kind: "license" },
      { kind: { $exists: false } },
      { kind: null },
    ],
  };
}

/** @param {string} q */
export async function listLicencesPaginated({
  page,
  pageSize,
  q,
  catalogueKind,
}) {
  const ck = String(catalogueKind ?? "").trim().toLowerCase();
  const kindFilter = ck === "title" ? "title" : "license";

  const { page: p, pageSize: ps, skip } = parseMetadataPagination(page, pageSize);
  const kw = keywordRegexConditions(q);

  const pipeline = [{ $match: listMatchForCatalogueKind(kindFilter) }];

  pipeline.push(
    {
      $addFields: {
        searchText: {
          $concat: [
            { $toString: "$_id" },
            " ",
            { $ifNull: ["$code", ""] },
            " ",
            { $ifNull: ["$name.es", ""] },
            " ",
            { $ifNull: ["$name.en", ""] },
            " ",
            { $ifNull: ["$category", ""] },
            " ",
            { $ifNull: ["$authority", ""] },
            " ",
            { $toString: { $ifNull: ["$requiresRenewal", false] } },
            " ",
            { $toString: { $ifNull: ["$kind", "license"] } },
            " ",
            { $toString: { $ifNull: ["$active", false] } },
            " ",
            { $ifNull: ["$metadata.lastModifiedBy", ""] },
            " ",
            { $toString: { $ifNull: ["$metadata.createdAt", ""] } },
            " ",
            { $toString: { $ifNull: ["$metadata.updatedAt", ""] } },
          ],
        },
      },
    },
  );

  if (kw.length) {
    pipeline.push({ $match: { $and: kw } });
  }

  pipeline.push(
    { $sort: { code: 1 } },
    {
      $facet: {
        meta: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: ps },
          {
            $project: {
              _id: 1,
              code: 1,
              kind: 1,
              name: 1,
              category: 1,
              authority: 1,
              requiresRenewal: 1,
              active: 1,
              metadata: 1,
            },
          },
        ],
      },
    },
  );

  const [result] = await LicenceMongoose.aggregate(pipeline).exec();
  const total = result?.meta?.[0]?.total ?? 0;
  const items = result?.data ?? [];
  return buildPagedResult(items, total, p, ps);
}
