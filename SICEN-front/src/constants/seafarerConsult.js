import { seafarerDateToInputValue } from "../utils/seafarerDisplay.js";

export const SEAFARER_LICENSE_BUCKET_LABELS = {
  recreational: "Recreativa",
  comercial: "Comercial",
  special: "Especial",
};

export const SEAFARER_HELD_TITLE_STATUS_OPTIONS = [
  { value: "ACTIVO", label: "Activo" },
  { value: "VENCIDO", label: "Vencido" },
  { value: "SUSPENDIDO", label: "Suspendido" },
  { value: "REVOCADO", label: "Revocado" },
];

export const INITIAL_SEAFARER_HELD_LICENSE_FORM = {
  licenseId: "",
  /** Coinciden con catálogo al elegir licencia (no se envían al API). */
  _catalogCode: "",
  _catalogNameEs: "",
  _catalogNameEn: "",
  category: "",
  number: "",
  issuedDate: "",
  expirationDate: "",
  status: "ACTIVO",
  /** Solo en edición: si es true, el backend suma 1 a renewalsCount al guardar. */
  isRenewal: false,
};

export function heldLicenseFormToEntry(f) {
  return {
    licenseId: String(f.licenseId ?? "").trim(),
    category: String(f.category ?? "").trim(),
    number: String(f.number ?? "").trim(),
    issuedDate: String(f.issuedDate ?? "").trim(),
    expirationDate: String(f.expirationDate ?? "").trim(),
    status: String(f.status ?? "ACTIVO").trim().toUpperCase() || "ACTIVO",
  };
}

/**
 * @param {object} row — fila `buildLicenseConsultDisplayRows` con source `held`
 */
export function heldLicenseDisplayRowToForm(row) {
  if (!row || typeof row !== "object") {
    return { ...INITIAL_SEAFARER_HELD_LICENSE_FORM };
  }
  const code = String(row.code ?? "").trim();
  const name = String(row.name ?? "").trim();
  return {
    ...INITIAL_SEAFARER_HELD_LICENSE_FORM,
    licenseId: String(row.licenseId ?? "").trim(),
    _catalogCode: code,
    _catalogNameEs: name,
    _catalogNameEn: "",
    category: String(row.category ?? "").trim(),
    number: String(row.number ?? "").trim(),
    issuedDate: seafarerDateToInputValue(row.issuedDate),
    expirationDate: seafarerDateToInputValue(row.expirationDate),
    status: String(row.status ?? "ACTIVO").trim() || "ACTIVO",
    _pickerLabel: [code, name].filter(Boolean).join(" — "),
  };
}

export const INITIAL_SEAFARER_HELD_TITLE_FORM = {
  titleId: "",
  number: "",
  issuingInstitution: "",
  issuedDate: "",
  expirationDate: "",
  status: "ACTIVO",
  /** Solo en edición: si es true, el backend suma 1 a renewalsCount al guardar. */
  isRenewal: false,
};

export function heldTitleFormToEntry(f) {
  return {
    titleId: String(f.titleId ?? "").trim(),
    number: String(f.number ?? "").trim(),
    issuingInstitution: String(f.issuingInstitution ?? "").trim(),
    issuedDate: String(f.issuedDate ?? "").trim(),
    expirationDate: String(f.expirationDate ?? "").trim(),
    status: String(f.status ?? "ACTIVO").trim().toUpperCase() || "ACTIVO",
  };
}

/**
 * @param {object} row — fila de `buildHeldTitleDisplayRows`
 */
