/** Valores permitidos para el campo categoría del catálogo `licences`. */
export const LICENCE_CATALOG_CATEGORY_OPTIONS = Object.freeze([
  "DEPORTIVA",
  "COMERCIAL",
  "ESPECIAL",
]);

/** Formulario de alta en el catálogo `licences` (metadatos). */
export const INITIAL_LICENCE_CATALOG_FORM = {
  kind: "license",
  code: "",
  nameEs: "",
  nameEn: "",
  category: "",
  authority: "",
  requiresRenewal: false,
  active: true,
};

export function initialLicenceCatalogForm(entryKind) {
  return {
    ...INITIAL_LICENCE_CATALOG_FORM,
    kind: entryKind === "title" ? "title" : "license",
  };
}

/**
 * Convierte un documento del listado API a estado del formulario de catálogo.
 * @param {object|null|undefined} row
 * @returns {typeof INITIAL_LICENCE_CATALOG_FORM}
 */
export function licenceApiRowToForm(row) {
  if (!row || typeof row !== "object") {
    return { ...INITIAL_LICENCE_CATALOG_FORM };
  }
  const kindRaw = String(row.kind ?? "").toLowerCase();
  const kind = kindRaw === "title" ? "title" : "license";
  return {
    kind,
    code: String(row.code ?? "").trim(),
    nameEs: String(row.name?.es ?? "").trim(),
    nameEn: String(row.name?.en ?? "").trim(),
    category: String(row.category ?? "").trim(),
    authority: String(row.authority ?? "").trim(),
    requiresRenewal: Boolean(row.requiresRenewal),
    active: row.active !== false,
  };
}

/**
 * @param {typeof INITIAL_LICENCE_CATALOG_FORM} f
 */
export function licenceCatalogFormToPayload(f) {
  const kind =
    String(f.kind ?? "").toLowerCase() === "title" ? "title" : "license";
  return {
    kind,
    code: String(f.code ?? "").trim(),
    name: {
      es: String(f.nameEs ?? "").trim(),
      en: String(f.nameEn ?? "").trim(),
    },
    category: String(f.category ?? "").trim(),
    authority: String(f.authority ?? "").trim(),
    requiresRenewal: Boolean(f.requiresRenewal),
    active: f.active !== false,
  };
}
