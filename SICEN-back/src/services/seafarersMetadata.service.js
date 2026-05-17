import { SeafarerMongoose } from "../DAO/models/mongoose/seafarers.mongoose.js";

function str(v) {
  return v == null ? "" : String(v).trim();
}

function escapeRegex(s) {
  return str(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string|number} page
 * @param {string|number} pageSize
 */
export function parseMetadataPagination(page, pageSize) {
  const p = Math.max(1, parseInt(String(page ?? "1"), 10) || 1);
  let ps = parseInt(String(pageSize ?? "10"), 10);
  if (!Number.isFinite(ps) || ps < 1) ps = 10;
  if (ps > 100) ps = 100;
  return { page: p, pageSize: ps, skip: (p - 1) * ps };
}

/**
 * Palabras clave: todas deben aparecer en `searchText` (AND).
 * @param {string} q
 */
export function keywordRegexConditions(q) {
  const words = str(q)
    .split(/\s+/)
    .map((w) => escapeRegex(w))
    .filter(Boolean);
  if (!words.length) return [];
  return words.map((w) => ({
    searchText: { $regex: w, $options: "i" },
  }));
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

/** @param {string} q */
export async function aggregateSeafarerCourses({ page, pageSize, q }) {
  const { page: p, pageSize: ps, skip } = parseMetadataPagination(page, pageSize);
  const kw = keywordRegexConditions(q);

  const pipeline = [
    { $match: { courses: { $exists: true, $not: { $size: 0 } } } },
    { $unwind: "$courses" },
    {
      $project: {
        seafarerId: "$_id",
        document: 1,
        identificationDocuments: 1,
        firstName: "$personalData.firstName",
        lastName: "$personalData.lastName",
        c: "$courses",
      },
    },
    {
      $addFields: {
        searchText: {
          $concat: [
            { $toString: "$seafarerId" },
            " ",
            { $ifNull: ["$identificationDocuments.dni", ""] },
            " ",
            { $ifNull: ["$identificationDocuments.passport", ""] },
            " ",
            { $ifNull: ["$identificationDocuments.civicCredential.series", ""] },
            " ",
            { $ifNull: ["$identificationDocuments.civicCredential.number", ""] },
            " ",
            { $ifNull: ["$document.type", ""] },
            " ",
            { $ifNull: ["$document.number", ""] },
            " ",
            { $ifNull: ["$firstName", ""] },
            " ",
            { $ifNull: ["$lastName", ""] },
            " ",
            { $ifNull: ["$c.code", ""] },
            " ",
            { $ifNull: ["$c.name", ""] },
            " ",
            { $ifNull: ["$c.type", ""] },
            " ",
            { $ifNull: ["$c.institution.name", ""] },
            " ",
            { $ifNull: ["$c.institution.code", ""] },
            " ",
            { $ifNull: ["$c.certificate.number", ""] },
            " ",
            { $ifNull: ["$c.status", ""] },
            " ",
            { $toString: { $ifNull: ["$c.approvalDate", ""] } },
            " ",
            { $toString: { $ifNull: ["$c.expirationDate", ""] } },
          ],
        },
      },
    },
  ];

  if (kw.length) {
    pipeline.push({ $match: { $and: kw } });
  }

  pipeline.push(
    { $sort: { seafarerId: 1, "c.approvalDate": -1 } },
    {
      $facet: {
        meta: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: ps },
          {
            $project: {
              _id: 0,
              seafarerId: 1,
              document: 1,
              identificationDocuments: 1,
              personName: {
                $trim: {
                  input: {
                    $concat: [
                      { $ifNull: ["$firstName", ""] },
                      " ",
                      { $ifNull: ["$lastName", ""] },
                    ],
                  },
                },
              },
              code: "$c.code",
              name: "$c.name",
              type: "$c.type",
              institution: "$c.institution",
              approvalDate: "$c.approvalDate",
              expirationDate: "$c.expirationDate",
              certificate: "$c.certificate",
              status: "$c.status",
            },
          },
        ],
      },
    },
  );

  const [result] = await SeafarerMongoose.aggregate(pipeline).exec();
  const total = result?.meta?.[0]?.total ?? 0;
  const items = result?.data ?? [];
  return buildPagedResult(items, total, p, ps);
}