export function heldTitleDisplayRowToForm(row) {
  if (!row || typeof row !== "object") {
    return { ...INITIAL_SEAFARER_HELD_TITLE_FORM };
  }
  const code = String(row.code ?? "").trim();
  const name = String(row.name ?? "").trim();
  return {
    ...INITIAL_SEAFARER_HELD_TITLE_FORM,
    titleId: String(row.titleId ?? "").trim(),
    number: String(row.number ?? "").trim(),
    issuingInstitution: String(row.issuingInstitution ?? "").trim(),
    issuedDate: seafarerDateToInputValue(row.issuedDate),
    expirationDate: seafarerDateToInputValue(row.expirationDate),
    status: String(row.status ?? "ACTIVO").trim() || "ACTIVO",
    isRenewal: false,
    _pickerLabel: [code, name].filter(Boolean).join(" — "),
  };
}

export const INITIAL_SEAFARER_COURSE_FORM = {
  code: "",
  name: "",
  type: "",
  institutionName: "",
  institutionCode: "",
  approvalDate: "",
  expirationDate: "",
  certificateNumber: "",
  status: "",
};

export const INITIAL_SEAFARER_SANCTION_FORM = {
  code: "",
  type: "",
  description: "",
  issueDate: "",
  expirationDate: "",
  authority: "",
  status: "",
  resolutionNumber: "",
};

export const INITIAL_SEAFARER_OBSERVATION_FORM = {
  date: "",
  category: "",
  text: "",
};

export function courseFormToEntry(f) {
  return {
    code: String(f.code ?? "").trim(),
    name: String(f.name ?? "").trim(),
    type: String(f.type ?? "").trim(),
    institution: {
      name: String(f.institutionName ?? "").trim(),
      code: String(f.institutionCode ?? "").trim(),
    },
    approvalDate: String(f.approvalDate ?? "").trim(),
    expirationDate: String(f.expirationDate ?? "").trim(),
    certificate: {
      number: String(f.certificateNumber ?? "").trim(),
    },
    status: String(f.status ?? "").trim(),
  };
}

export function sanctionFormToEntry(f) {
  return {
    code: String(f.code ?? "").trim(),
    type: String(f.type ?? "").trim(),
    description: String(f.description ?? "").trim(),
    issueDate: String(f.issueDate ?? "").trim(),
    expirationDate: String(f.expirationDate ?? "").trim(),
    authority: String(f.authority ?? "").trim(),
    status: String(f.status ?? "").trim(),
    resolutionNumber: String(f.resolutionNumber ?? "").trim(),
  };
}

export function observationFormToEntry(f) {
  return {
    date: String(f.date ?? "").trim(),
    category: String(f.category ?? "").trim(),
    text: String(f.text ?? "").trim(),
  };
}

/** Aplana los tres buckets de licencias para tabular. */
export function flattenSeafarerLicenses(licenses) {
  const buckets = licenses && typeof licenses === "object" ? licenses : {};
  const rows = [];
  for (const [key, label] of Object.entries(SEAFARER_LICENSE_BUCKET_LABELS)) {
    const list = Array.isArray(buckets[key]) ? buckets[key] : [];
    for (const item of list) {
      const kind = item.kind === "title" ? "title" : "license";
      rows.push({
        ...item,
        bucket: key,
        bucketLabel: label,
        kind,
      });
    }
  }
  return rows;
}

/** Separa filas de títulos (`kind: title`) y de licencias (`kind: license` o sin kind). */
export function splitSeafarerLicenseRows(licenses) {
  const all = flattenSeafarerLicenses(licenses);
  return {
    titles: all.filter((r) => r.kind === "title"),
    licencias: all.filter((r) => r.kind !== "title"),
  };
}

/**
 * Filas para la tabla «Títulos» en consulta: `seafarer.titles` (catálogo) + histórico en `licenses`.
 * @param {object|null|undefined} seafarer
 */
