/** Categorías del brevet deportivo (licencia catálogo `UY_BD`). */
export const SPORT_BREVET_CATEGORY_DEFS = [
  { key: "A", label: "Brevet Categoría A" },
  { key: "B", label: "Brevet Categoría B" },
  { key: "C", label: "Brevet Categoría C" },
  { key: "D", label: "Brevet Categoría D" },
];

const SPORT_BREVET_KEYS = new Set(SPORT_BREVET_CATEGORY_DEFS.map((d) => d.key));

/**
 * Normaliza `heldLicenses.category` a A|B|C|D si aplica.
 * @param {unknown} category
 * @returns {"A"|"B"|"C"|"D"|null}
 */
export function normalizeSportBrevetCategory(category) {
  const raw = String(category ?? "").trim();
  if (!raw) return null;
  if (/^[ABCD]$/i.test(raw)) return raw.toUpperCase();
  const m = raw.match(/categor[ií]a\s*([ABCD])\b/i);
  if (m) return m[1].toUpperCase();
  return null;
}

/**
 * @param {Record<string, number>} countsByKey
 * @returns {{ category: string, label: string, count: number }[]}
 */
export function sportBrevetCountsToRows(countsByKey) {
  return SPORT_BREVET_CATEGORY_DEFS.map((def) => ({
    category: def.key,
    label: def.label,
    count: countsByKey[def.key] || 0,
  }));
}

export { SPORT_BREVET_KEYS };