/** @param {string} q */
export async function aggregateSeafarerSanctions({ page, pageSize, q }) {
  const { page: p, pageSize: ps, skip } = parseMetadataPagination(page, pageSize);
  const kw = keywordRegexConditions(q);

  const pipeline = [
    { $match: { sanctions: { $exists: true, $not: { $size: 0 } } } },
    { $unwind: "$sanctions" },
    {
      $project: {
        seafarerId: "$_id",
        document: 1,
        identificationDocuments: 1,
        firstName: "$personalData.firstName",
        lastName: "$personalData.lastName",
        s: "$sanctions",
      },
    },
    {
      $addFields: {
        searchText: {
          $concat: [
            { $toString: "$seafarerId" },
            " ",
            { $ifNull: ["$identificationDocuments.dni", ""] },
            " ",
            { $ifNull: ["$identificationDocuments.passport", ""] },
            " ",
            { $ifNull: ["$identificationDocuments.civicCredential.series", ""] },
            " ",
            { $ifNull: ["$identificationDocuments.civicCredential.number", ""] },
            " ",
            { $ifNull: ["$document.type", ""] },
            " ",
            { $ifNull: ["$document.number", ""] },
            " ",
            { $ifNull: ["$firstName", ""] },
            " ",
            { $ifNull: ["$lastName", ""] },
            " ",
            {
              $cond: [
                { $eq: [{ $type: "$s" }, "object"] },
                {
                  $concat: [
                    { $ifNull: ["$s.code", ""] },
                    " ",
                    { $ifNull: ["$s.type", ""] },
                    " ",
                    { $ifNull: ["$s.description", ""] },
                    " ",
                    { $ifNull: ["$s.authority", ""] },
                    " ",
                    { $ifNull: ["$s.status", ""] },
                    " ",
                    { $ifNull: ["$s.resolutionNumber", ""] },
                    " ",
                    { $toString: { $ifNull: ["$s.issueDate", ""] } },
                    " ",
                    { $toString: { $ifNull: ["$s.expirationDate", ""] } },
                  ],
                },
                { $toString: "$s" },
              ],
            },
          ],
        },
      },
    },
  ];

  if (kw.length) {
    pipeline.push({ $match: { $and: kw } });
  }

  pipeline.push(
    { $sort: { seafarerId: 1 } },
    {
      $facet: {
        meta: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: ps },
          {
            $project: {
              _id: 0,
              seafarerId: 1,
              document: 1,
              identificationDocuments: 1,
              personName: {
                $trim: {
                  input: {
                    $concat: [
                      { $ifNull: ["$firstName", ""] },
                      " ",
                      { $ifNull: ["$lastName", ""] },
                    ],
                  },
                },
              },
              code: {
                $cond: [
                  { $eq: [{ $type: "$s" }, "object"] },
                  { $ifNull: ["$s.code", ""] },
                  "",
                ],
              },
              type: {
                $cond: [
                  { $eq: [{ $type: "$s" }, "object"] },
                  { $ifNull: ["$s.type", ""] },
                  { $toString: "$s" },
                ],
              },
              description: {
                $cond: [
                  { $eq: [{ $type: "$s" }, "object"] },
                  { $ifNull: ["$s.description", ""] },
                  "",
                ],
              },
              issueDate: {
                $cond: [
                  { $eq: [{ $type: "$s" }, "object"] },
                  "$s.issueDate",
                  null,
                ],
              },
              expirationDate: {
                $cond: [
                  { $eq: [{ $type: "$s" }, "object"] },
                  "$s.expirationDate",
                  null,
                ],
              },
              authority: {
                $cond: [
                  { $eq: [{ $type: "$s" }, "object"] },
                  { $ifNull: ["$s.authority", ""] },
                  "",
                ],
              },
              status: {
                $cond: [
                  { $eq: [{ $type: "$s" }, "object"] },
                  { $ifNull: ["$s.status", ""] },
                  "",
                ],
              },
              resolutionNumber: {
                $cond: [
                  { $eq: [{ $type: "$s" }, "object"] },
                  { $ifNull: ["$s.resolutionNumber", ""] },
                  "",
                ],
              },
            },
          },
        ],
      },
    },
  );

  const [result] = await SeafarerMongoose.aggregate(pipeline).exec();
  const total = result?.meta?.[0]?.total ?? 0;
  const items = result?.data ?? [];
  return buildPagedResult(items, total, p, ps);
}