export function buildHeldTitleDisplayRows(seafarer) {
  const held = Array.isArray(seafarer?.titles) ? seafarer.titles : [];
  const fromHeld = held.map((t, i) => {
    const cat = t.titleId && typeof t.titleId === "object" ? t.titleId : null;
    const tid =
      cat?._id != null
        ? String(cat._id)
        : t.titleId != null
          ? String(t.titleId)
          : "";
    const subId = t._id != null ? String(t._id) : "";
    return {
      rowKey: subId || `held-${tid}-${i}`,
      source: "held",
      heldEntryId: subId,
      titleId: tid,
      code: cat?.code != null ? String(cat.code) : "",
      name:
        cat?.name?.es || cat?.name?.en
          ? String(cat.name.es || cat.name.en || "").trim()
          : "",
      number: t.number != null ? String(t.number) : "",
      issuedDate: t.issuedDate,
      expirationDate: t.expirationDate,
      issuingInstitution:
        t.issuingInstitution != null ? String(t.issuingInstitution) : "",
      status: t.status != null ? String(t.status) : "ACTIVO",
      renewalsCount:
        t.renewalsCount != null && Number.isFinite(Number(t.renewalsCount))
          ? Math.max(0, Math.floor(Number(t.renewalsCount)))
          : 0,
    };
  });
  const legacy = splitSeafarerLicenseRows(seafarer?.licenses).titles.map(
    (r, i) => ({
      rowKey: `legacy-${r.bucket}-${i}-${r.licenseNumber ?? ""}`,
      source: "legacy",
      heldEntryId: "",
      titleId: "",
      code: r.code != null ? String(r.code) : "",
      name: r.name != null ? String(r.name) : "",
      number: r.licenseNumber != null ? String(r.licenseNumber) : "",
      issuedDate: r.issueDate,
      expirationDate: r.expirationDate,
      issuingInstitution: r.issuer != null ? String(r.issuer) : "",
      status: r.status != null ? String(r.status) : "",
      renewalsCount: null,
    }),
  );
  return [...fromHeld, ...legacy];
}

/**
 * Licencias en consulta: `heldLicenses` (catálogo) + histórico en buckets `licenses`.
 * @param {object|null|undefined} seafarer
 */
export function buildLicenseConsultDisplayRows(seafarer) {
  const held = Array.isArray(seafarer?.heldLicenses) ? seafarer.heldLicenses : [];
  const fromHeld = held.map((t, i) => {
    const cat =
      t.licenseId && typeof t.licenseId === "object" ? t.licenseId : null;
    const lid =
      cat?._id != null
        ? String(cat._id)
        : t.licenseId != null
          ? String(t.licenseId)
          : "";
    const subId = t._id != null ? String(t._id) : "";
    return {
      rowKey: subId || `held-lic-${lid}-${i}`,
      source: "held",
      heldEntryId: subId,
      licenseId: lid,
      code: cat?.code != null ? String(cat.code) : "",
      name:
        cat?.name?.es || cat?.name?.en
          ? String(cat.name.es || cat.name.en || "").trim()
          : "",
      number: t.number != null ? String(t.number) : "",
      category: t.category != null ? String(t.category) : "",
      issuedDate: t.issuedDate,
      expirationDate: t.expirationDate,
      status: t.status != null ? String(t.status) : "ACTIVO",
      renewalsCount:
        t.renewalsCount != null && Number.isFinite(Number(t.renewalsCount))
          ? Math.max(0, Math.floor(Number(t.renewalsCount)))
          : 0,
      bucketLabel: "",
    };
  });
  const legacy = splitSeafarerLicenseRows(seafarer?.licenses).licencias.map(
    (r, i) => ({
      rowKey: `legacy-${r.bucket}-${i}-${r.licenseNumber ?? ""}`,
      source: "legacy",
      heldEntryId: "",
      licenseId: "",
      code: r.code != null ? String(r.code) : "",
      name: r.name != null ? String(r.name) : "",
      number: r.licenseNumber != null ? String(r.licenseNumber) : "",
      category: "",
      issuedDate: r.issueDate,
      expirationDate: r.expirationDate,
      status: r.status != null ? String(r.status) : "",
      bucketLabel: r.bucketLabel != null ? String(r.bucketLabel) : "",
      renewalsCount: null,
    }),
  );
  return [...fromHeld, ...legacy];
}
