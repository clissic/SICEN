import mongoose from "mongoose";
import {
  TITLE_DEPARTMENTS,
  TITLE_LEVELS,
  TitleMongoose,
} from "../DAO/models/mongoose/titles.mongoose.js";
import { seafarerAuditLabelFromUser } from "./seafarers.service.js";
import {
  keywordRegexConditions,
  parseMetadataPagination,
} from "./seafarersMetadata.service.js";

const DEPARTMENT_SET = new Set(TITLE_DEPARTMENTS);
const LEVEL_SET = new Set(TITLE_LEVELS);

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
export function normalizeTitleBody(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const n = o.name && typeof o.name === "object" ? o.name : {};
  const vyRaw = o.validityYears;
  let validityYears = 5;
  if (vyRaw != null && vyRaw !== "") {
    const n_ = parseInt(String(vyRaw), 10);
    if (Number.isFinite(n_) && n_ >= 0) validityYears = n_;
  }
  const dept = str(o.department);
  const lev = str(o.level);
  return {
    code: str(o.code).toUpperCase(),
    stcwRegulation: str(o.stcwRegulation),
    name: {
      es: str(n.es),
      en: str(n.en),
    },
    department: dept,
    level: lev,
    function: str(o.function),
    application: str(o.application),
    requiresRenewal: boolOr(o.requiresRenewal, true),
    validityYears,
    active: boolOr(o.active, true),
  };
}

/**
 * @param {ReturnType<typeof normalizeTitleBody>} p
 */
export function validateTitleInput(p) {
  if (!p.code) return "Indique el código del título.";
  if (!p.stcwRegulation) return "Indique el reglamento.";
  if (!p.name.es) return "Indique el nombre en español.";
  if (!p.name.en) return "Indique el nombre en inglés.";
  if (!DEPARTMENT_SET.has(p.department)) {
    return `Departamento no válido. Use uno de: ${TITLE_DEPARTMENTS.join(", ")}.`;
  }
  if (!LEVEL_SET.has(p.level)) {
    return `Nivel no válido. Use uno de: ${TITLE_LEVELS.join(", ")}.`;
  }
  return null;
}

/** @param {string} id */
function requireTitleObjectId(id) {
  const s = str(id);
  if (!mongoose.Types.ObjectId.isValid(s)) {
    const e = new Error("Identificador de título no válido.");
    e.statusCode = 400;
    throw e;
  }
  return s;
}

/** @param {object} body */
/** @param {object|null} user */
export async function createTitle(body, user) {
  const normalized = normalizeTitleBody(body);
  const err = validateTitleInput(normalized);
  if (err) {
    const e = new Error(err);
    e.statusCode = 400;
    throw e;
  }
  const now = new Date();
  const label = seafarerAuditLabelFromUser(user);
  try {
    const created = await TitleMongoose.create({
      ...normalized,
      metadata: {
        createdAt: now,
        updatedAt: now,
        lastModifiedBy: label,
      },
    });
    return created.toObject ? created.toObject() : created;
  } catch (e) {
    if (e?.code === 11000) {
      const x = new Error("Ya existe un título con ese código.");
      x.statusCode = 409;
      throw x;
    }
    throw e;
  }
}

/**
 * @param {string} id
 * @param {object} body
 * @param {object|null} user
 */
export async function updateTitleById(id, body, user) {
  const oid = requireTitleObjectId(id);
  const normalized = normalizeTitleBody(body);
  const err = validateTitleInput(normalized);
  if (err) {
    const e = new Error(err);
    e.statusCode = 400;
    throw e;
  }
  const now = new Date();
  const label = seafarerAuditLabelFromUser(user);
  try {
    const updated = await TitleMongoose.findByIdAndUpdate(
      oid,
      {
        $set: {
          ...normalized,
          "metadata.updatedAt": now,
          "metadata.lastModifiedBy": label,
        },
      },
      { new: true, runValidators: true },
    )
      .lean()
      .exec();

    if (!updated) {
      const e = new Error("No se encontró el título en el catálogo.");
      e.statusCode = 404;
      throw e;
    }
    return updated;
  } catch (e) {
    if (e?.code === 11000) {
      const x = new Error("Ya existe un título con ese código.");
      x.statusCode = 409;
      throw x;
    }
    throw e;
  }
}

/** @param {string} id */
export async function deleteTitleById(id) {
  const oid = requireTitleObjectId(id);
  const deleted = await TitleMongoose.findByIdAndDelete(oid).lean().exec();
  if (!deleted) {
    const e = new Error("No se encontró el título en el catálogo.");
    e.statusCode = 404;
    throw e;
  }
  return deleted;
}

/** @param {string} q */
export async function listTitlesPaginated({ page, pageSize, q }) {
  const { page: p, pageSize: ps, skip } = parseMetadataPagination(page, pageSize);
  const kw = keywordRegexConditions(q);

  const pipeline = [
    {
      $addFields: {
        searchText: {
          $concat: [
            { $toString: "$_id" },
            " ",
            { $ifNull: ["$code", ""] },
            " ",
            { $ifNull: ["$stcwRegulation", ""] },
            " ",
            { $ifNull: ["$name.es", ""] },
            " ",
            { $ifNull: ["$name.en", ""] },
            " ",
            { $ifNull: ["$department", ""] },
            " ",
            { $ifNull: ["$level", ""] },
            " ",
            { $ifNull: ["$function", ""] },
            " ",
            { $ifNull: ["$application", ""] },
            " ",
            { $toString: { $ifNull: ["$requiresRenewal", false] } },
            " ",
            { $toString: { $ifNull: ["$validityYears", ""] } },
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
  ];

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
              stcwRegulation: 1,
              name: 1,
              department: 1,
              level: 1,
              function: 1,
              application: 1,
              requiresRenewal: 1,
              validityYears: 1,
              active: 1,
              metadata: 1,
            },
          },
        ],
      },
    },
  );

  const [result] = await TitleMongoose.aggregate(pipeline).exec();
  const total = result?.meta?.[0]?.total ?? 0;
  const items = result?.data ?? [];
  return buildPagedResult(items, total, p, ps);
}
