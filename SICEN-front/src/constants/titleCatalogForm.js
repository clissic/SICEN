/** Coinciden con `titles.mongoose.js` (backend). */
export const TITLE_CATALOG_DEPARTMENTS = Object.freeze([
  "PUENTE",
  "MÁQUINAS",
  "ELECTROTECNIA",
  "RADIOCOMUNICACIONES",
  "SEGURIDAD",
  "PROTECCIÓN",
  "MÉDICO",
  "TANQUEROS",
  "PASAJEROS",
]);

export const TITLE_CATALOG_LEVELS = Object.freeze([
  "APOYO",
  "OPERACIONAL",
  "GESTIÓN",
  "BÁSICO",
  "AVANZADO",
  "ESPECIAL",
]);

/** Valores del desplegable «Reglamento» (se guardan en `stcwRegulation`). */
export const TITLE_CATALOG_REGULATIONS = Object.freeze([
  "STCW (Dec. N° 311/009)",
  "Reglamento de Patrones de Cabotaje (Dec. N° 386/989)",
]);

export const INITIAL_TITLE_CATALOG_FORM = {
  code: "",
  stcwRegulation: "",
  nameEs: "",
  nameEn: "",
  department: "",
  level: "",
  function: "",
  application: "",
  requiresRenewal: true,
  validityYears: "5",
  active: true,
};

/**
 * @param {object|null|undefined} row
 * @returns {typeof INITIAL_TITLE_CATALOG_FORM}
 */
export function titleCatalogApiRowToForm(row) {
  if (!row || typeof row !== "object") {
    return { ...INITIAL_TITLE_CATALOG_FORM };
  }
  const vy = row.validityYears;
  const validityYears =
    vy != null && vy !== "" ? String(vy) : "5";
  return {
    code: String(row.code ?? "").trim(),
    stcwRegulation: String(row.stcwRegulation ?? "").trim(),
    nameEs: String(row.name?.es ?? "").trim(),
    nameEn: String(row.name?.en ?? "").trim(),
    department: String(row.department ?? "").trim(),
    level: String(row.level ?? "").trim(),
    function: String(row.function ?? "").trim(),
    application: String(row.application ?? "").trim(),
    requiresRenewal: row.requiresRenewal !== false,
    validityYears,
    active: row.active !== false,
  };
}

/**
 * @param {typeof INITIAL_TITLE_CATALOG_FORM} f
 */
export function titleCatalogFormToPayload(f) {
  const vyRaw = String(f.validityYears ?? "").trim();
  const vy = parseInt(vyRaw, 10);
  const validityYears =
    Number.isFinite(vy) && vy >= 0 ? vy : 5;
  return {
    code: String(f.code ?? "").trim(),
    stcwRegulation: String(f.stcwRegulation ?? "").trim(),
    name: {
      es: String(f.nameEs ?? "").trim(),
      en: String(f.nameEn ?? "").trim(),
    },
    department: String(f.department ?? "").trim(),
    level: String(f.level ?? "").trim(),
    function: String(f.function ?? "").trim(),
    application: String(f.application ?? "").trim(),
    requiresRenewal: Boolean(f.requiresRenewal),
    validityYears,
    active: f.active !== false,
  };
}
